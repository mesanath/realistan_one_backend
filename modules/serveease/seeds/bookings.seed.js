function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(99);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const NOTES = ['', '', '', 'Please call before arriving.', 'Ring the bell twice.', 'Gate code is 1234.', 'Second floor, flat on the left.'];

/**
 * Generates realistic past/upcoming bookings linking real customers, agents & services.
 * @param {{services: Array, agents: Array, customers: Array, count: number}} params
 */
function generateBookings({ services, agents, customers, count }) {
  const bookings = [];
  const now = Date.now();
  const DAY = 86400000;

  for (let i = 0; i < count; i++) {
    const service = pick(services);
    const eligibleAgents = agents.filter((a) => (a.skills || []).some((s) => String(s) === String(service.categoryId)));
    const agent = eligibleAgents.length ? pick(eligibleAgents) : pick(agents);
    const customer = pick(customers);

    // Skew towards the past (completed history) with a smaller slice of upcoming bookings.
    const isUpcoming = rand() < 0.12;
    const daysOffset = isUpcoming
      ? Math.floor(rand() * 14) + 1
      : -(Math.floor(rand() * 120) + 1);
    const scheduledAt = new Date(now + daysOffset * DAY);

    let status;
    if (isUpcoming) {
      status = pick(['pending', 'confirmed', 'assigned']);
    } else {
      const r = rand();
      if (r < 0.78) status = 'completed';
      else if (r < 0.9) status = 'cancelled';
      else status = 'no_agent';
    }

    const packagePrice = service.packages && service.packages.length ? pick(service.packages).price : service.basePrice;
    const surgeMultiplier = rand() < 0.08 ? 1.25 : 1.0;
    const baseAmount = Math.round(packagePrice * surgeMultiplier);
    const discountAmount = rand() < 0.2 ? Math.round(baseAmount * 0.1) : 0;
    const finalAmount = baseAmount - discountAmount;

    const address = customer.addresses[0];

    bookings.push({
      customerId: customer._id,
      agentId: status === 'no_agent' ? null : agent._id,
      serviceId: service._id,
      address: {
        label: address.label,
        addressLine: address.addressLine,
        landmark: address.landmark,
        city: address.city,
        pincode: address.pincode,
      },
      scheduledAt,
      status,
      serviceStartedAt: status === 'completed' ? new Date(scheduledAt.getTime() + 10 * 60000) : null,
      serviceEndedAt: status === 'completed' ? new Date(scheduledAt.getTime() + (10 + service.durationMinutes) * 60000) : null,
      surgeMultiplier,
      surgeLabel: surgeMultiplier > 1 ? 'Weekend surge' : null,
      surgeAmount: surgeMultiplier > 1 ? baseAmount - packagePrice : 0,
      baseAmount,
      discountAmount,
      finalAmount,
      paymentStatus: status === 'completed' ? 'paid' : status === 'cancelled' ? pick(['refunded', 'failed']) : 'pending',
      paymentMethod: pick(['upi', 'card', 'cod', 'wallet']),
      notes: pick(NOTES),
      cancelReason: status === 'cancelled' ? pick(['Change of plans', 'Booked by mistake', 'Found another provider', 'Rescheduling needed']) : null,
      cancelledBy: status === 'cancelled' ? pick(['customer', 'customer', 'agent']) : null,
      createdAt: new Date(scheduledAt.getTime() - DAY),
    });
  }

  return bookings;
}

module.exports = generateBookings;
