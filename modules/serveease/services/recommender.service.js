const Anthropic = require('@anthropic-ai/sdk');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const logger = require('../utils/logger');

// Reads ANTHROPIC_API_KEY from environment — never hardcode credentials here
const client = new Anthropic();

/**
 * getRecommendations — returns 3 AI-recommended services for a customer.
 *
 * @param {string} userId   - MongoDB ObjectId of the customer
 * @param {string} city     - City name for location context and city pricing
 * @param {object} redisClient - Redis helper from src/config/redis (may be null in dev)
 * @returns {Promise<Array>} - Array of up to 3 enriched service objects with a `reason` field
 */
async function getRecommendations(userId, city, redisClient) {
  const cacheKey = `recommendations:${userId}:${city}`;

  // ── 1. Check Redis cache (24h TTL) ────────────────────────────────────────
  if (redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`[recommender] cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn(`[recommender] Redis cache read failed: ${err.message}`);
    }
  }

  // ── 2. Fetch last 10 completed bookings for this user ─────────────────────
  const recentBookings = await Booking.find({ customerId: userId, status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('serviceId', 'name categoryId basePrice');

  // ── 3. Fetch up to 50 active services ─────────────────────────────────────
  const allServices = await Service.find({ isActive: true })
    .select('_id name categoryId basePrice durationMinutes shortDescription tags')
    .limit(50)
    .lean();

  // ── 4. Build prompt context ────────────────────────────────────────────────
  const bookingHistory = recentBookings.length
    ? recentBookings
        .map((b) => `${b.serviceId?.name || 'Unknown'} - ₹${b.serviceId?.basePrice || 0}`)
        .join('\n')
    : 'No booking history';

  const serviceList = allServices
    .map((s) => `ID:${s._id} | ${s.name} | ₹${s.basePrice} | ${s.durationMinutes}min | tags: ${(s.tags || []).join(', ')}`)
    .join('\n');

  const currentMonth = new Date().toLocaleString('en-IN', { month: 'long' });

  // ── 5. Call Claude API with prompt caching on the static system prompt ─────
  let recommendations = [];
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: `You are a home services recommendation engine for ServeEase, an on-demand home services platform in India. Your job is to recommend services to customers based on their booking history, current season, and city.

Always respond with ONLY valid JSON in this exact format:
{
  "recommendations": [
    { "serviceId": "<id>", "reason": "<one sentence why>" },
    { "serviceId": "<id>", "reason": "<one sentence why>" },
    { "serviceId": "<id>", "reason": "<one sentence why>" }
  ]
}

Rules:
- Recommend exactly 3 services
- Never recommend a service the user booked in the last 30 days (unless it is a recurring service like cleaning)
- Consider seasonal relevance (e.g., AC servicing in summer months March-June, pest control in monsoon July-September)
- Keep reasons concise (under 15 words)
- Only recommend services from the provided list`,
          cache_control: { type: 'ephemeral' }, // Cache the static system prompt to save tokens
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Customer city: ${city}
Current month: ${currentMonth}
Recent bookings:\n${bookingHistory}

Available services:\n${serviceList}

Recommend 3 services.`,
        },
      ],
    });

    const rawText = response.content?.[0]?.text || '';
    // Strip markdown code fences if the model wraps the JSON
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonText);
    recommendations = parsed.recommendations || [];
  } catch (err) {
    logger.warn(`[recommender] Claude API call failed or returned invalid JSON: ${err.message}`);
    return []; // Graceful degradation — caller handles empty array
  }

  // ── 6. Enrich recommendations with full service data ──────────────────────
  const enriched = recommendations
    .map((rec) => {
      const svc = allServices.find((s) => s._id.toString() === rec.serviceId);
      return svc ? { ...svc, reason: rec.reason } : null;
    })
    .filter(Boolean);

  // ── 7. Cache for 24 hours ─────────────────────────────────────────────────
  if (redisClient && enriched.length > 0) {
    try {
      await redisClient.set(cacheKey, JSON.stringify(enriched), 86400);
    } catch (err) {
      logger.warn(`[recommender] Redis cache write failed: ${err.message}`);
    }
  }

  return enriched;
}

module.exports = { getRecommendations };
