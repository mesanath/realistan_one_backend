'use strict';
/**
 * Master seed script — seeds all three modules in one run.
 *
 *   Realestate   → properties + articles collections (native MongoDB)
 *   ServeEase    → categories + services + agents + coupons (Mongoose)
 *
 * Usage:
 *   npm run seed                 # upsert — safe to re-run
 *   npm run seed:clean           # wipe seed data first, then re-seed
 *   NODE_ENV=local npm run seed  # use MONGO_IP_LOCAL for native driver
 */
require('dotenv').config();

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const CLEAN = process.argv.includes('--clean');
const MONGO_URI = process.env.NODE_ENV === 'local'
    ? (process.env.MONGO_IP_LOCAL || process.env.MONGO_IP)
    : process.env.MONGO_IP;
const DB_NAME   = process.env.MONGO_DB;
const MONGOOSE_URI = process.env.MONGODB_URI;

if (!MONGO_URI || !DB_NAME) {
    console.error('Missing MONGO_IP / MONGO_DB in .env');
    process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now    = () => +new Date();
const daysAgo = (n) => now() - n * 86400000;

const IMG = {
    apt1:   'properties/apartment-bangalore-1.jpg',
    apt2:   'properties/apartment-bangalore-2.jpg',
    villa1: 'properties/villa-bangalore-1.jpg',
    villa2: 'properties/villa-goa-1.jpg',
    office1:'properties/office-mumbai-1.jpg',
    house1: 'house2.jpeg',
    news1:  'news/real-estate-news.jpeg',
    news2:  'news/realestate-information.jpg',
    news3:  'news/cities.jpg',
    news4:  'news/medias.jpg',
    news5:  'news/calculator.jpg',
    news6:  'news/international.webp',
};
const img = (path) => [{ id: 'seed-img-1', path }];

// ─── Realestate seed data ─────────────────────────────────────────────────────

const PROPERTIES = [
    {
        propertyID: 'brigade-insignia-3-bhk-jp-nagar-phase-2-sale-bangalore',
        title: 'Brigade Insignia', listingType: 'sale', buildingType: 'Apartment',
        propertyType: 'Residential', possessionStatus: 'Ready To Move',
        price: '12500000', priceNumber: 12500000,
        area: '1850', areaNumber: 1850, areaCarpet: '1550', areaCarpetNumber: 1550,
        location: 'JP Nagar Phase 2', city: 'Bangalore', postalCode: '560078',
        houseType: '3 BHK', bathsType: '3', floorNumber: '8', floorNumberNumber: 8,
        towerBlock: 'A', totalFloorCount: '18', ageProperty: 'New',
        furnishingStatus: 'Semi-Furnished', facing: 'East', view: 'Garden View',
        balcony: '2', powerBackup: 'Full', flooring: 'Vitrified Tiles',
        coveredParking: 2, coveredUnParking: 1, sutableFor: 'Family',
        additionalRooms: ['Pooja Room', 'Study Room'], trasactionType: 'New Booking',
        landmarkHospital: 'Apollo Spectra 1.2 km', landmarkEducationInstitute: 'Greenwood High 800 m',
        landmarkShoppingCenter: 'Forum Mall 2 km', landmarkTransportation: 'Banashankari Metro 1.5 km',
        landmarkCommercialHub: 'Bannerghatta Road IT Corridor 3 km',
        amenitiesDetails: [{ name: 'Swimming Pool', count: 1 }, { name: 'Gym', count: 1 }, { name: 'Clubhouse', count: 1 }, { name: 'Children Play Area', count: 1 }, { name: 'Indoor Games', count: 1 }, { name: '24/7 Security', count: 1 }],
        furnishingDetails: [{ name: 'AC', count: 3 }, { name: 'Wardrobe', count: 3 }, { name: 'Modular Kitchen', count: 1 }, { name: 'Geyser', count: 2 }],
        aboutProperty: 'Premium 3 BHK apartment in Brigade Insignia with world-class amenities. Located in the heart of JP Nagar with excellent connectivity.',
        defineSizeStructure: '3 BHK with large balcony and servant quarters',
        uploadedPaths: img(IMG.apt1), isExclusive: true, isFeatured: true,
        createAt: daysAgo(30), updatedAt: daysAgo(2),
    },
    {
        propertyID: 'birla-trimaya-2-bhk-devanahalli-sale-bangalore',
        title: 'Birla Trimaya', listingType: 'sale', buildingType: 'Apartment',
        propertyType: 'Residential', possessionStatus: 'Under Construction',
        price: '7800000', priceNumber: 7800000,
        area: '1250', areaNumber: 1250, areaCarpet: '1050', areaCarpetNumber: 1050,
        location: 'Devanahalli', city: 'Bangalore', postalCode: '562110',
        houseType: '2 BHK', bathsType: '2', floorNumber: '5', floorNumberNumber: 5,
        towerBlock: 'B', totalFloorCount: '22', ageProperty: 'New',
        furnishingStatus: 'Unfurnished', facing: 'North East', view: 'City View',
        balcony: '1', powerBackup: 'Full', flooring: 'Ceramic Tiles',
        coveredParking: 1, coveredUnParking: 0, sutableFor: 'Family',
        additionalRooms: ['Pooja Room'], trasactionType: 'New Booking',
        landmarkHospital: 'Aster CMI Hospital 5 km', landmarkEducationInstitute: 'Nitte Meenakshi Institute 3 km',
        landmarkTransportation: 'Kempegowda Airport 8 km', landmarkCommercialHub: 'Aerospace Park 4 km',
        amenitiesDetails: [{ name: 'Swimming Pool', count: 1 }, { name: 'Gym', count: 1 }, { name: 'Jogging Track', count: 1 }, { name: 'Children Play Area', count: 1 }, { name: 'Squash Court', count: 1 }],
        furnishingDetails: [],
        aboutProperty: 'Birla Trimaya offers thoughtfully designed 2 BHK homes near the international airport. RERA registered.',
        uploadedPaths: img(IMG.apt2), isExclusive: true, isFeatured: false,
        createAt: daysAgo(25), updatedAt: daysAgo(1),
    },
    {
        propertyID: 'embassy-verde-4-bhk-sarjapur-sale-bangalore',
        title: 'Embassy Verde', listingType: 'sale', buildingType: 'Villa',
        propertyType: 'Residential', possessionStatus: 'Ready To Move',
        price: '32000000', priceNumber: 32000000,
        area: '4200', areaNumber: 4200, areaCarpet: '3800', areaCarpetNumber: 3800,
        location: 'Sarjapur Road', city: 'Bangalore', postalCode: '562125',
        houseType: '4 BHK', bathsType: '5', floorNumber: 'G', floorNumberNumber: 0,
        towerBlock: 'Villa', totalFloorCount: '3', ageProperty: 'New',
        furnishingStatus: 'Fully Furnished', facing: 'East', view: 'Golf Course View',
        balcony: '4', powerBackup: 'Full', flooring: 'Marble',
        coveredParking: 3, coveredUnParking: 1, sutableFor: 'Family',
        additionalRooms: ['Servant Quarter', 'Pooja Room', 'Study Room', 'Home Theatre'], trasactionType: 'New Booking',
        landmarkHospital: 'Narayana Health 6 km', landmarkEducationInstitute: 'Greenwood High School 2 km',
        landmarkShoppingCenter: 'Total Mall 4 km', landmarkTransportation: 'Carmelaram Railway 3 km',
        landmarkCommercialHub: 'Wipro Campus 2 km',
        amenitiesDetails: [{ name: 'Private Pool', count: 1 }, { name: 'Gym', count: 1 }, { name: 'Clubhouse', count: 1 }, { name: 'Golf Course', count: 1 }, { name: 'Tennis Court', count: 2 }, { name: 'Concierge', count: 1 }],
        furnishingDetails: [{ name: 'AC', count: 6 }, { name: 'Wardrobe', count: 6 }, { name: 'Modular Kitchen', count: 1 }, { name: 'Refrigerator', count: 2 }, { name: 'Washing Machine', count: 1 }, { name: 'Smart Home System', count: 1 }],
        aboutProperty: 'Sprawling Embassy Verde villas with private pool and golf course views. The epitome of luxury living in Bangalore.',
        uploadedPaths: img(IMG.villa1), isExclusive: true, isFeatured: true,
        createAt: daysAgo(15), updatedAt: daysAgo(0),
    },
    {
        propertyID: 'premium-2bhk-koramangala-rent-bangalore',
        title: 'Premium 2BHK in Koramangala', listingType: 'rent', buildingType: 'Apartment',
        propertyType: 'Residential', possessionStatus: 'Ready To Move',
        price: '35000', priceNumber: 35000,
        area: '1200', areaNumber: 1200, areaCarpet: '1000', areaCarpetNumber: 1000,
        location: 'Koramangala 5th Block', city: 'Bangalore', postalCode: '560095',
        houseType: '2 BHK', bathsType: '2', floorNumber: '3', floorNumberNumber: 3,
        towerBlock: '1', totalFloorCount: '6', ageProperty: '2-4',
        furnishingStatus: 'Fully Furnished', facing: 'North', view: 'Street View',
        balcony: '1', powerBackup: 'Partial', flooring: 'Vitrified Tiles',
        coveredParking: 1, coveredUnParking: 0, sutableFor: 'Family',
        additionalRooms: [], trasactionType: 'Rent',
        landmarkHospital: "St. John's Medical 1.5 km", landmarkShoppingCenter: 'Garuda Mall 2 km',
        landmarkTransportation: 'Koramangala Bus Stop 200 m',
        amenitiesDetails: [{ name: 'Gym', count: 1 }, { name: 'Lift', count: 2 }, { name: 'Security', count: 1 }],
        furnishingDetails: [{ name: 'AC', count: 2 }, { name: 'Wardrobe', count: 2 }, { name: 'Refrigerator', count: 1 }, { name: 'Washing Machine', count: 1 }],
        aboutProperty: 'Fully furnished 2BHK in the startup hub of Bangalore. Ideal for working professionals.',
        uploadedPaths: img(IMG.house1), isExclusive: false, isFeatured: false,
        createAt: daysAgo(10), updatedAt: daysAgo(0),
    },
    {
        propertyID: 'lodha-world-one-4bhk-worli-sale-mumbai',
        title: 'Lodha World One', listingType: 'sale', buildingType: 'Apartment',
        propertyType: 'Residential', possessionStatus: 'Ready To Move',
        price: '85000000', priceNumber: 85000000,
        area: '3200', areaNumber: 3200, areaCarpet: '2800', areaCarpetNumber: 2800,
        location: 'Worli', city: 'Mumbai', postalCode: '400018',
        houseType: '4 BHK', bathsType: '4', floorNumber: '55', floorNumberNumber: 55,
        towerBlock: 'Tower 1', totalFloorCount: '117', ageProperty: 'New',
        furnishingStatus: 'Fully Furnished', facing: 'Sea Facing', view: 'Sea View',
        balcony: '3', powerBackup: 'Full', flooring: 'Italian Marble',
        coveredParking: 2, coveredUnParking: 0, sutableFor: 'Family',
        additionalRooms: ['Servant Quarter', 'Home Theatre', 'Pooja Room'], trasactionType: 'New Booking',
        landmarkHospital: 'Hinduja Hospital 3 km', landmarkEducationInstitute: 'Cathedral School 4 km',
        landmarkShoppingCenter: 'Palladium Mall 2 km', landmarkTransportation: 'Worli Sea Link 500 m',
        landmarkCommercialHub: 'BKC Financial District 5 km',
        amenitiesDetails: [{ name: 'Infinity Pool', count: 2 }, { name: 'Gym', count: 1 }, { name: 'Spa', count: 1 }, { name: 'Concierge', count: 1 }, { name: 'Private Cinema', count: 1 }],
        furnishingDetails: [{ name: 'AC', count: 6 }, { name: 'Wardrobe', count: 6 }, { name: 'Modular Kitchen', count: 1 }, { name: 'Smart Home', count: 1 }],
        aboutProperty: 'Sky-high luxury at Lodha World One, the tallest residential tower in India. Breathtaking sea and city views.',
        uploadedPaths: img(IMG.apt2), isExclusive: true, isFeatured: true,
        createAt: daysAgo(45), updatedAt: daysAgo(5),
    },
    {
        propertyID: 'dlf-the-crest-3bhk-dlf-5-sale-gurgaon',
        title: 'DLF The Crest', listingType: 'sale', buildingType: 'Apartment',
        propertyType: 'Residential', possessionStatus: 'Ready To Move',
        price: '38000000', priceNumber: 38000000,
        area: '2850', areaNumber: 2850, areaCarpet: '2400', areaCarpetNumber: 2400,
        location: 'DLF Phase 5', city: 'Gurgaon', postalCode: '122009',
        houseType: '3 BHK', bathsType: '4', floorNumber: '18', floorNumberNumber: 18,
        towerBlock: 'North Tower', totalFloorCount: '29', ageProperty: '0-2',
        furnishingStatus: 'Fully Furnished', facing: 'East', view: 'Golf Course View',
        balcony: '3', powerBackup: 'Full', flooring: 'Wooden',
        coveredParking: 2, coveredUnParking: 0, sutableFor: 'Family',
        additionalRooms: ['Study Room', 'Servant Quarter'], trasactionType: 'Resale',
        landmarkHospital: 'Medanta Hospital 3 km', landmarkEducationInstitute: 'The Shriram School 2 km',
        landmarkShoppingCenter: 'MGF Metropolitan Mall 4 km', landmarkTransportation: 'IFFCO Chowk Metro 3 km',
        landmarkCommercialHub: 'DLF Cyber Hub 2 km',
        amenitiesDetails: [{ name: 'Swimming Pool', count: 2 }, { name: 'Gym', count: 1 }, { name: 'Clubhouse', count: 1 }, { name: 'Golf Course', count: 1 }, { name: 'Squash Court', count: 1 }],
        furnishingDetails: [{ name: 'AC', count: 5 }, { name: 'Wardrobe', count: 5 }, { name: 'Smart Home', count: 1 }],
        aboutProperty: 'DLF The Crest — ultra-luxury residences facing the DLF Golf & Country Club. Set on 17 acres of prime land.',
        uploadedPaths: img(IMG.apt2), isExclusive: true, isFeatured: true,
        createAt: daysAgo(60), updatedAt: daysAgo(7),
    },
    {
        propertyID: 'my-home-aura-3bhk-gachibowli-sale-hyderabad',
        title: 'My Home Aura', listingType: 'sale', buildingType: 'Apartment',
        propertyType: 'Residential', possessionStatus: 'Ready To Move',
        price: '11500000', priceNumber: 11500000,
        area: '1950', areaNumber: 1950, areaCarpet: '1650', areaCarpetNumber: 1650,
        location: 'Gachibowli', city: 'Hyderabad', postalCode: '500032',
        houseType: '3 BHK', bathsType: '3', floorNumber: '9', floorNumberNumber: 9,
        towerBlock: 'B', totalFloorCount: '24', ageProperty: '0-2',
        furnishingStatus: 'Semi-Furnished', facing: 'North', view: 'Lake View',
        balcony: '2', powerBackup: 'Full', flooring: 'Vitrified Tiles',
        coveredParking: 2, coveredUnParking: 0, sutableFor: 'Family',
        additionalRooms: ['Pooja Room'], trasactionType: 'Resale',
        landmarkHospital: 'KIMS Hospital 3 km', landmarkEducationInstitute: 'ISB Business School 2 km',
        landmarkShoppingCenter: 'Inorbit Mall 4 km', landmarkTransportation: 'Gachibowli Metro 1 km',
        landmarkCommercialHub: 'HITEC City 3 km',
        amenitiesDetails: [{ name: 'Swimming Pool', count: 1 }, { name: 'Gym', count: 1 }, { name: 'Badminton Court', count: 2 }, { name: 'CCTV Surveillance', count: 1 }],
        furnishingDetails: [{ name: 'AC', count: 3 }, { name: 'Geyser', count: 2 }],
        aboutProperty: "My Home Aura — ultra-luxurious living in the heart of Hyderabad's IT corridor.",
        uploadedPaths: img(IMG.apt1), isExclusive: false, isFeatured: true,
        createAt: daysAgo(12), updatedAt: daysAgo(1),
    },
    {
        propertyID: 'kohinoor-central-park-3bhk-hinjewadi-sale-pune',
        title: 'Kohinoor Central Park', listingType: 'sale', buildingType: 'Apartment',
        propertyType: 'Residential', possessionStatus: 'Ready To Move',
        price: '13500000', priceNumber: 13500000,
        area: '1750', areaNumber: 1750, areaCarpet: '1500', areaCarpetNumber: 1500,
        location: 'Hinjewadi Phase 2', city: 'Pune', postalCode: '411057',
        houseType: '3 BHK', bathsType: '3', floorNumber: '11', floorNumberNumber: 11,
        towerBlock: 'C', totalFloorCount: '22', ageProperty: '0-2',
        furnishingStatus: 'Semi-Furnished', facing: 'North East', view: 'Hills View',
        balcony: '2', powerBackup: 'Full', flooring: 'Vitrified Tiles',
        coveredParking: 2, coveredUnParking: 0, sutableFor: 'Family',
        additionalRooms: ['Pooja Room', 'Study Room'], trasactionType: 'Resale',
        landmarkHospital: 'Sahyadri Hospital 4 km', landmarkEducationInstitute: 'MIT World Peace University 5 km',
        landmarkShoppingCenter: 'Westend Mall 3 km', landmarkTransportation: 'Hinjewadi BRTS 500 m',
        landmarkCommercialHub: 'Rajiv Gandhi IT Park 1 km',
        amenitiesDetails: [{ name: 'Swimming Pool', count: 1 }, { name: 'Gym', count: 1 }, { name: 'Clubhouse', count: 1 }, { name: 'Jogging Track', count: 1 }],
        furnishingDetails: [{ name: 'AC', count: 3 }, { name: 'Geyser', count: 2 }],
        aboutProperty: "Kohinoor Central Park — premium residences in Pune's IT capital, Hinjewadi.",
        uploadedPaths: img(IMG.apt1), isExclusive: false, isFeatured: true,
        createAt: daysAgo(28), updatedAt: daysAgo(4),
    },
];

const ARTICLES = [
    {
        articleID: 'top-investment-localities-bangalore-2025',
        title: 'Top 10 Investment Localities in Bangalore for 2025',
        description: 'Bangalore continues to attract investors with its booming IT sector. Here are the top localities offering the best returns on investment in 2025.',
        imageUrl: IMG.news1, author: ['Ravi Kumar', 'Priya Sharma'],
        isFeaturedArticle: true, cities: ['Bangalore'],
        createdAt: daysAgo(5), published: true,
    },
    {
        articleID: 'mumbai-real-estate-market-2025-outlook',
        title: 'Mumbai Real Estate Market: 2025 Outlook and Predictions',
        description: "After a record-breaking 2024, what does 2025 hold for Mumbai's property market? Industry experts weigh in.",
        imageUrl: IMG.news2, author: ['Anjali Mehta'],
        isFeaturedArticle: true, cities: ['Mumbai'],
        createdAt: daysAgo(8), published: true,
    },
    {
        articleID: 'guide-to-buying-first-home-india',
        title: 'The Complete Guide to Buying Your First Home in India',
        description: 'From choosing the right locality to navigating home loans and registration — everything a first-time buyer needs to know.',
        imageUrl: IMG.news3, author: ['Suresh Nair', 'Kavita Reddy'],
        isFeaturedArticle: true, cities: ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai'],
        createdAt: daysAgo(12), published: true,
    },
    {
        articleID: 'hyderabad-it-corridor-property-boom',
        title: "Hyderabad's IT Corridor: Why HITEC City Properties Are Booming",
        description: 'With global tech giants setting up campuses in HITEC City, Hyderabad has emerged as India\'s second Silicon Valley.',
        imageUrl: IMG.news4, author: ['Vikram Reddy'],
        isFeaturedArticle: true, cities: ['Hyderabad'],
        createdAt: daysAgo(15), published: true,
    },
    {
        articleID: 'home-loan-emi-calculator-guide-2025',
        title: 'How to Calculate Your Home Loan EMI: A 2025 Guide',
        description: 'Understanding interest rates, tenures, and prepayment options can save you lakhs.',
        imageUrl: IMG.news5, author: ['Meera Joshi', 'Arun Nambiar'],
        isFeaturedArticle: true, cities: ['Bangalore', 'Mumbai', 'Gurgaon'],
        createdAt: daysAgo(20), published: true,
    },
    {
        articleID: 'international-nri-property-investment-india',
        title: 'NRI Property Investment in India: What You Need to Know',
        description: 'NRI investments in Indian real estate hit a record $13.1 billion in 2024.',
        imageUrl: IMG.news6, author: ['Deepak Menon'],
        isFeaturedArticle: true, cities: ['Bangalore', 'Mumbai', 'Hyderabad'],
        createdAt: daysAgo(25), published: true,
    },
];

// ─── Part 1: Seed realestate (native MongoDB) ─────────────────────────────────

async function seedRealestate() {
    console.log('\n── Realestate (native MongoDB) ─────────────────────────');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    const propertiesCol = db.collection('properties');
    const articlesCol   = db.collection('articles');

    if (CLEAN) {
        const seedPropertyIDs = PROPERTIES.map(p => p.propertyID);
        const seedArticleIDs  = ARTICLES.map(a => a.articleID);
        const delP = await propertiesCol.deleteMany({ propertyID: { $in: seedPropertyIDs } });
        const delA = await articlesCol.deleteMany({ articleID: { $in: seedArticleIDs } });
        console.log(`   Cleaned: ${delP.deletedCount} properties, ${delA.deletedCount} articles`);
    }

    for (const property of PROPERTIES) {
        await propertiesCol.updateOne({ propertyID: property.propertyID }, { $set: property }, { upsert: true });
    }
    for (const article of ARTICLES) {
        await articlesCol.updateOne({ articleID: article.articleID }, { $set: article }, { upsert: true });
    }

    console.log(`   Seeded: ${PROPERTIES.length} properties, ${ARTICLES.length} articles`);
    const cities = [...new Set(PROPERTIES.map(p => p.city))];
    cities.forEach(c => console.log(`     ${c}: ${PROPERTIES.filter(p => p.city === c).length} properties`));

    await client.close();
}

// ─── Part 2: Seed serveease (Mongoose) ───────────────────────────────────────

async function seedServeease() {
    if (!MONGOOSE_URI) {
        console.warn('\n   MONGODB_URI not set — skipping ServeEase seed');
        return;
    }

    console.log('\n── ServeEase (Mongoose) ────────────────────────────────');
    await mongoose.connect(MONGOOSE_URI);

    const Category = require('../modules/serveease/models/Category');
    const Service  = require('../modules/serveease/models/Service');
    const Agent    = require('../modules/serveease/models/Agent');
    const User     = require('../modules/serveease/models/User');
    const Coupon   = require('../modules/serveease/models/Coupon');

    const categoriesData          = require('../modules/serveease/seeds/categories.seed');
    const servicesByCategorySlug  = require('../modules/serveease/seeds/services.seed');
    const agentsData              = require('../modules/serveease/seeds/agents.seed');

    if (CLEAN) {
        await Promise.all([Category.deleteMany(), Service.deleteMany(), Agent.deleteMany(), Coupon.deleteMany()]);
        console.log('   Cleaned: categories, services, agents, coupons');
    }

    // Categories
    const categoryMap = {};
    for (const cat of categoriesData) {
        const existing = await Category.findOne({ slug: cat.slug });
        if (existing) { categoryMap[cat.slug] = existing._id; continue; }
        const created = await Category.create(cat);
        categoryMap[cat.slug] = created._id;
    }
    console.log(`   Seeded: ${Object.keys(categoryMap).length} categories`);

    // Services
    let serviceCount = 0;
    for (const [slug, services] of Object.entries(servicesByCategorySlug)) {
        const categoryId = categoryMap[slug];
        if (!categoryId) continue;
        for (const svc of services) {
            const existing = await Service.findOne({ slug: svc.slug });
            if (existing) continue;
            await Service.create({ ...svc, categoryId });
            serviceCount++;
        }
        await Category.findByIdAndUpdate(categoryId, { serviceCount: await Service.countDocuments({ categoryId, isActive: true }) });
    }
    console.log(`   Seeded: ${serviceCount} services`);

    // Agents
    let agentCount = 0;
    for (const agentData of agentsData) {
        const existing = await Agent.findOne({ phone: agentData.phone });
        if (existing) continue;
        const skillIds = agentData.skills.map(slug => categoryMap[slug]).filter(Boolean);
        await Agent.create({ ...agentData, skills: skillIds });
        agentCount++;
    }
    console.log(`   Seeded: ${agentCount} agents`);

    // Coupons
    const coupons = [
        { code: 'WELCOME50', description: '50% off first booking', type: 'percent', value: 50, maxDiscount: 300, minOrderValue: 200, isFirstBookingOnly: true, validFrom: new Date(), validUntil: new Date(Date.now() + 90 * 864e5), maxUses: 1000 },
        { code: 'FLAT100',   description: '₹100 off any booking',  type: 'flat',    value: 100, minOrderValue: 499, validFrom: new Date(), validUntil: new Date(Date.now() + 30 * 864e5), maxUses: 500 },
        { code: 'CLEAN20',   description: '20% off cleaning',       type: 'percent', value: 20,  maxDiscount: 200, minOrderValue: 399, validFrom: new Date(), validUntil: new Date(Date.now() + 60 * 864e5), applicableCities: ['Bangalore', 'Mumbai'] },
    ];
    for (const coupon of coupons) {
        const existing = await Coupon.findOne({ code: coupon.code });
        if (!existing) await Coupon.create(coupon);
    }
    console.log(`   Seeded: ${coupons.length} coupons`);

    // Demo admin user
    const adminPhone = '+919000000001';
    await User.findOneAndUpdate(
        { phone: adminPhone },
        { $set: { name: 'Admin Realistan', email: 'admin@realistan.com', isActive: true, isVerified: true, isAdmin: true }, $setOnInsert: { phone: adminPhone } },
        { upsert: true }
    );
    console.log(`   Admin user ensured: ${adminPhone}`);

    await mongoose.disconnect();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log(`Seeding database: ${MONGO_URI}/${DB_NAME}${CLEAN ? ' [--clean]' : ''}`);
    await seedRealestate();
    await seedServeease();
    console.log('\nSeeding complete.\n');
}

run().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
