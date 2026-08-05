'use strict';
/**
 * S3 keys for real, freely-licensed images uploaded to the `realistanimages` bucket
 * (sourced from Wikimedia Commons — CC BY / CC BY-SA / CC0 / Public Domain — and
 * curated by hand). Served on the live site via the Gumlet CDN in front of the bucket.
 */

const PROPERTY_IMG = {
    bangaloreBrigadeExotica:    'properties/bangalore-apartment-brigade-exotica.jpg',
    bangalorePashminaWaterfront:'properties/bangalore-apartment-pashmina-waterfront.jpg',
    bangaloreSalarpuriaGold:    'properties/bangalore-apartment-salarpuria-gold-summit.jpg',
    bangaloreValmarkApas:       'properties/bangalore-apartment-valmark-apas.jpg',
    mumbaiApartments1:          'properties/mumbai-apartments-1.jpg',
    mumbaiBuilding1:            'properties/mumbai-building-1.jpg',
    mumbaiSkyscraperRailway:    'properties/mumbai-skyscraper-railway-view.jpg',
    mumbaiCrownTowerEvening:    'properties/mumbai-crown-tower-evening.jpg',
    hyderabadMadhapurHighrise:  'properties/hyderabad-madhapur-highrise.jpg',
    hyderabadHussainsagar:      'properties/hyderabad-hussainsagar-buildings.jpg',
    hyderabadVillaGreens:       'properties/hyderabad-villa-greens-gandipet.jpg',
    puneSkylineWestin:          'properties/pune-skyline-westin-koregaon.jpg',
    puneViewParvatiHill:        'properties/pune-view-parvati-hill.jpg',
    puneOfficeFulcrum:          'properties/pune-office-fulcrum.jpg',
    gurgaonDlfEpitomeTower:     'properties/gurgaon-dlf-epitome-tower.jpg',
    gurgaonCorporateTower:      'properties/gurgaon-corporate-tower.jpg',
    gurgaonBelvedereTowers:     'properties/gurgaon-belvedere-towers.jpg',
    chennaiSprCity:             'properties/chennai-spr-city.jpg',
    chennaiPhoenixMarketcity:   'properties/chennai-phoenix-marketcity.jpg',
    villaRoyal:                 'properties/villa-royal.jpg',
    villaTownship:              'properties/villa-township.jpg',
    officeGeneric1:             'properties/office-generic-1.jpg',
    officeGeneric2:             'properties/office-generic-2.jpg',
    interiorLivingRoom1:        'properties/interior-living-room-1.jpg',
    interiorLivingRoom2:        'properties/interior-living-room-2.jpg',
};

const NEWS_IMG = {
    bangaloreInvestmentGuide: 'news/bangalore-investment-guide.jpg',
    mumbaiMarketOutlook:      'news/mumbai-market-outlook.jpg',
    puneInvestmentGuide:      'news/pune-investment-guide.jpg',
    gurgaonNcrGuide:          'news/gurgaon-ncr-guide.jpg',
    chennaiMarketGuide:       'news/chennai-market-guide.jpg',
    hyderabadItCorridor:      'news/hyderabad-it-corridor.jpg',
    homeLoanFinance:          'news/home-loan-finance.jpg',
    firstTimeBuyerGuide:      'news/first-time-buyer-guide.jpg',
    // pre-existing, already working
    realEstateNews:           'news/real-estate-news.jpeg',
    realestateInformation:    'news/realestate-information.jpg',
    cities:                   'news/cities.jpg',
    medias:                   'news/medias.jpg',
    calculator:               'news/calculator.jpg',
    international:            'news/international.webp',
};

const img = (...paths) => paths.map((path, i) => ({ id: `seed-img-${i + 1}`, path }));

module.exports = { PROPERTY_IMG, NEWS_IMG, img };
