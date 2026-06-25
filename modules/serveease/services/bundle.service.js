const Service = require('../models/Service');

/**
 * Bundle rules use two match strategies:
 *
 * 1. primaryCategories — keywords matched (case-insensitive) against:
 *    - the primary service's category name
 *    - the primary service's own name
 *    - the primary service's slug
 *
 * 2. suggestCategories — keywords matched against the same fields of candidate services.
 *
 * This makes the system DB-content agnostic: it works even if slugs change,
 * as long as category / service names contain the keyword.
 */
const BUNDLE_RULES = [
  {
    primaryCategories: ['cleaning', 'bathroom'],
    suggestCategories: ['kitchen'],
    discount: 20,
    label: 'Kitchen Cleaning',
  },
  {
    primaryCategories: ['kitchen'],
    suggestCategories: ['cleaning', 'bathroom'],
    discount: 20,
    label: 'Bathroom Cleaning',
  },
  {
    primaryCategories: ['ac', 'electrical'],
    suggestCategories: ['fan', 'electrical'],
    discount: 15,
    label: 'Electrical Check',
  },
  {
    primaryCategories: ['sofa', 'upholstery'],
    suggestCategories: ['carpet', 'floor'],
    discount: 15,
    label: 'Floor Cleaning',
  },
  {
    primaryCategories: ['pest'],
    suggestCategories: ['pest'],
    discount: 25,
    label: 'Full Pest Protection',
  },
  {
    primaryCategories: ['salon', 'facial', 'hair'],
    suggestCategories: ['manicure', 'pedicure', 'nail'],
    discount: 10,
    label: 'Nail Care',
  },
];

/**
 * Check whether a service matches a set of keyword strings.
 * A match is found when at least one keyword appears (case-insensitive) in
 * the service's category name, service name, or slug.
 *
 * @param {object} svc  - Mongoose lean service document (categoryId populated)
 * @param {string[]} keywords
 * @returns {boolean}
 */
function serviceMatchesKeywords(svc, keywords) {
  const haystack = [
    svc.categoryId?.name || '',
    svc.name || '',
    svc.slug || '',
  ].join(' ').toLowerCase();

  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

/**
 * Returns bundle suggestions for a given serviceId.
 *
 * Algorithm:
 *   1. Load the primary service (populate category name).
 *   2. Find all BUNDLE_RULES whose primaryCategories match the primary service.
 *   3. For each matching rule, load all active services whose name/category/slug
 *      matches any of the rule's suggestCategories.
 *   4. Deduplicate, exclude the primary service itself, return up to 3.
 *
 * @param {string} serviceId - MongoDB ObjectId of the primary service
 * @returns {Promise<Array<{ service: object, discountPercent: number, bundleLabel: string }>>}
 */
async function getBundleSuggestions(serviceId) {
  const primaryService = await Service.findById(serviceId)
    .populate('categoryId', 'name slug')
    .lean();

  if (!primaryService) return [];

  // Find matching rules for the primary service
  const matchingRules = BUNDLE_RULES.filter((rule) =>
    serviceMatchesKeywords(primaryService, rule.primaryCategories)
  );

  if (matchingRules.length === 0) return [];

  // Load ALL active services once, then filter in JS to avoid many round-trips
  const allActive = await Service.find({ isActive: true, _id: { $ne: primaryService._id } })
    .populate('categoryId', 'name slug')
    .lean();

  const suggestions = [];

  for (const rule of matchingRules) {
    const matched = allActive.filter((svc) =>
      serviceMatchesKeywords(svc, rule.suggestCategories)
    );

    for (const svc of matched) {
      // Avoid duplicates across rules
      const alreadyAdded = suggestions.some(
        (s) => s.service._id.toString() === svc._id.toString()
      );
      if (!alreadyAdded) {
        suggestions.push({
          service: svc,
          discountPercent: rule.discount,
          bundleLabel: rule.label,
        });
      }
      // Cap at 3 total suggestions
      if (suggestions.length >= 3) break;
    }
    if (suggestions.length >= 3) break;
  }

  return suggestions;
}

module.exports = { getBundleSuggestions, BUNDLE_RULES };
