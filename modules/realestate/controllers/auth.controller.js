'use strict';
const User = require('../../../src/models/User');
const { db } = require('../../../src/utils/dbs');
const { messages } = require('../utils/constants');
const rand = require('random-key');
const axios = require('axios');
const appleSignin = require('apple-signin-auth');
const { OAuth2Client } = require('google-auth-library');
const { signAuthTokens } = require('../../../src/utils/token');

// OTP send/verify now live in src/auth/unifiedAuth.controller.js — the one login
// system shared with serveease (see /api/v1/auth/send-otp, /verify-otp). What's left
// here is realestate-specific: profile management and the alternate sign-in methods
// (social, Truecaller) that serveease doesn't have.

const COOKIE_NAME = 'authToken';

const setAuthCookie = (res, token) => {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 86400000,
    });
};

// ─── Screen-name generation (used by the social/Truecaller sign-in flows below) ────

const randomDigitGenerator = async (digits) => {
    let word = parseInt(rand.generateDigits(digits));
    if (word < 10) word = word % 10;
    if (word === 0) return randomDigitGenerator(digits);
    return word;
};

const NameMaker = async (seed) => {
    const configsDB = db.get().collection('configs');
    const displayName_array_doc = await configsDB.findOne({ _id: 'pl-display-name', type: 'displayName' });
    if (displayName_array_doc?.words) {
        const words = displayName_array_doc.words;
        const str = String(seed);
        const index = Math.floor(+new Date() + parseInt(str.slice(3, 13) || 0)) % words.length;
        const index2 = Math.floor(+new Date() * parseInt(str.slice(3, 13) || 1)) % words.length;
        const middle = await randomDigitGenerator(2);
        return [
            `${words[index]}${middle}${str.slice(9, 13)}`,
            `${words[index2]}${middle}${str.slice(9, 13)}`,
        ];
    }
    return [];
};

const NameChecker = async (displayNames) => {
    for (const name of displayNames) {
        const existing = await User.findOne({ screenName: name.toLowerCase() });
        if (!existing) return name.toLowerCase();
    }
    return false;
};

const generateScreenName = async (seed) => {
    try {
        const names = await NameMaker(seed);
        return await NameChecker(names);
    } catch (err) {
        console.error('generateScreenName error:', err);
        return null;
    }
};

