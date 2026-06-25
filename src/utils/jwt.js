const jwt = require('jsonwebtoken');

exports.createToken = async ({ _id, mobile, screenName }) => {
    try {
        const token = jwt.sign(
            { _id, screenName, mobile, playerStatus: '' },
            `${process.env.JWT_ACCESS_TOKEN_SECRET}`,
            { expiresIn: process.env.JWT_ACCESS_TOKEN_SECRET_EXPIRY }
        );
        return token;
    } catch (err) {
        console.log(err);
        throw err;
    }
};

exports.verifyToken = async ({ authorization }) => {
    try {
        const decoded = jwt.verify(authorization, `${process.env.JWT_ACCESS_TOKEN_SECRET}`);
        return decoded;
    } catch (err) {
        console.log('verifyToken:error:', err);
        throw err;
    }
};
