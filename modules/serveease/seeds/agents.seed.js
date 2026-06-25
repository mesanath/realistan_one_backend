const agents = [
  // ── Bangalore ──────────────────────────────────────────
  {
    name: 'Priya Sharma', phone: '+919876543201', email: 'priya.sharma@serveease.dev',
    gender: 'female', city: 'Bangalore', bio: '5+ years experience in beauty services. Certified beautician.',
    rating: 4.8, ratingCount: 124, totalJobs: 312, status: 'online', isApproved: true,
    currentLocation: { lat: 12.9716, lng: 77.5946, updatedAt: new Date() },
    skills: ['salon-women', 'spa-massage'],
  },
  {
    name: 'Kavitha R', phone: '+919876543202', email: 'kavitha@serveease.dev',
    gender: 'female', city: 'Bangalore', bio: 'Expert in hair, skin & nail care.',
    rating: 4.7, ratingCount: 89, totalJobs: 201, status: 'online', isApproved: true,
    currentLocation: { lat: 12.9352, lng: 77.6245, updatedAt: new Date() },
    skills: ['salon-women', 'salon-men'],
  },
  {
    name: 'Ravi Kumar', phone: '+919876543203', email: 'ravi.kumar@serveease.dev',
    gender: 'male', city: 'Bangalore', bio: 'Home cleaning specialist. Handled 300+ jobs.',
    rating: 4.6, ratingCount: 78, totalJobs: 298, status: 'online', isApproved: true,
    currentLocation: { lat: 12.9141, lng: 77.6101, updatedAt: new Date() },
    skills: ['home-cleaning', 'kitchen-bathroom'],
  },
  {
    name: 'Suresh P', phone: '+919876543204', email: 'suresh.p@serveease.dev',
    gender: 'male', city: 'Bangalore', bio: 'Certified AC technician. 7 years field experience.',
    rating: 4.9, ratingCount: 203, totalJobs: 456, status: 'online', isApproved: true,
    currentLocation: { lat: 12.9562, lng: 77.7010, updatedAt: new Date() },
    skills: ['ac-service', 'appliance-repair', 'electrical'],
  },
  {
    name: 'Meena Devi', phone: '+919876543205', email: 'meena.devi@serveease.dev',
    gender: 'female', city: 'Bangalore', bio: 'Trained massage therapist.',
    rating: 4.7, ratingCount: 56, totalJobs: 134, status: 'offline', isApproved: true,
    currentLocation: { lat: 12.9279, lng: 77.6271, updatedAt: new Date() },
    skills: ['spa-massage'],
  },

  // ── Mumbai ─────────────────────────────────────────────
  {
    name: 'Sneha Patil', phone: '+919876543206', email: 'sneha.patil@serveease.dev',
    gender: 'female', city: 'Mumbai', bio: 'Bridal makeup & beauty expert, 6 years experience.',
    rating: 4.9, ratingCount: 178, totalJobs: 390, status: 'online', isApproved: true,
    currentLocation: { lat: 19.0760, lng: 72.8777, updatedAt: new Date() },
    skills: ['salon-women'],
  },
  {
    name: 'Rahul Singh', phone: '+919876543207', email: 'rahul.singh@serveease.dev',
    gender: 'male', city: 'Mumbai', bio: 'AC & appliance repair expert.',
    rating: 4.5, ratingCount: 92, totalJobs: 215, status: 'online', isApproved: true,
    currentLocation: { lat: 19.0543, lng: 72.9101, updatedAt: new Date() },
    skills: ['ac-service', 'appliance-repair', 'plumbing'],
  },
  {
    name: 'Anita Joshi', phone: '+919876543208', email: 'anita.joshi@serveease.dev',
    gender: 'female', city: 'Mumbai', bio: 'Cleaning & household help specialist.',
    rating: 4.6, ratingCount: 67, totalJobs: 176, status: 'online', isApproved: true,
    currentLocation: { lat: 19.0321, lng: 72.8560, updatedAt: new Date() },
    skills: ['home-cleaning', 'laundry-daily'],
  },

  // ── Delhi ──────────────────────────────────────────────
  {
    name: 'Pooja Gupta', phone: '+919876543209', email: 'pooja.gupta@serveease.dev',
    gender: 'female', city: 'Delhi', bio: 'Beauty & wellness professional.',
    rating: 4.8, ratingCount: 145, totalJobs: 320, status: 'online', isApproved: true,
    currentLocation: { lat: 28.6139, lng: 77.2090, updatedAt: new Date() },
    skills: ['salon-women', 'spa-massage'],
  },
  {
    name: 'Amit Verma', phone: '+919876543210', email: 'amit.verma@serveease.dev',
    gender: 'male', city: 'Delhi', bio: 'Electrician & plumber. 10 years experience.',
    rating: 4.7, ratingCount: 112, totalJobs: 289, status: 'online', isApproved: true,
    currentLocation: { lat: 28.6272, lng: 77.2160, updatedAt: new Date() },
    skills: ['electrical', 'plumbing', 'carpentry'],
  },

  // ── Pending approval (to demo admin flow) ─────────────
  {
    name: 'Kiran Rao', phone: '+919876543211', email: 'kiran.rao@serveease.dev',
    gender: 'male', city: 'Hyderabad', bio: 'New to platform, pest control specialist.',
    rating: 0, ratingCount: 0, totalJobs: 0, status: 'offline', isApproved: false,
    currentLocation: { lat: 17.3850, lng: 78.4867, updatedAt: new Date() },
    skills: ['pest-control'],
  },
];

module.exports = agents;
