'use strict';
const { autocompletePlaces, getPlaceDetails, buildDirectionsUrl } = require('../services/maps.service');

// GET /api/v1/serveease/maps/autocomplete?input=...&sessiontoken=...
exports.autocomplete = async (req, res) => {
    try {
        const { input, sessiontoken } = req.query;
        if (!input || !input.trim()) {
            return res.status(400).json({ success: false, message: 'input is required' });
        }
        const predictions = await autocompletePlaces({ input: input.trim(), sessionToken: sessiontoken });
        return res.json({ success: true, data: predictions });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message || String(error) });
    }
};

// GET /api/v1/serveease/maps/place-details?placeId=...&sessiontoken=...
exports.placeDetails = async (req, res) => {
    try {
        const { placeId, sessiontoken } = req.query;
        if (!placeId) {
            return res.status(400).json({ success: false, message: 'placeId is required' });
        }
        const details = await getPlaceDetails({ placeId, sessionToken: sessiontoken });
        return res.json({ success: true, data: details });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message || String(error) });
    }
};

// GET /api/v1/serveease/maps/directions-url?destLat=..&destLng=..&originLat=..&originLng=..
exports.directionsUrl = async (req, res) => {
    try {
        const { destLat, destLng, originLat, originLng } = req.query;
        if (!destLat || !destLng) {
            return res.status(400).json({ success: false, message: 'destLat and destLng are required' });
        }
        const url = buildDirectionsUrl({
            destLat: parseFloat(destLat),
            destLng: parseFloat(destLng),
            originLat: originLat ? parseFloat(originLat) : null,
            originLng: originLng ? parseFloat(originLng) : null,
        });
        return res.json({ success: true, data: { url } });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message || String(error) });
    }
};
