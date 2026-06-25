'use strict';
const { db, ObjectID } = require('../../../src/utils/dbs');
const { messages } = require('../utils/constants');
const jwt = require('jsonwebtoken');
const rand = require('random-key');
const crypto = require('crypto');
const axios = require('axios');
const appleSignin = require('apple-signin-auth');
const { OAuth2Client } = require('google-auth-library');

const COOKIE_NAME = 'authToken';

const setAuthCookie = (res, token) => {
    const expiryStr = process.env.JWT_ACCESS_TOKEN_SECRET_EXPIRY || '7d';
    const match = expiryStr.match(/^(\d+)([smhd])$/);
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const maxAge = match ? parseInt(match[1]) * (multipliers[match[2]] || 86400000) : 7 * 86400000;

    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge,
    });
};

// ─── Shared helpers ────────────────────────────────────────────────────────────

const generateOTP = (length) => {
    const randomBytes = crypto.randomBytes(length);
    return Array.from(randomBytes).map(byte => byte % 10).join('').slice(0, length);
};

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
    const userAccounts = db.get().collection('userAccounts');
    for (const name of displayNames) {
        const existing = await userAccounts.find({ screenName: name.toLowerCase() }).toArray();
        if (!existing.length) return name.toLowerCase();
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

const persistToken = async ({ _id, mobile, screenName, socialId }) => {
    const userTokensDB = db.get().collection('userTokens');
    const token = jwt.sign(
        { _id, screenName, mobile: mobile || '', socialId: socialId || '', playerStatus: '' },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.JWT_ACCESS_TOKEN_SECRET_EXPIRY }
    );
    const setObj = { updatedAt: +new Date(), token, screenName };
    if (mobile) setObj.mobile = mobile;
    if (socialId) setObj.socialId = socialId;
    if (_id) {
        await userTokensDB.updateOne({ _id }, { $set: setObj }, { upsert: true });
    } else {
        await userTokensDB.updateOne({ mobile }, { $set: setObj }, { upsert: true });
    }
    return token;
};

const sendSmsThroughKaleyra = async ({ mobile, otp, screenName, message, appType }) => {
    const url = `https://cloud-api.in.kaleyra.io/v1/${process.env.SMS_3RDP_ACCID}/messages?to=${mobile}&body=${message}&type=OTP&callback_profile_id=${screenName}&sender=${process.env.SMS_3RDP_SENDER}&template_id=${process.env.SMS_3RDP_TEMPLATE}`;
    const { data } = await axios({
        method: 'post',
        url,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'api-key': process.env.SMS_3RDP_KEY },
    });
    if (!data) throw new Error('No response from Kaleyra');
    if (data?.error?.body) throw new Error(data.error.body);
    if (data.id) {
        await insertOtpToDb({ mobile, session_id: data.id, source: 'Kaleyra', otp, appType });
        return { otpSent: true, mobile };
    }
    throw new Error(data.message || 'Kaleyra error');
};

const insertOtpToDb = async ({ mobile, session_id, source, otp, appType }) => {
    const otpDB = db.get().collection('otp');
    const setFields = { session_id, source, otp, createdAt: new Date() };
    if (appType) setFields.appType = appType;
    await otpDB.updateOne(
        { mobile },
        { $set: setFields, $inc: { otpCount: 1 } },
        { upsert: true }
    );
};

// ─── Auth controllers ──────────────────────────────────────────────────────────

