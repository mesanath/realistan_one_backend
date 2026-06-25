'use strict';
const { db } = require('../../../src/utils/dbs');
const { getIo } = require('../../../src/socket/index');

exports.requestCallback = async (req, res) => {
    try {
        const { propertyID, name, mobile, message } = req.body;
        if (!propertyID) return res.status(400).json({ success: false, message: 'Missing propertyID' });

        const contactRequestsDB = db.get().collection('contactRequests');
        await contactRequestsDB.insertOne({
            propertyID,
            name: name || null,
            mobile: mobile || null,
            message: message || null,
            requestedBy: req.user?._id || null,
            createdAt: +new Date(),
        });

        // Notify the property owner in real-time (non-critical)
        try {
            const property = await db.get().collection('properties').findOne(
                { propertyID },
                { projection: { createdBy: 1 } }
            );
            if (property?.createdBy) {
                const io = getIo();
                if (io) {
                    const maskedMobile = mobile
                        ? mobile.slice(-4).padStart(mobile.length, '*')
                        : '';
                    io.to(`realestate_${property.createdBy}`).emit('realestate:callback_request', {
                        propertyID,
                        name: name || null,
                        mobile: maskedMobile,
                        message: message || null,
                        requestedAt: new Date().toISOString(),
                    });
                }
            }
        } catch (_) { /* socket emit failure is non-critical */ }

        return res.json({ success: true, message: 'Callback request submitted successfully!' });
    } catch (error) {
        console.error('requestCallback error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};
