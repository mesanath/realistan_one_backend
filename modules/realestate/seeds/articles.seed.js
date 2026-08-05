'use strict';
/**
 * Organic article seed data for the realestate module.
 *
 * The first 6 entries keep the exact `articleID`s already live in production —
 * their images already work, so only `updatedAt` + `content` are added here.
 * Everything after that is new coverage across 6 cities plus general-interest
 * real estate topics.
 */

const { NEWS_IMG } = require('./image-assets');

const now = () => +new Date();
const daysAgo = (n) => now() - n * 86400000;

module.exports = [
    // ─── Existing articles (enriched, images unchanged since they already work) ─
    {
        articleID: 'top-investment-localities-bangalore-2025',
        title: 'Top 10 Investment Localities in Bangalore for 2025',
        description: 'Bangalore continues to attract investors with its booming IT sector. Here are the top localities offering the best returns on investment in 2025.',
        content: '<p>Bangalore\'s real estate market has stayed resilient through 2025, driven largely by continued hiring in the IT and startup sectors. Localities near the Outer Ring Road — Bellandur, Sarjapur Road and Whitefield — remain top picks for investors chasing rental yield, while North Bangalore corridors like Devanahalli have gained ground on the back of airport-linked infrastructure.</p><p>Emerging micro-markets such as Yelahanka and Hennur Road are also drawing attention from first-time investors priced out of the traditional IT belt, offering lower entry points with strong long-term appreciation potential.</p>',
        imageUrl: NEWS_IMG.realEstateNews, author: ['Ravi Kumar', 'Priya Sharma'],
        isFeaturedArticle: true, cities: ['Bangalore'],
        createdAt: daysAgo(5), updatedAt: daysAgo(5), published: true,
    },
    {
        articleID: 'mumbai-real-estate-market-2025-outlook',
        title: 'Mumbai Real Estate Market: 2025 Outlook and Predictions',
        description: "After a record-breaking 2024, what does 2025 hold for Mumbai's property market? Industry experts weigh in.",
        content: '<p>Mumbai closed 2024 with its highest property registrations in over a decade, and early 2025 data suggests the momentum has largely held. Redevelopment projects across the Western and Central suburbs continue to add fresh supply, easing some of the pricing pressure seen in South Mumbai.</p><p>Analysts expect the Thane–Mulund belt and the extended BKC micro-market to see the sharpest price growth this year, as infrastructure projects like the Coastal Road and Metro extensions near completion.</p>',
        imageUrl: NEWS_IMG.realestateInformation, author: ['Anjali Mehta'],
        isFeaturedArticle: true, cities: ['Mumbai'],
        createdAt: daysAgo(8), updatedAt: daysAgo(8), published: true,
    },
    {
        articleID: 'guide-to-buying-first-home-india',
        title: 'The Complete Guide to Buying Your First Home in India',
        description: 'From choosing the right locality to navigating home loans and registration — everything a first-time buyer needs to know.',
        content: '<p>Buying your first home is as much a financial decision as an emotional one. Start by getting your credit score and loan eligibility checked before you start locality-hunting — it narrows your search to what you can actually afford.</p><p>Once you\'ve shortlisted a property, verify the RERA registration, check the builder\'s track record, and get a lawyer to review the sale agreement before you sign. Budget an extra 7–10% of the property value for stamp duty, registration and interiors.</p>',
        imageUrl: NEWS_IMG.cities, author: ['Suresh Nair', 'Kavita Reddy'],
        isFeaturedArticle: true, cities: ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai'],
        createdAt: daysAgo(12), updatedAt: daysAgo(12), published: true,
    },
    {
        articleID: 'hyderabad-it-corridor-property-boom',
        title: "Hyderabad's IT Corridor: Why HITEC City Properties Are Booming",
        description: 'With global tech giants setting up campuses in HITEC City, Hyderabad has emerged as India\'s second Silicon Valley.',
        content: '<p>HITEC City and the neighbouring Financial District have transformed Hyderabad\'s western suburbs into one of India\'s densest technology employment clusters. Rental demand around Gachibowli, Kondapur and Nallagandla has stayed consistently strong as companies expand their campuses.</p><p>Property prices in the corridor have risen steadily but remain more affordable than comparable IT hubs in Bangalore or Mumbai, making it an attractive entry point for both end-users and investors.</p>',
        imageUrl: NEWS_IMG.medias, author: ['Vikram Reddy'],
        isFeaturedArticle: true, cities: ['Hyderabad'],
        createdAt: daysAgo(15), updatedAt: daysAgo(15), published: true,
    },
    {
        articleID: 'home-loan-emi-calculator-guide-2025',
        title: 'How to Calculate Your Home Loan EMI: A 2025 Guide',
        description: 'Understanding interest rates, tenures, and prepayment options can save you lakhs.',
        content: '<p>Your EMI is determined by three levers: loan amount, interest rate and tenure. Stretching the tenure lowers your monthly outgo but sharply increases the total interest paid — a 20-year loan can cost nearly double the principal in interest alone.</p><p>Making even one extra EMI payment a year, or prepaying whenever you get a bonus, can shave several years off a long-tenure loan and save a significant amount in interest over its life.</p>',
        imageUrl: NEWS_IMG.calculator, author: ['Meera Joshi', 'Arun Nambiar'],
        isFeaturedArticle: true, cities: ['Bangalore', 'Mumbai', 'Gurgaon'],
        createdAt: daysAgo(20), updatedAt: daysAgo(20), published: true,
    },
    {
        articleID: 'international-nri-property-investment-india',
        title: 'NRI Property Investment in India: What You Need to Know',
        description: 'NRI investments in Indian real estate hit a record $13.1 billion in 2024.',
        content: '<p>NRIs can buy residential and commercial property in India without RBI approval, but agricultural land, farmhouses and plantation property remain off-limits under FEMA regulations. Payments must be routed through NRE, NRO or FCNR accounts.</p><p>Gated communities in Bangalore, Hyderabad and Pune remain the most popular picks among NRI buyers, largely for their professional property management and strong rental demand from the local IT workforce.</p>',
        imageUrl: NEWS_IMG.international, author: ['Deepak Menon'],
        isFeaturedArticle: true, cities: ['Bangalore', 'Mumbai', 'Hyderabad'],
        createdAt: daysAgo(25), updatedAt: daysAgo(25), published: true,
    },

    // ─── New articles ────────────────────────────────────────────────────────
    {
        articleID: 'bangalore-real-estate-2026-where-to-invest',
        title: 'Bangalore Real Estate in 2026: Where Should You Invest Next?',
        description: 'From the airport corridor to Sarjapur Road, we map out the Bangalore micro-markets offering the best growth potential this year.',
        content: '<p>With Bangalore\'s IT and startup ecosystem still expanding, demand for housing along the Outer Ring Road and North Bangalore continues to outpace supply in several pockets. Sarjapur Road and Whitefield remain steady performers for rental yield, while Devanahalli is benefiting from airport-linked infrastructure upgrades.</p><p>Buyers looking for value are increasingly turning to emerging corridors like Yelahanka and Hennur, where prices are still 20–30% below established IT belts but infrastructure is quickly catching up.</p>',
        imageUrl: NEWS_IMG.bangaloreInvestmentGuide, author: ['Priya Sharma'],
        isFeaturedArticle: true, cities: ['Bangalore'],
        createdAt: daysAgo(2), updatedAt: daysAgo(2), published: true,
    },
    {
        articleID: 'mumbai-property-market-mid-2026-outlook',
        title: 'Mumbai Property Market: 2026 Mid-Year Outlook',
        description: 'Redevelopment, metro expansion and coastal road connectivity are reshaping where Mumbai buyers want to live.',
        content: '<p>Halfway through 2026, Mumbai\'s property market shows a clear shift toward the extended suburbs. Thane, Mulund and the Navi Mumbai belt are absorbing much of the fresh demand as buyers priced out of South and Central Mumbai look for larger homes at lower per-square-foot rates.</p><p>The ongoing Metro expansion and Coastal Road project are expected to further improve connectivity to these corridors, a trend that\'s already showing up in early price appreciation data.</p>',
        imageUrl: NEWS_IMG.mumbaiMarketOutlook, author: ['Anjali Mehta'],
        isFeaturedArticle: false, cities: ['Mumbai'],
        createdAt: daysAgo(1), updatedAt: daysAgo(1), published: true,
    },
    {
        articleID: 'pune-it-corridor-housing-demand-2026',
        title: "Why Pune's IT Corridor Is Driving Housing Demand in 2026",
        description: 'Hinjewadi, Kharadi and Wagholi are absorbing the bulk of new supply as IT hiring picks up across Pune.',
        content: '<p>Pune\'s IT corridors — Hinjewadi in the west and Kharadi-Magarpatta in the east — continue to anchor housing demand across the city. Rental yields in these pockets have held steady even as new supply comes online, a sign that end-user demand remains healthy.</p><p>Affordable townships further out, such as those in Wagholi and Hadapsar, are increasingly popular with young professionals who want proximity to IT parks without paying Hinjewadi-level premiums.</p>',
        imageUrl: NEWS_IMG.puneInvestmentGuide, author: ['Arun Nambiar'],
        isFeaturedArticle: false, cities: ['Pune'],
        createdAt: daysAgo(6), updatedAt: daysAgo(6), published: true,
    },
    {
        articleID: 'gurgaon-vs-noida-ncr-homebuyers-2026',
        title: 'Gurgaon vs Noida: Where Should NCR Homebuyers Look in 2026?',
        description: 'Both NCR hubs offer very different trade-offs on price, infrastructure and commute — here\'s how they stack up.',
        content: '<p>Gurgaon continues to command a premium for its corporate density along Golf Course Road and Cyber Hub, while Noida offers comparatively larger homes at lower prices, especially along the Noida-Greater Noida Expressway.</p><p>The Dwarka Expressway has opened up newer, more affordable Gurgaon sectors like 82 and 84, giving buyers a middle path between the two cities\' price points without sacrificing connectivity to Delhi.</p>',
        imageUrl: NEWS_IMG.gurgaonNcrGuide, author: ['Kavita Reddy'],
        isFeaturedArticle: false, cities: ['Gurgaon'],
        createdAt: daysAgo(9), updatedAt: daysAgo(9), published: true,
    },
    {
        articleID: 'chennai-omr-it-corridor-housing-demand',
        title: "Chennai's OMR Corridor: The Rise of IT-Driven Housing Demand",
        description: 'Old Mahabalipuram Road has become Chennai\'s answer to Bangalore\'s ORR, with housing demand to match.',
        content: '<p>OMR — often called Chennai\'s IT Expressway — now hosts one of the city\'s largest concentrations of tech and BPO employment, and housing supply along Sholinganallur, Siruseri and Navalur has grown to match it.</p><p>Compared to similar IT corridors in Bangalore or Pune, OMR still offers relatively affordable entry points, which is drawing interest from both local upgraders and out-of-state investors.</p>',
        imageUrl: NEWS_IMG.chennaiMarketGuide, author: ['Suresh Nair'],
        isFeaturedArticle: false, cities: ['Chennai'],
        createdAt: daysAgo(4), updatedAt: daysAgo(4), published: true,
    },
    {
        articleID: 'hyderabad-financial-district-new-cbd',
        title: 'Hyderabad Real Estate: Financial District Emerges as the New CBD',
        description: 'Once a satellite of HITEC City, the Financial District and Kokapet are now a destination in their own right.',
        content: '<p>The Financial District, anchored by Nanakramguda and spilling into Kokapet and Narsingi, has grown from an extension of HITEC City into a commercial and residential hub of its own, drawing premium villa and high-rise developments.</p><p>Infrastructure upgrades along the Outer Ring Road have cut commute times to the airport and the rest of the IT corridor, a key reason developers are betting big on the area for the next wave of luxury housing.</p>',
        imageUrl: NEWS_IMG.hyderabadItCorridor, author: ['Vikram Reddy'],
        isFeaturedArticle: false, cities: ['Hyderabad'],
        createdAt: daysAgo(3), updatedAt: daysAgo(3), published: true,
    },
    {
        articleID: 'home-loan-interest-rates-2026-guide',
        title: 'Home Loan Interest Rates in 2026: What Every Buyer Should Know',
        description: 'A primer on fixed vs floating rates, repo-linked lending and how to negotiate a better deal with your bank.',
        content: '<p>Most home loans in India today are repo-linked, which means your EMI moves in step with RBI rate decisions. It\'s worth comparing offers across banks rather than sticking with your salary account bank by default — spreads between lenders can add up to real savings over a 15–20 year loan.</p><p>A strong credit score, a lower loan-to-value ratio, and an existing relationship with the lender are the three biggest levers for negotiating a better rate.</p>',
        imageUrl: NEWS_IMG.homeLoanFinance, author: ['Meera Joshi'],
        isFeaturedArticle: false, cities: ['Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Gurgaon', 'Chennai'],
        createdAt: daysAgo(7), updatedAt: daysAgo(7), published: true,
    },
    {
        articleID: 'first-time-homebuyer-mistakes-to-avoid',
        title: '5 Mistakes First-Time Homebuyers Make (And How to Avoid Them)',
        description: 'From skipping the RERA check to underestimating maintenance costs — the most common first-time buyer pitfalls.',
        content: '<p>The most common mistake first-time buyers make is falling for a property before checking its RERA registration and the builder\'s delivery track record. The second is underestimating total cost — stamp duty, registration, brokerage and interiors typically add 8–12% on top of the sale price.</p><p>Buyers also frequently skip a legal title check, assuming the builder or broker has already done it. Always get an independent lawyer to verify the chain of title before you pay a booking amount.</p>',
        imageUrl: NEWS_IMG.firstTimeBuyerGuide, author: ['Kavita Reddy', 'Suresh Nair'],
        isFeaturedArticle: false, cities: ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Gurgaon'],
        createdAt: daysAgo(11), updatedAt: daysAgo(11), published: true,
    },
    {
        articleID: 'villas-vs-apartments-which-to-buy-2026',
        title: 'Villas vs Apartments: Which Should You Buy in 2026?',
        description: 'More space and privacy versus lower maintenance and better liquidity — how to decide.',
        content: '<p>Villas offer more space, privacy and often a garden or private pool, but come with higher maintenance responsibility and typically longer resale timelines than apartments in well-established communities.</p><p>Apartments in gated townships, on the other hand, benefit from shared amenities, professional upkeep and generally faster liquidity when it\'s time to sell — an important factor if you expect to relocate within a few years.</p>',
        imageUrl: NEWS_IMG.realEstateNews, author: ['Ravi Kumar'],
        isFeaturedArticle: false, cities: ['Bangalore', 'Hyderabad', 'Gurgaon'],
        createdAt: daysAgo(14), updatedAt: daysAgo(14), published: true,
    },
    {
        articleID: 'commercial-real-estate-office-space-investment-india',
        title: 'Commercial Real Estate in India: Is Office Space Still a Good Investment?',
        description: 'With hybrid work reshaping demand, we look at whether Grade-A office space still makes sense for investors.',
        content: '<p>Despite predictions that hybrid work would permanently dent office demand, Grade-A space in established IT corridors — BKC, ORR Bangalore, HITEC City and Gurgaon\'s Golf Course Road — has continued to see strong occupancy from large corporates consolidating into fewer, better-quality buildings.</p><p>Smaller, older office stock has borne the brunt of the shift, while REITs backed by premium commercial assets have delivered steady rental yields for investors who prefer not to hold property directly.</p>',
        imageUrl: NEWS_IMG.calculator, author: ['Arun Nambiar', 'Deepak Menon'],
        isFeaturedArticle: false, cities: ['Mumbai', 'Bangalore', 'Gurgaon', 'Hyderabad'],
        createdAt: daysAgo(17), updatedAt: daysAgo(17), published: true,
    },
    {
        articleID: 'interior-design-trends-indian-homes-2026',
        title: 'Interior Design Trends Shaping Indian Homes in 2026',
        description: 'From biophilic design to multi-functional rooms, here\'s what\'s influencing how Indian homebuyers furnish their spaces.',
        content: '<p>Biophilic design — bringing natural light, greenery and organic materials indoors — has moved from a niche preference to a mainstream ask among urban homebuyers, especially in dense metro apartments.</p><p>With more people working from home at least part of the week, multi-functional rooms that double as a study or guest space have become a key differentiator that buyers actively look for during site visits.</p>',
        imageUrl: NEWS_IMG.realestateInformation, author: ['Priya Sharma'],
        isFeaturedArticle: false, cities: ['Bangalore', 'Mumbai', 'Pune'],
        createdAt: daysAgo(19), updatedAt: daysAgo(19), published: true,
    },
    {
        articleID: 'rent-vs-buy-young-professionals-metro-cities',
        title: 'Rent vs Buy: What Makes Sense for Young Professionals in Metro Cities?',
        description: 'A break-even analysis for buyers weighing a first home purchase against staying on rent in India\'s top metros.',
        content: '<p>The rent-vs-buy decision usually comes down to how long you plan to stay in a city. Buying tends to make financial sense only if you expect to hold the property for at least 5–7 years, once you factor in stamp duty, registration, brokerage and interest costs.</p><p>For professionals early in their careers with uncertain relocation plans, renting while investing the difference can often outperform buying — though it comes at the cost of the forced savings discipline and long-term equity a home loan builds.</p>',
        imageUrl: NEWS_IMG.cities, author: ['Meera Joshi', 'Vikram Reddy'],
        isFeaturedArticle: false, cities: ['Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Gurgaon', 'Chennai'],
        createdAt: daysAgo(23), updatedAt: daysAgo(23), published: true,
    },
];
