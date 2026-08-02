const FIRST_NAMES_MALE = [
  'Rohan', 'Aditya', 'Vikram', 'Karthik', 'Siddharth', 'Arjun', 'Rahul', 'Nikhil', 'Varun', 'Aakash',
  'Manish', 'Sandeep', 'Vivek', 'Gaurav', 'Ashwin', 'Deepak', 'Kunal', 'Rajesh', 'Suresh', 'Anand',
];
const FIRST_NAMES_FEMALE = [
  'Priya', 'Ananya', 'Divya', 'Sneha', 'Pooja', 'Kavya', 'Meera', 'Riya', 'Isha', 'Neha',
  'Shreya', 'Anjali', 'Nandini', 'Swati', 'Ritu', 'Deepika', 'Aarti', 'Simran', 'Tanvi', 'Bhavna',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Rao', 'Patel', 'Shah',
  'Kapoor', 'Malhotra', 'Chatterjee', 'Bose', 'Das', 'Pillai', 'Krishnan', 'Joshi', 'Desai', 'Bhatt',
];

const CITY_PINCODES = {
  Bangalore: '5600', Mumbai: '4000', Delhi: '1100', Hyderabad: '5000',
  Chennai: '6000', Pune: '4110', Kolkata: '7000',
};
const CITIES = Object.keys(CITY_PINCODES);
const AREAS = ['Indiranagar', 'Koramangala', 'Andheri West', 'Bandra', 'Saket', 'Vasant Kunj', 'Banjara Hills', 'Gachibowli', 'T Nagar', 'Anna Nagar', 'Kothrud', 'Viman Nagar', 'Salt Lake', 'Ballygunge'];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(7);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const COUNT = 60;
const used = new Set();

const customers = [];
for (let i = 0; i < COUNT; i++) {
  let first;
  let last;
  const gender = rand() < 0.5 ? 'male' : 'female';
  do {
    first = pick(gender === 'male' ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
    last = pick(LAST_NAMES);
  } while (used.has(`${first} ${last}`));
  used.add(`${first} ${last}`);

  const city = pick(CITIES);
  const area = pick(AREAS);
  const pincode = `${CITY_PINCODES[city]}${String(10 + Math.floor(rand() * 89))}`;

  customers.push({
    name: `${first} ${last}`,
    phone: `+9197${String(10000000 + i).slice(0, 8)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
    age: 22 + Math.floor(rand() * 35),
    isActive: true,
    isVerified: true,
    loyaltyPoints: Math.floor(rand() * 500),
    addresses: [{
      label: pick(['Home', 'Work']),
      addressLine: `${100 + Math.floor(rand() * 800)}, ${area}`,
      landmark: `Near ${pick(['City Mall', 'Metro Station', 'Central Park', 'Public School', 'Hospital'])}`,
      city,
      pincode,
      isDefault: true,
    }],
  });
}

module.exports = customers;
