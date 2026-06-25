/**
 * Surge pricing service — EN9
 *
 * Multipliers are applied FIRST, before coupons / loyalty / subscription discounts.
 * All times are interpreted in the local wall-clock hour of the incoming Date.
 */

/**
 * @param {string|Date} scheduledAt — booking slot datetime
 * @param {string}      [city]      — reserved for future city-specific overrides
 * @returns {{ multiplier: number, label: string|null, reason: string|null }}
 */
function getSurgeMultiplier(scheduledAt, city) { // eslint-disable-line no-unused-vars
  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) {
    return { multiplier: 1.0, label: null, reason: null };
  }

  const hour = date.getHours();          // local wall-clock hour (0–23)
  const day  = date.getDay();            // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;

  // Peak windows ─────────────────────────────────────────────
  // Weekday morning peak  : 9 AM – 11 AM  (09:00–11:59)
  const isWeekdayMorningPeak = !isWeekend && hour >= 9  && hour <= 11;
  // Weekday evening peak  : 5 PM –  8 PM  (17:00–20:59)
  const isWeekdayEveningPeak = !isWeekend && hour >= 17 && hour <= 20;
  // Weekend peak          : 10 AM –  6 PM (10:00–18:59)
  const isWeekendPeak        = isWeekend  && hour >= 10 && hour <= 18;

  if (isWeekendPeak) {
    return { multiplier: 1.3, label: 'Weekend surge', reason: 'High demand on weekends' };
  }
  if (isWeekdayMorningPeak) {
    return { multiplier: 1.15, label: 'Morning peak', reason: 'High demand 9–11 AM' };
  }
  if (isWeekdayEveningPeak) {
    return { multiplier: 1.2, label: 'Evening peak', reason: 'High demand 5–8 PM' };
  }

  return { multiplier: 1.0, label: null, reason: null };
}

/**
 * Round a surged price up to the nearest ₹10.
 * e.g. 1499 * 1.15 = 1723.85 → 1730
 *
 * @param {number} originalPrice
 * @param {number} multiplier
 * @returns {number}
 */
function applySurge(originalPrice, multiplier) {
  if (multiplier <= 1.0) return originalPrice;
  const raw = originalPrice * multiplier;
  return Math.ceil(raw / 10) * 10;
}

module.exports = { getSurgeMultiplier, applySurge };
