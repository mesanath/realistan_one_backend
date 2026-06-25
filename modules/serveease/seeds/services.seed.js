/**
 * Services seed — keyed by category slug for easy insertion
 * Add new services by adding entries under the right category key.
 */
const servicesByCategorySlug = {
  'salon-women': [
    {
      name: 'Full Arms + Legs Waxing (Rica)',
      slug: 'rica-waxing-arms-legs',
      shortDescription: 'Premium Rica roll-on wax for smooth, long-lasting results',
      basePrice: 649,
      durationMinutes: 60,
      whatIsIncluded: ['Full arms waxing', 'Full legs waxing', 'Post-wax lotion'],
      whatIsNotIncluded: ['Underarms', 'Bikini wax'],
      isFeatured: true,
      isPopular: true,
      tags: ['waxing', 'rica', 'salon'],
      packages: [
        { name: 'Basic', description: 'Honey wax', price: 399, durationMinutes: 45, includes: ['Arms', 'Legs'] },
        { name: 'Standard', description: 'Rica roll-on wax', price: 649, durationMinutes: 60, includes: ['Full arms', 'Full legs', 'Post-wax lotion'], isPopular: true },
        { name: 'Premium', description: 'Chocolate & Rica combo', price: 849, durationMinutes: 75, includes: ['Full arms', 'Full legs', 'Underarms', 'Post-wax oil treatment'] },
      ],
      cityPricing: [
        { city: 'Mumbai', price: 699 }, { city: 'Delhi', price: 649 }, { city: 'Bangalore', price: 649 }, { city: 'Hyderabad', price: 599 },
      ],
    },
    {
      name: 'Gold Facial',
      slug: 'gold-facial',
      shortDescription: 'Anti-aging gold facial for radiant, youthful skin',
      basePrice: 799,
      durationMinutes: 60,
      whatIsIncluded: ['Cleansing', 'Scrubbing', 'Gold mask', 'Massage', 'Moisturiser'],
      whatIsNotIncluded: ['Hair removal', 'Threading'],
      isFeatured: true,
      tags: ['facial', 'gold', 'anti-aging'],
      packages: [
        { name: 'Basic', description: 'Fruit facial', price: 549, durationMinutes: 45, includes: ['Cleansing', 'Fruit mask', 'Moisturiser'] },
        { name: 'Standard', description: 'Gold facial', price: 799, durationMinutes: 60, includes: ['Cleansing', 'Scrub', 'Gold mask', 'Massage', 'Moisturiser'], isPopular: true },
        { name: 'Premium', description: 'HydraGlo Hydra Facial', price: 2499, durationMinutes: 90, includes: ['Cleansing', 'Exfoliation', 'Hydra infusion', 'LED therapy', 'SPF moisturiser'] },
      ],
    },
    {
      name: 'Luxury Pedicure',
      slug: 'luxury-pedicure',
      shortDescription: 'O3+ spa pedicure with scrub, mask & massage',
      basePrice: 699,
      durationMinutes: 60,
      whatIsIncluded: ['Soaking', 'Scrubbing', 'O3+ mask', 'Foot massage', 'Nail trim & paint'],
      isFeatured: false, isPopular: true,
      tags: ['pedicure', 'spa', 'nails'],
      packages: [
        { name: 'Classic', description: 'Classic pedicure', price: 399, durationMinutes: 40, includes: ['Soak', 'File', 'Cut', 'Polish'] },
        { name: 'Luxury', description: 'O3+ spa pedicure', price: 699, durationMinutes: 60, includes: ['Soak', 'Scrub', 'O3+ mask', 'Massage', 'Polish'], isPopular: true },
      ],
    },
    {
      name: 'Bridal Makeup',
      slug: 'bridal-makeup',
      shortDescription: 'HD bridal makeup by expert artists',
      basePrice: 3499,
      durationMinutes: 120,
      whatIsIncluded: ['HD foundation', 'Eye makeup', 'Contouring', 'Setting spray', 'False lashes'],
      isFeatured: true,
      tags: ['makeup', 'bridal', 'event'],
    },
  ],

  'salon-men': [
    {
      name: 'Haircut + Beard Styling',
      slug: 'haircut-beard',
      shortDescription: 'Professional cut & beard trim at home',
      basePrice: 449,
      durationMinutes: 45,
      whatIsIncluded: ['Haircut', 'Beard trim', 'Styling', 'Head wash'],
      isFeatured: true, isPopular: true,
      tags: ['haircut', 'beard', 'grooming'],
      packages: [
        { name: 'Haircut Only', price: 299, durationMinutes: 30, includes: ['Haircut', 'Styling'] },
        { name: 'Haircut + Beard', price: 449, durationMinutes: 45, includes: ['Haircut', 'Beard trim', 'Styling'], isPopular: true },
        { name: 'Full Grooming', price: 699, durationMinutes: 60, includes: ['Haircut', 'Beard', 'D-Tan cleanup', 'Head massage'] },
      ],
    },
    {
      name: 'D-Tan Facial (Men)',
      slug: 'men-dtan-facial',
      shortDescription: 'Remove tan & refresh skin with expert facial',
      basePrice: 549,
      durationMinutes: 45,
      whatIsIncluded: ['Cleansing', 'D-Tan pack', 'Massage', 'Moisturiser'],
      tags: ['facial', 'd-tan', 'men'],
    },
  ],

  'spa-massage': [
    {
      name: 'Swedish Massage',
      slug: 'swedish-massage',
      shortDescription: 'Full-body relaxation with gentle long strokes',
      basePrice: 849,
      durationMinutes: 60,
      whatIsIncluded: ['Full body massage (60 min)', 'Aromatherapy oil', 'Hot towel finish'],
      isFeatured: true, isPopular: true,
      tags: ['massage', 'swedish', 'relaxation'],
      packages: [
        { name: '60 min', price: 849, durationMinutes: 60, includes: ['Full body', 'Aroma oil'] },
        { name: '90 min', price: 1199, durationMinutes: 90, includes: ['Full body + head massage', 'Aroma oil', 'Hot towel'], isPopular: true },
      ],
    },
    {
      name: 'Deep Tissue Massage',
      slug: 'deep-tissue-massage',
      shortDescription: 'Targeted muscle therapy for pain relief',
      basePrice: 999,
      durationMinutes: 60,
      isFeatured: false, isPopular: true,
      tags: ['massage', 'deep-tissue', 'therapy'],
    },
    {
      name: 'Couple Spa',
      slug: 'couple-spa',
      shortDescription: '2 therapists, simultaneous session for couples',
      basePrice: 1799,
      durationMinutes: 60,
      isFeatured: true,
      tags: ['spa', 'couple', 'romantic'],
    },
  ],

  'home-cleaning': [
    {
      name: 'Deep Home Cleaning',
      slug: 'deep-home-cleaning',
      shortDescription: 'Complete home deep clean by trained professionals',
      basePrice: 1499,
      durationMinutes: 180,
      whatIsIncluded: ['All rooms sweep & mop', 'Kitchen surface clean', 'Bathroom scrub', 'Fans & switchboards', 'Window sills'],
      whatIsNotIncluded: ['Sofa/carpet cleaning', 'Utensil washing'],
      isFeatured: true, isPopular: true,
      tags: ['cleaning', 'deep-clean', 'home'],
      packages: [
        { name: '1 BHK', price: 1499, durationMinutes: 120, includes: ['1 bedroom', '1 bathroom', 'Kitchen', 'Hall'] },
        { name: '2 BHK', price: 2199, durationMinutes: 180, includes: ['2 bedrooms', '2 bathrooms', 'Kitchen', 'Hall'], isPopular: true },
        { name: '3 BHK', price: 2999, durationMinutes: 240, includes: ['3 bedrooms', '2-3 bathrooms', 'Kitchen', 'Hall', 'Balconies'] },
      ],
      cityPricing: [
        { city: 'Mumbai', price: 1699 }, { city: 'Delhi', price: 1599 }, { city: 'Bangalore', price: 1499 },
      ],
    },
    {
      name: 'Sofa Deep Clean',
      slug: 'sofa-cleaning',
      shortDescription: 'Foam extraction sofa cleaning',
      basePrice: 499,
      durationMinutes: 60,
      isFeatured: false, isPopular: true,
      tags: ['cleaning', 'sofa', 'furniture'],
      packages: [
        { name: '2-seater', price: 499, durationMinutes: 45, includes: ['Foam extraction', 'Deodorisation'] },
        { name: '3-seater', price: 699, durationMinutes: 60, includes: ['Foam extraction', 'Stain removal', 'Deodorisation'], isPopular: true },
        { name: 'L-shape', price: 999, durationMinutes: 90, includes: ['Full foam extraction', 'Deep stain removal', 'Anti-bacterial spray'] },
      ],
    },
    {
      name: 'General Cleaning (Hourly)',
      slug: 'general-cleaning-hourly',
      shortDescription: 'Mopping, dusting & basic cleaning by the hour',
      basePrice: 299,
      durationMinutes: 60,
      isFeatured: false, isPopular: true,
      tags: ['cleaning', 'hourly', 'daily'],
      packages: [
        { name: '1 Hour', price: 299, durationMinutes: 60, includes: ['Mopping', 'Dusting'] },
        { name: '2 Hours', price: 549, durationMinutes: 120, includes: ['Mopping', 'Dusting', 'Kitchen surface', 'Bathroom quick clean'], isPopular: true },
        { name: '4 Hours', price: 999, durationMinutes: 240, includes: ['Full deep clean', 'Kitchen', 'Bathrooms', 'Dishes', 'Laundry fold'] },
      ],
    },
  ],

  'ac-service': [
    {
      name: 'Power Saver AC Service',
      slug: 'ac-power-saver',
      shortDescription: 'Energy-efficient AC service in 45 minutes',
      basePrice: 549,
      durationMinutes: 45,
      whatIsIncluded: ['Filter clean', 'Coil wash', 'Drain check', 'Performance test'],
      isFeatured: true, isPopular: true,
      tags: ['ac', 'service', 'repair'],
      packages: [
        { name: 'Power Saver', price: 549, durationMinutes: 45, includes: ['Filter clean', 'Coil wash', 'Drain check'] },
        { name: 'Jet Deep Clean', price: 699, durationMinutes: 60, includes: ['Filter clean', 'Deep coil wash', 'Anti-bacterial spray', 'Gas check'], isPopular: true },
        { name: 'Anti-Rust Deep Clean', price: 849, durationMinutes: 75, includes: ['Deep coil wash', 'Anti-rust treatment', 'Gas top-up', 'Full report'] },
      ],
    },
  ],

  'appliance-repair': [
    {
      name: 'Refrigerator Repair',
      slug: 'refrigerator-repair',
      shortDescription: 'All brands refrigerator repair at home',
      basePrice: 399,
      durationMinutes: 60,
      isFeatured: false, isPopular: true,
      tags: ['appliance', 'refrigerator', 'repair'],
    },
    {
      name: 'Washing Machine Repair',
      slug: 'washing-machine-repair',
      shortDescription: 'Front & top load washing machine repair',
      basePrice: 399,
      durationMinutes: 60,
      tags: ['appliance', 'washing-machine', 'repair'],
    },
    {
      name: 'Geyser / Water Heater Repair',
      slug: 'geyser-repair',
      shortDescription: 'Geyser repair & installation',
      basePrice: 349,
      durationMinutes: 45,
      tags: ['appliance', 'geyser', 'repair'],
    },
  ],

  'plumbing': [
    {
      name: 'Leaky Tap / Pipe Repair',
      slug: 'tap-pipe-repair',
      shortDescription: 'Fix leaky taps & pipes instantly',
      basePrice: 249,
      durationMinutes: 30,
      isFeatured: false, isPopular: true,
      tags: ['plumbing', 'tap', 'repair'],
    },
    {
      name: 'Toilet Flush Repair',
      slug: 'toilet-flush-repair',
      shortDescription: 'Flush tank & cistern repair',
      basePrice: 299,
      durationMinutes: 30,
      tags: ['plumbing', 'toilet', 'repair'],
    },
  ],

  'pest-control': [
    {
      name: 'Full Home Pest Control',
      slug: 'full-home-pest-control',
      shortDescription: 'Cockroach, ant & rodent treatment',
      basePrice: 999,
      durationMinutes: 60,
      whatIsIncluded: ['Gel treatment', 'Spray treatment', '30-day warranty'],
      isFeatured: true, isPopular: true,
      tags: ['pest', 'cockroach', 'treatment'],
      packages: [
        { name: '1 BHK', price: 999, durationMinutes: 60, includes: ['Cockroach gel', 'Ant treatment', '30-day warranty'] },
        { name: '2 BHK', price: 1299, durationMinutes: 75, includes: ['Full home treatment', '60-day warranty'], isPopular: true },
        { name: 'Annual Plan', price: 3999, durationMinutes: 60, includes: ['4 visits/year', 'All pests', 'Priority support'] },
      ],
    },
  ],

  'car-care': [
    {
      name: 'Car Foam Wash',
      slug: 'car-foam-wash',
      shortDescription: 'Premium foam car wash at your doorstep',
      basePrice: 399,
      durationMinutes: 45,
      isFeatured: true, isPopular: true,
      tags: ['car', 'wash', 'cleaning'],
      packages: [
        { name: 'Basic Wash', price: 399, durationMinutes: 30, includes: ['Exterior foam wash', 'Wipe dry'] },
        { name: 'Interior + Exterior', price: 699, durationMinutes: 60, includes: ['Foam wash', 'Interior vacuum', 'Dashboard wipe'], isPopular: true },
        { name: 'Full Detail', price: 1499, durationMinutes: 120, includes: ['Full foam wash', 'Interior deep clean', 'Tyre polish', 'Wax coating'] },
      ],
    },
  ],
};

module.exports = servicesByCategorySlug;
