'use strict';
/**
 * Server-side proxy for Google Places — keeps GOOGLE_MAPS_API_KEY out of every client bundle
 * (web JS, the RN app). The website's own address-autocomplete widget calls Google's Maps
 * JavaScript API directly from the browser (that's how Google's Places widget is designed to
 * work, and it uses a *separate*, browser-restricted key — see NEXT_PUBLIC_GOOGLE_MAPS_KEY);
 * this proxy exists for callers that can't/shouldn't hold an API key at all, chiefly the RN app.
 */
const logger = require('../utils/logger');

const PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

function getApiKey() {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
        const err = new Error('Google Maps is not configured (GOOGLE_MAPS_API_KEY missing)');
        err.status = 503;
        throw err;
    }
    return key;
}

/**
 * @param {{ input: string, sessionToken?: string }} params
 * @returns {Promise<Array<{ placeId: string, description: string, mainText: string, secondaryText: string }>>}
 */
async function autocompletePlaces({ input, sessionToken }) {
    const key = getApiKey();
    const url = new URL(PLACES_AUTOCOMPLETE_URL);
    url.searchParams.set('input', input);
    url.searchParams.set('key', key);
    url.searchParams.set('components', 'country:in');
    if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        logger.error(`[maps] autocomplete failed status=${data.status} msg=${data.error_message || ''}`);
        const err = new Error('Address lookup failed');
        err.status = 502;
        throw err;
    }

    return (data.predictions || []).map((p) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || '',
    }));
}

/**
 * @param {{ placeId: string, sessionToken?: string }} params
 * @returns {Promise<{ addressLine: string, city: string, pincode: string, lat: number, lng: number }>}
 */
async function getPlaceDetails({ placeId, sessionToken }) {
    const key = getApiKey();
    const url = new URL(PLACE_DETAILS_URL);
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', key);
    url.searchParams.set('fields', 'formatted_address,address_component,geometry');
    if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
        logger.error(`[maps] place-details failed status=${data.status} msg=${data.error_message || ''}`);
        const err = new Error('Place lookup failed');
        err.status = 502;
        throw err;
    }

    const result = data.result || {};
    let city = '';
    let pincode = '';
    for (const comp of result.address_components || []) {
        if (comp.types.includes('locality')) city = comp.long_name;
        if (comp.types.includes('postal_code')) pincode = comp.long_name;
    }

    return {
        addressLine: result.formatted_address || '',
        city,
        pincode,
        lat: result.geometry?.location?.lat ?? null,
        lng: result.geometry?.location?.lng ?? null,
    };
}

/**
 * Builds a Google Maps turn-by-turn directions URL (opens in the Google Maps app if installed,
 * else the browser) — no API call needed, this is just Google's documented URL scheme.
 * @param {{ originLat: number, originLng: number, destLat: number, destLng: number }} params
 */
function buildDirectionsUrl({ originLat, originLng, destLat, destLng }) {
    const params = new URLSearchParams({
        api: '1',
        destination: `${destLat},${destLng}`,
    });
    if (originLat != null && originLng != null) {
        params.set('origin', `${originLat},${originLng}`);
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}

module.exports = { autocompletePlaces, getPlaceDetails, buildDirectionsUrl };
