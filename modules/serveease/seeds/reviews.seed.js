function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(123);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const COMMENTS_BY_RATING = {
  5: [
    'Excellent service, very professional and on time!',
    'Absolutely loved it, will book again for sure.',
    'The best experience I have had with a home service app.',
    'Very thorough work, exceeded my expectations.',
    'Polite, skilled and finished the job perfectly.',
    'Highly recommend, worth every rupee.',
  ],
  4: [
    'Good service overall, small delay in arrival.',
    'Job well done, a couple of minor things could improve.',
    'Satisfied with the work, will use again.',
    'Professional and courteous, decent quality.',
  ],
  3: [
    'Average experience, work was okay but rushed.',
    'Got the job done, nothing exceptional.',
    'Decent but arrived a bit late.',
  ],
  2: [
    'Not fully satisfied, had to point out missed spots.',
    'Service was below expectations this time.',
  ],
  1: [
    'Very disappointed, will not book this again.',
    'Poor quality work, had to get it redone.',
  ],
};

const TAG_POOL = ['punctual', 'professional', 'clean_work', 'friendly', 'expert'];

/**
 * Generates reviews for a subset of completed bookings.
 * @param {{bookings: Array, reviewPhotoPool: Array, coverage: number}} params coverage = fraction of completed bookings that get a review
 */
function generateReviews({ bookings, reviewPhotoPool, coverage = 0.7 }) {
  const completed = bookings.filter((b) => b.status === 'completed');
  const reviews = [];

  for (const booking of completed) {
    if (rand() > coverage) continue;

    const r = rand();
    let rating;
    if (r < 0.55) rating = 5;
    else if (r < 0.8) rating = 4;
    else if (r < 0.92) rating = 3;
    else if (r < 0.97) rating = 2;
    else rating = 1;

    const hasPhoto = rand() < 0.25 && reviewPhotoPool.length > 0;
    const tagCount = 1 + Math.floor(rand() * 3);
    const tags = [...new Set(Array.from({ length: tagCount }, () => pick(TAG_POOL)))];

    reviews.push({
      bookingId: booking._id,
      customerId: booking.customerId,
      agentId: booking.agentId,
      serviceId: booking.serviceId,
      rating,
      comment: pick(COMMENTS_BY_RATING[rating]),
      photos: hasPhoto ? [pick(reviewPhotoPool)] : [],
      tip: rand() < 0.15 ? pick([20, 30, 50, 100]) : 0,
      tags: rating >= 4 ? tags : [],
      isPublic: true,
      createdAt: new Date(booking.serviceEndedAt ? booking.serviceEndedAt.getTime() + 3600000 : Date.now()),
    });
  }

  return reviews;
}

module.exports = generateReviews;
