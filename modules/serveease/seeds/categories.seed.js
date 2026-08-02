const { categories: categoryImages } = require('./image-assets.json');

const img = (slug) => (categoryImages[slug] && categoryImages[slug][0]) || null;

const categories = [
  { name: 'Salon for Women', slug: 'salon-women', description: 'Professional beauty services at home', icon: '💇‍♀️', color: '#EC4899', sortOrder: 1, isActive: true, image: img('salon-women') },
  { name: 'Salon for Men', slug: 'salon-men', description: 'Grooming & haircut at home', icon: '💈', color: '#6366F1', sortOrder: 2, isActive: true, image: img('salon-men') },
  { name: 'Spa & Massage', slug: 'spa-massage', description: 'Relaxation & therapy at home', icon: '💆', color: '#14B8A6', sortOrder: 3, isActive: true, image: img('spa-massage') },
  { name: 'Home Cleaning', slug: 'home-cleaning', description: 'Deep & daily cleaning services', icon: '🧹', color: '#3B82F6', sortOrder: 4, isActive: true, image: img('home-cleaning') },
  { name: 'Kitchen & Bathroom', slug: 'kitchen-bathroom', description: 'Specialized deep cleaning', icon: '🚿', color: '#0EA5E9', sortOrder: 5, isActive: true, image: img('kitchen-bathroom') },
  { name: 'AC Service & Repair', slug: 'ac-service', description: 'AC servicing, cleaning & repair', icon: '❄️', color: '#06B6D4', sortOrder: 6, isActive: true, image: img('ac-service') },
  { name: 'Appliance Repair', slug: 'appliance-repair', description: 'All home appliance repair', icon: '🔧', color: '#F59E0B', sortOrder: 7, isActive: true, image: img('appliance-repair') },
  { name: 'Plumbing', slug: 'plumbing', description: 'Plumbing fixes & installations', icon: '🪠', color: '#6366F1', sortOrder: 8, isActive: true, image: img('plumbing') },
  { name: 'Electrical', slug: 'electrical', description: 'Wiring, fittings & repairs', icon: '⚡', color: '#EAB308', sortOrder: 9, isActive: true, image: img('electrical') },
  { name: 'Carpentry & Furniture', slug: 'carpentry', description: 'Furniture repair & assembly', icon: '🪑', color: '#A16207', sortOrder: 10, isActive: true, image: img('carpentry') },
  { name: 'Pest Control', slug: 'pest-control', description: 'Effective pest management', icon: '🐛', color: '#16A34A', sortOrder: 11, isActive: true, image: img('pest-control') },
  { name: 'Painting', slug: 'painting', description: 'Home & office painting', icon: '🎨', color: '#9333EA', sortOrder: 12, isActive: true, image: img('painting') },
  { name: 'Laundry & Daily Help', slug: 'laundry-daily', description: 'Daily household assistance', icon: '👕', color: '#0D9488', sortOrder: 13, isActive: true, image: img('laundry-daily') },
  { name: 'Car Care', slug: 'car-care', description: 'Car wash & detailing at home', icon: '🚗', color: '#DC2626', sortOrder: 14, isActive: true, image: img('car-care') },
];

module.exports = categories;
