const { agents: agentPhotos } = require('./image-assets.json');

const CITIES = [
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
];

// Skills a given gender is more commonly certified for in this domain — kept loose, not exclusive.
const FEMALE_LEANING = ['salon-women', 'spa-massage', 'home-cleaning', 'kitchen-bathroom', 'laundry-daily'];
const MALE_LEANING = ['salon-men', 'ac-service', 'appliance-repair', 'plumbing', 'electrical', 'carpentry', 'pest-control', 'painting', 'car-care'];

const BIO_TEMPLATES = {
  'salon-women': 'Certified beautician specialising in hair, skin & bridal services.',
  'salon-men': 'Professional barber with expertise in modern & classic grooming.',
  'spa-massage': 'Trained massage therapist focused on relaxation & therapeutic care.',
  'home-cleaning': 'Home cleaning specialist known for thorough, reliable work.',
  'kitchen-bathroom': 'Deep-cleaning expert for kitchens, bathrooms & tough stains.',
  'ac-service': 'Certified AC technician with years of field service experience.',
  'appliance-repair': 'Skilled appliance repair technician for all major brands.',
  plumbing: 'Experienced plumber handling repairs, fittings & installations.',
  electrical: 'Licensed electrician for wiring, repairs & installations.',
  carpentry: 'Skilled carpenter for furniture repair, assembly & woodwork.',
  'pest-control': 'Trained pest control operator using safe, effective treatments.',
  painting: 'Professional painter delivering clean, long-lasting finishes.',
  'laundry-daily': 'Dependable daily-help professional for laundry & household chores.',
  'car-care': 'Detailing specialist for car wash, polish & interior care.',
};

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, n);
};

const agents = agentPhotos.map((person, i) => {
  const city = pick(CITIES);
  const leaning = person.gender === 'female' ? FEMALE_LEANING : MALE_LEANING;
  const skillCount = 1 + Math.floor(rand() * 3); // 1-3 skills
  const primary = pick(leaning);
  const extras = pickN(leaning.filter((s) => s !== primary), skillCount - 1);
  const skills = [primary, ...extras];

  const isApproved = i >= 3; // first 3 pending, to demo the admin-approval flow like the original seed
  const status = isApproved ? pick(['online', 'online', 'online', 'offline', 'busy']) : 'offline';
  const ratingCount = isApproved ? 10 + Math.floor(rand() * 300) : 0;
  const rating = isApproved ? Math.round((3.8 + rand() * 1.2) * 10) / 10 : 0;
  const totalJobs = isApproved ? Math.floor(ratingCount * (1.5 + rand())) : 0;

  const latJitter = (rand() - 0.5) * 0.08;
  const lngJitter = (rand() - 0.5) * 0.08;

  return {
    name: `${person.firstName} ${person.lastName}`,
    phone: `+9198${String(10000000 + i).slice(0, 8)}`,
    email: `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}${i}@serveease.dev`,
    profileImage: person.profileImage,
    gender: person.gender,
    city: city.name,
    bio: BIO_TEMPLATES[primary],
    rating,
    ratingCount,
    totalJobs,
    status,
    isApproved,
    currentLocation: { lat: city.lat + latJitter, lng: city.lng + lngJitter, updatedAt: new Date() },
    skills,
  };
});

module.exports = agents;