exports.sendOtp = async (req, res) => {
    try {
        const { mobile, otp, whatsappFlag, appType } = req.body;
        if (!mobile) return res.status(400).json({ success: false, message: messages.Invalid_Mobile });

        // If otp is present in the same request, run verify flow directly
        if (otp) {
            req.body = { mobile, otp, whatsappFlag, appType };
            return exports.verifyOtp(req, res);
        }

        const userAccountsDB = db.get().collection('userAccounts');
        const otpDB = db.get().collection('otp');
        const configsDB = db.get().collection('configs');

        const userAccountsData = await userAccountsDB.findOne({ mobile });
        const mobileOtpDetails = await otpDB.findOne({ mobile });
        const configs = await configsDB.findOne({ _id: 'otp', type: 'settings' });

        if (mobileOtpDetails?.otpCount && mobileOtpDetails.otpCount >= 3) {
            return res.json({ success: false, message: messages.OTP_COUNT });
        }

        const screenName = userAccountsData?.screenName || await generateScreenName(mobile);
        let message = configs?.message || 'Hello user, OTP for logging into realistan.in is replaceOtp. This will expire in 15 mins. Please do not share OTP - Realistan Technology. replaceHash';
        const hash = configs?.hash || 'sC325toDAan';
        const generatedOtp = (process.env.NODE_ENV !== 'production') ? '123456' : generateOTP(6);
        message = message.replace(/replaceHash/g, hash).replace(/replaceOtp/g, generatedOtp);

        if (configs?.sendOtp) {
            await sendSmsThroughKaleyra({ mobile, otp: generatedOtp, screenName, message, appType });
        } else {
            await insertOtpToDb({ mobile, session_id: 'self', source: 'not-sent', otp: generatedOtp, appType });
        }
        await otpDB.deleteOne({ mobile: `${mobile}-verification` });

        return res.json({ success: true, message: 'OTP sent successfully!' });
    } catch (error) {
        console.error('sendOtp error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { mobile, otp, whatsappFlag, appType } = req.body;
        if (!mobile) return res.status(400).json({ success: false, message: messages.Invalid_Mobile });
        if (!otp) return res.status(400).json({ success: false, message: messages.Invalid_OTP });
        if (otp.length < 6) return res.status(400).json({ success: false, message: messages.Invalid_OTP });

        const otpDB = db.get().collection('otp');
        const userAccountsDB = db.get().collection('userAccounts');

        const mobileOtpDetails = await otpDB.findOne({ mobile });
        const mobileOtpVerification = await otpDB.findOne({ mobile: `${mobile}-verification` });

        if (mobileOtpVerification?.verifyCount > 3) {
            return res.status(400).json({ success: false, message: messages.OTP_VERIFICATION_COUNT });
        }
        await otpDB.updateOne({ mobile: `${mobile}-verification` }, { $inc: { verifyCount: 1 } }, { upsert: true });

        if (!mobileOtpDetails?.otp || mobileOtpDetails.otp !== otp) {
            return res.status(400).json({ success: false, message: messages.OTP_MISSMATCH });
        }

        const userAccountsData = await userAccountsDB.findOne({ mobile });
        const screenName = userAccountsData?.screenName || await generateScreenName(mobile);

        const setObj = { updatedAt: +new Date(), loginType: 'mobile', whatsappFlag: whatsappFlag || false };
        if (!userAccountsData?.screenName) setObj.screenName = screenName;
        if (!userAccountsData?.createdAt) setObj.createdAt = +new Date();
        if (userAccountsData?.whatsappFlag === undefined || userAccountsData?.whatsappFlag === false) {
            setObj.whatsappFlag = whatsappFlag || false;
        }
        // Store the app source (set once; don't overwrite if user already has one)
        if (appType && !userAccountsData?.appType) setObj.appType = appType;

        await userAccountsDB.updateOne({ mobile }, { $set: setObj }, { upsert: true });
        const updatedUser = await userAccountsDB.findOne({ mobile });
        await otpDB.deleteOne({ mobile: `${mobile}-verification` });

        const userId = userAccountsData?._id || updatedUser?._id || 'not-generated-yet';
        const token = await persistToken({ _id: userId, mobile, screenName });

        setAuthCookie(res, token);
        return res.json({
            success: true,
            message: 'Login successful!',
            signup: !userAccountsData,
            mobile,
            screenName,
            token,
        });
    } catch (error) {
        console.error('verifyOtp error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const decoded = req.user;
        const userAccountsDB = db.get().collection('userAccounts');
        let userResponse;

        if (decoded?.mobile) {
            userResponse = await userAccountsDB.findOne({ mobile: decoded.mobile });
        } else if (decoded?.socialId) {
            userResponse = await userAccountsDB.findOne({ socialId: decoded.socialId });
        } else {
            userResponse = await userAccountsDB.findOne({ _id: ObjectID(decoded._id) });
        }

        if (!userResponse) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        const profile = { ...userResponse };
        delete profile.updatedAt;
        delete profile.createdAt;
        delete profile.loginType;
        delete profile.device_id;
        delete profile.displayName;
        delete profile.googleId;
        delete profile.googleIdEmail;
        delete profile.socialIdType;
        delete profile.socialId;
        delete profile.migratedUser;
        delete profile.socialName;

        return res.json({ success: true, message: 'Profile fetched successfully!', data: profile });
    } catch (error) {
        console.error('getProfile error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.updateUserDetails = async (req, res) => {
    try {
        const decoded = req.user;
        const { email, mobile: bodyMobile, whatsappFlag, name } = req.body;

        const userAccountsDB = db.get().collection('userAccounts');
        let userResponse;

        if (decoded?.mobile) {
            userResponse = await userAccountsDB.findOne({ mobile: decoded.mobile });
        } else if (decoded?.socialId) {
            userResponse = await userAccountsDB.findOne({ socialId: decoded.socialId });
        } else {
            userResponse = await userAccountsDB.findOne({ _id: ObjectID(decoded._id) });
        }

        if (!userResponse) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        const setObj = { updatedAt: +new Date() };
        if (name && typeof name === 'string' && name.trim()) setObj.screenName = name.trim();
        if (email && userResponse?.email === undefined) setObj.email = email;
        if (bodyMobile && userResponse?.mobile === undefined) setObj.mobile = bodyMobile;
        if (whatsappFlag === true || whatsappFlag === false) setObj.whatsappFlag = whatsappFlag;

        if (decoded?.mobile) {
            await userAccountsDB.updateOne({ mobile: decoded.mobile }, { $set: setObj });
        } else if (decoded?.socialId) {
            await userAccountsDB.updateOne({ socialId: decoded.socialId }, { $set: setObj });
        } else {
            await userAccountsDB.updateOne({ _id: ObjectID(decoded._id) }, { $set: setObj });
        }

        return res.json({ success: true, message: 'Updated successfully!' });
    } catch (error) {
        console.error('updateUserDetails error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

// ─── Social login helpers ──────────────────────────────────────────────────────

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

        const userAccountsDB = db.get().collection('userAccounts');
        let userAccountsData = await userAccountsDB.findOne({ socialId: socialData.socialId });

        const screenName = userAccountsData?.screenName
            || await generateScreenName(socialData.name || socialData.email || socialData.socialId);

        const setObj = {
            updatedAt: +new Date(),
            loginType: 'social',
            socialIdType: socialData.socialIdType,
            whatsappFlag: whatsappFlag || false,
        };
        if (!userAccountsData?.screenName) setObj.screenName = screenName;
        if (!userAccountsData?.createdAt) setObj.createdAt = +new Date();
        if (socialData.email) setObj.email = socialData.email;
        if (socialData.name) setObj.socialName = socialData.name;

        await userAccountsDB.updateOne({ socialId: socialData.socialId }, { $set: setObj }, { upsert: true });

        if (!userAccountsData) userAccountsData = await userAccountsDB.findOne({ socialId: socialData.socialId });

        const token = await persistToken({
            _id: userAccountsData._id,
            mobile: '',
            screenName,
            socialId: socialData.socialId,
        });

        setAuthCookie(res, token);
        return res.json({
            success: true,
            message: 'Login successful!',
            signup: !userAccountsData,
            email: socialData.email,
            screenName,
            token,
        });
    } catch (error) {
        console.error('loginBySocial error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

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
        const userAccountsDB = db.get().collection('userAccounts');
        let userAccountsData = await userAccountsDB.findOne({ mobile });

        const screenName = userAccountsData?.screenName || await generateScreenName(mobile);
        const setObj = { updatedAt: +new Date(), loginType: 'truecaller', whatsappFlag: whatsappFlag || false };
        if (!userAccountsData?.screenName) setObj.screenName = screenName;
        if (!userAccountsData?.createdAt) setObj.createdAt = +new Date();

        await userAccountsDB.updateOne({ mobile }, { $set: setObj }, { upsert: true });
        if (!userAccountsData) userAccountsData = await userAccountsDB.findOne({ mobile });

        const token = await persistToken({ _id: userAccountsData._id, mobile, screenName });

        setAuthCookie(res, token);
        return res.json({
            success: true,
            message: 'Login successful!',
            signup: !userAccountsData,
            mobile,
            screenName,
            token,
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