// ─── Profile ─────────────────────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
    try {
        const account = await User.findById(req.user?._id || req.user?.id);
        if (!account) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        const profile = account.toObject();
        profile.mobile = profile.phone; // legacy field name some clients still read
        delete profile.updatedAt;
        delete profile.loginType;
        delete profile.socialIdType;
        delete profile.socialId;
        delete profile.socialName;
        delete profile.__v;

        return res.json({ success: true, message: 'Profile fetched successfully!', data: profile });
    } catch (error) {
        console.error('getProfile error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.updateUserDetails = async (req, res) => {
    try {
        const { email, mobile: bodyMobile, whatsappFlag, name } = req.body;

        const account = await User.findById(req.user?._id || req.user?.id);
        if (!account) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        if (name && typeof name === 'string' && name.trim()) {
            account.screenName = name.trim();
            account.name = name.trim();
        }
        if (email && !account.email) account.email = email;
        if (bodyMobile && !account.phone) account.phone = bodyMobile;
        if (whatsappFlag === true || whatsappFlag === false) account.whatsappFlag = whatsappFlag;

        await account.save();

        return res.json({ success: true, message: 'Updated successfully!' });
    } catch (error) {
        console.error('updateUserDetails error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const account = await User.findById(req.user?._id || req.user?.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (account.isDeleted) {
            return res.status(400).json({ success: false, message: 'Account already deleted' });
        }

        // Soft-delete + scrub PII. Same account/collection serveease's own delete-account
        // endpoint operates on — there's one identity now, so deleting it from either
        // product deletes it everywhere.
        account.isDeleted = true;
        account.deletedAt = new Date();
        account.isActive = false;
        account.name = 'Deleted User';
        account.screenName = 'Deleted User';
        account.email = undefined;
        account.socialName = undefined;
        account.savedProperties = [];
        account.profileImage = null;
        account.addresses = [];
        account.fcmToken = null;
        account.pushSubscription = null;
        await account.save();

        res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });

        return res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('deleteAccount error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

// ─── Social login ──────────────────────────────────────────────────────────────

const socialLoginByGoogle = async ({ platform, idToken }) => {
    const iosClient = new OAuth2Client(process.env.IOS_CLIENT_ID);
    const androidClient = new OAuth2Client(process.env.ANDROID_CLIENT_ID);
    const webClient = new OAuth2Client(process.env.WEB_CLIENT_ID);

    let clientToken;
    if (platform === 'ios') clientToken = await iosClient.verifyIdToken({ idToken, requiredAudience: process.env.IOS_CLIENT_ID });
    if (platform === 'android') clientToken = await androidClient.verifyIdToken({ idToken, requiredAudience: process.env.ANDROID_CLIENT_ID });
    if (platform === 'web') clientToken = await webClient.verifyIdToken({ idToken, requiredAudience: process.env.WEB_CLIENT_ID });

    if (!clientToken) throw new Error('Failed Google Signup');
    const payload = clientToken.getPayload();
    return {
        socialIdType: 'googleId',
        socialId: payload.sub,
        email: payload.email,
        name: payload.name?.replace(/[^a-zA-Z0-9]/g, ''),
    };
};

const socialLoginByApple = async ({ idToken }) => {
    const res = await appleSignin.verifyIdToken(idToken, { clientID: process.env.IOS_AUD, realUserStatus: true });
    return {
        socialIdType: 'appleId',
        socialId: res.sub,
        email: res.email || '',
        name: res?.name?.replace(/[^a-zA-Z0-9]/g, ''),
    };
};

const socialLoginByFacebook = async ({ idToken }) => {
    const { data } = await axios.get(process.env.FB_GRAPH_API, { params: { fields: 'name,id,email', access_token: idToken } });
    return {
        socialIdType: 'facebookId',
        socialId: data.id,
        email: data.email || '',
        name: data.name?.replace(/[^a-zA-Z0-9]/g, ''),
    };
};

exports.loginBySocial = async (req, res) => {
    try {
        const { idToken, socialType, platform, whatsappFlag } = req.body;

        if (!idToken || !socialType || !platform) {
            return res.status(400).json({ success: false, message: 'Missing idToken, socialType or platform' });
        }

        let socialData;
        if (socialType === 'google') socialData = await socialLoginByGoogle({ platform, idToken });
        if (socialType === 'apple') socialData = await socialLoginByApple({ idToken });
        if (socialType === 'facebook') socialData = await socialLoginByFacebook({ idToken });

        if (!socialData?.socialId) {
            return res.status(400).json({ success: false, message: 'Social login failed' });
        }

        let account = await User.findOne({ socialId: socialData.socialId });
        if (account?.isDeleted) {
            return res.status(403).json({ success: false, message: 'This account has been deleted. Please contact support if this was a mistake.' });
        }

        const isNew = !account;
        if (!account) {
            const screenName = (await generateScreenName(socialData.name || socialData.email || socialData.socialId)) || 'User';
            account = await User.create({
                name: socialData.name || screenName,
                screenName,
                socialId: socialData.socialId,
                socialIdType: socialData.socialIdType,
                socialName: socialData.name || null,
                email: socialData.email || undefined,
                loginType: 'social',
                whatsappFlag: whatsappFlag || false,
            });
        } else {
            account.whatsappFlag = whatsappFlag || false;
            if (socialData.email && !account.email) account.email = socialData.email;
            await account.save();
        }

        const screenName = account.screenName || account.name;
        const tokens = signAuthTokens({ id: account._id.toString(), phone: account.phone, role: 'customer', screenName });

        setAuthCookie(res, tokens.access);
        return res.json({
            success: true,
            message: 'Login successful!',
            signup: isNew,
            email: account.email,
            screenName,
            token: tokens.access,
            tokens,
        });
    } catch (error) {
        console.error('loginBySocial error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

// ─── Truecaller login ──────────────────────────────────────────────────────────

const truecallerGetToken = async ({ code, code_verifier }) => {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.TRUECALLER_CLIENT_ID,
        code,
        code_verifier,
    });
    const { data: truecallerResponse } = await axios.post(
        process.env.URI_TRUECALLER_TOKEN,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' } }
    );
    if (!truecallerResponse?.access_token) throw new Error(messages.Invalid_Mobile);
    const { data: userDetails } = await axios.get(process.env.URI_USER_INFO, {
        headers: { Authorization: `Bearer ${truecallerResponse.access_token}` },
    });
    return userDetails;
};

exports.loginByTruecaller = async (req, res) => {
    try {
        const { code, code_verifier, whatsappFlag } = req.body;
        if (!code || !code_verifier) {
            return res.status(400).json({ success: false, message: 'Missing code or code_verifier' });
        }

        const response = await truecallerGetToken({ code, code_verifier });
        if (!response?.phone_number || !response?.phone_number_verified) {
            return res.status(400).json({ success: false, message: 'Truecaller login failed' });
        }

        const mobile = response.phone_number.at(0) !== '+' ? '+' + response.phone_number : response.phone_number;
        let account = await User.findOne({ phone: mobile });
        if (account?.isDeleted) {
            return res.status(403).json({ success: false, message: 'This account has been deleted. Please contact support if this was a mistake.' });
        }

        const isNew = !account;
        if (!account) {
            const screenName = (await generateScreenName(mobile)) || 'User';
            account = await User.create({ name: screenName, screenName, phone: mobile, loginType: 'truecaller', whatsappFlag: whatsappFlag || false });
        } else {
            account.whatsappFlag = whatsappFlag || false;
            await account.save();
        }

        const screenName = account.screenName || account.name;
        const tokens = signAuthTokens({ id: account._id.toString(), phone: mobile, role: 'customer', screenName });

        setAuthCookie(res, tokens.access);
        return res.json({
            success: true,
            message: 'Login successful!',
            signup: isNew,
            mobile,
            screenName,
            token: tokens.access,
            tokens,
        });
    } catch (error) {
        console.error('loginByTruecaller error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.logout = (req, res) => {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return res.json({ success: true, message: 'Logged out successfully' });
};
