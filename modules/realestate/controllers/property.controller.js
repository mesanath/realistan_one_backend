'use strict';
const { db, ObjectID } = require('../../../src/utils/dbs');
const { getIo } = require('../../../src/socket/index');

// ─── Shared helpers ────────────────────────────────────────────────────────────

const string_to_slug = (str) => {
    str = str.replace(/^\s+|\s+$/g, '');
    str = str.toLowerCase();
    const from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
    const to   = 'aaaaeeeeiiiioooouuuunc------';
    for (let i = 0; i < from.length; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }
    return str.replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
};

const convertForFront = (amount) => {
    if (!amount) return 'NA';
    if (amount >= 10000000) return (amount / 10000000).toFixed(2) + ' Cr';
    if (amount >= 100000)   return (amount / 100000).toFixed(2) + ' L';
    if (amount >= 1000)     return (amount / 1000).toFixed(2) + ' K';
    return String(amount);
};

const buildPropertyResponse = (property) => {
    const {
        listingType, propertyType, buildingType, city, location, area, areaCarpet,
        price, priceNumber, possessionStatus, houseType, bathsType, view, furnishingStatus,
        floorNumber, towerBlock, ageProperty, totalFloorCount, facing, balcony,
        powerBackup, flooring, coveredParking, sutableFor, additionalRooms,
    } = property;

    property.OneDetails = [
        { type: 'Listing Type', value: listingType || 'Sale' },
        { type: 'Property Type', value: propertyType || 'Residential' },
        { type: 'Building Type', value: buildingType || 'Apartment' },
        { type: 'City', value: city || 'Bangalore' },
        { type: 'Locality', value: location || 'Jp Nagar' },
        { type: 'Area', value: `${area} Sq.Ft. (Saleable Area)` },
        { type: 'Carpet Area', value: `${areaCarpet} Sq.Ft. (Saleable Area)` },
        { type: 'Price', value: `₹ ${convertForFront(priceNumber || Number(price))}` },
        { type: 'Possession Status', value: possessionStatus || 'Ready To Move' },
        { type: 'Furnishing Status', value: furnishingStatus || 'Semi-Furnished' },
        { type: 'Number of Rooms', value: houseType || '2' },
        { type: 'Number of Bathroom', value: bathsType || '2' },
        { type: 'Covered Parking', value: coveredParking || '2' },
        { type: 'View', value: view || 'Community View' },
        { type: 'Floor Number', value: floorNumber || '7' },
        { type: 'Tower/Block', value: towerBlock || '1' },
        { type: 'Age of Property (Years)', value: ageProperty || '2-4' },
        { type: 'Total Floor Count', value: totalFloorCount || '7' },
        { type: 'Facing', value: facing || 'South' },
        { type: 'Balcony', value: balcony || 'Individual' },
        { type: 'Power Back-up', value: powerBackup || 'Available' },
        { type: 'Flooring', value: flooring || 'Marble' },
        { type: 'Open/Uncovered Parking', value: coveredParking || '1' },
        { type: 'Sutable For', value: sutableFor || 'Family' },
        { type: 'Additional Rooms', value: additionalRooms || 'Study Room' },
    ];

    if (Array.isArray(property.furnishingDetails)) {
        property.furnishingDetails = property.furnishingDetails.filter(item => item.count);
    }
    if (Array.isArray(property.amenitiesDetails)) {
        property.amenitiesDetails = property.amenitiesDetails.filter(item => item.count);
    }

    property.landmarks = [];
    if (property.landmarkCommercialHub) property.landmarks.push({ type: 'Commercial Hub', value: property.landmarkCommercialHub });
    if (property.landmarkEducationInstitute) property.landmarks.push({ type: 'Education Institute', value: property.landmarkEducationInstitute });
    if (property.landmarkHospital) property.landmarks.push({ type: 'Hospital', value: property.landmarkHospital });
    if (property.landmarkShoppingCenter) property.landmarks.push({ type: 'Shopping Center', value: property.landmarkShoppingCenter });
    if (property.landmarkTransportation) property.landmarks.push({ type: 'Transportation', value: property.landmarkTransportation });

    return property;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.getProperties = async (req, res) => {
    try {
        const {
            HomePageType, listingType, categoryType, buildingType, propertyType,
            houseType, bathsType, buitInAreaRange, priceRange,
            possessionStatus, facing, ageProperty, floorNumber,
            sutableFor, sortField, sortType, limitList,
            city, area, page,
        } = req.body;

        const sortQuery = {};
        if (sortField) {
            sortQuery[sortField] = sortType || -1;
        } else {
            sortQuery['updatedAt'] = sortType || -1;
        }
        const limitQuery = limitList || 10;
        const skipCount = Math.max(0, (page || 0)) * limitQuery;

        // AND filters — applied at the top level to always narrow results
        const findAnd = {};
        if (city) findAnd.city = city;
        // categoryType from search page maps to listingType
        const effectiveListingType = listingType || categoryType;

        const findObj = { $or: [] };
        if (houseType)             findObj.$or.push({ houseType });
        if (bathsType)             findObj.$or.push({ bathsType });
        if (effectiveListingType)  findObj.$or.push({ listingType: effectiveListingType });
        if (buildingType)          findObj.$or.push({ buildingType });
        if (propertyType)          findObj.$or.push({ propertyType });
        if (possessionStatus)      findObj.$or.push({ possessionStatus });
        if (facing)                findObj.$or.push({ facing });
        if (ageProperty)           findObj.$or.push({ ageProperty });
        if (floorNumber)           findObj.$or.push({ floorNumberNumber: floorNumber });
        if (sutableFor)            findObj.$or.push({ sutableFor });
        // area here is a text locality, not a numeric size — filter by location text match
        if (area && area !== 'exclusive') findObj.$or.push({ location: { $regex: area, $options: 'i' } });

        if (priceRange?.lt) {
            const { gt, lt } = priceRange;
            findObj.$or.push({ priceNumber: { $gte: parseFloat(gt) || 0, $lte: parseFloat(lt) || 1000000 } });
        }
        if (buitInAreaRange?.lt) {
            const { gt, lt } = buitInAreaRange;
            findObj.$or.push({ areaNumber: { $gte: parseFloat(gt) || 0, $lte: parseFloat(lt) || 1000000 } });
        }

        const homepageTypes = ['handpicked', 'exclusive', 'top'];
        if (homepageTypes.includes(HomePageType)) {
            findObj['homepageType'] = HomePageType;
        }

        // Build final query: AND filters (city, isDeleted) always applied, OR filters narrowing within
        const findFinal = { ...findAnd, isDeleted: { $ne: true } };
        if (findObj.$or.length > 0) findFinal.$or = findObj.$or;
        if (findObj.homepageType)   findFinal.homepageType = findObj.homepageType;

        const propertiesDB = db.get().collection('properties');
        const data = await propertiesDB.find(findFinal).sort(sortQuery).skip(skipCount).limit(limitQuery).toArray();

        return res.json({ success: true, message: 'Properties fetched successfully!', data });
    } catch (error) {
        console.error('getProperties error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.getPropertyById = async (req, res) => {
    try {
        const { propertyID } = req.body;
        const propertiesDB = db.get().collection('properties');
        const property = await propertiesDB.findOne({ propertyID, isDeleted: { $ne: true } });

        if (property) buildPropertyResponse(property);

        // Alert the owner when an authenticated (non-owner) user views their listing
        if (req.user && property?.createdBy && String(property.createdBy) !== String(req.user._id)) {
            try {
                const io = getIo();
                if (io) {
                    io.to(`realestate_${property.createdBy}`).emit('realestate:property_viewed', {
                        propertyID: property.propertyID,
                        title: property.title,
                        viewedAt: new Date().toISOString(),
                    });
                }
            } catch (_) { /* non-critical */ }
        }

        return res.json({ success: true, message: 'Property fetched successfully!', data: property });
    } catch (error) {
        console.error('getPropertyById error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.getRelatedProperties = async (req, res) => {
    try {
        const propertiesDB = db.get().collection('properties');
        let data = await propertiesDB
            .find({ isDeleted: { $ne: true } }, { projection: { amenitiesDetails: 0, furnishingDetails: 0, _id: 0 } })
            .sort({ updatedAt: -1 })
            .limit(20)
            .toArray();

        data = data.map(item => {
            const tags = [];
            if (item.furnishingStatus) tags.push(item.furnishingStatus);
            if (item.coveredParking)   tags.push(item.coveredParking);
            if (item.powerBackup)      tags.push(item.powerBackup);
            if (item.facing)           tags.push(item.facing);
            if (item.houseType)        tags.push(item.houseType);
            if (item.bathsType)        tags.push(item.bathsType);

            const tags2 = [];
            if (item.landmarkHospital)           tags2.push(item.landmarkHospital);
            if (item.landmarkEducationInstitute) tags2.push(item.landmarkEducationInstitute);
            if (item.powerBackup)                tags2.push(item.powerBackup);

            return {
                ...item,
                tags,
                tags2,
                priceActul: item.price,
                price: `₹ ${convertForFront(item.priceNumber || Number(item.price))}`,
            };
        });

        return res.json({ success: true, message: 'Related properties fetched successfully!', data });
    } catch (error) {
        console.error('getRelatedProperties error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.getHomepageProperties = async (req, res) => {
    try {
        const { sortField, sortType, limitList, topBuilders, isExclusive, isFeatured } = req.body;

        const sortQuery = {};
        if (sortField) {
            sortQuery[sortField] = sortType || -1;
        } else {
            sortQuery['updatedAt'] = sortType || -1;
        }
        const limitQuery = limitList || 10;

        const response = { topBuilders: null, exclusiveProperties: null, featuredProperties: null };

        if (topBuilders) {
            response.topBuilders = [
                { artist: 'Brigade Insignia', art: 'builders/brigade_insignia.jpg' },
                { artist: 'Birla Trimaya', art: 'builders/birla-trimaya.avif' },
                { artist: 'Embassy Verde', art: 'builders/embassy-verde.webp' },
                { artist: 'Provident Ecopolitan', art: 'builders/provident-ecopolitan.avif' },
                { artist: 'Shriram Serenity', art: 'builders/shriram-serenity.avif' },
                { artist: 'Tom Byrom', art: 'builders/shriram-serenity.avif' },
                { artist: 'Tom Byrom', art: 'builders/embassy-verde.webp' },
                { artist: 'Tom Byrom', art: 'builders/brigade_insignia.jpg' },
                { artist: 'Vladimir Malyavko', art: 'builders/brigade_insignia.jpg' },
            ];
        }

        const findObj = { $or: [], isDeleted: { $ne: true } };
        if (isExclusive) findObj.$or.push({ isExclusive: true });
        if (isFeatured)  findObj.$or.push({ isFeatured: true });
        const findFinal = findObj.$or.length > 0 ? findObj : { isDeleted: { $ne: true } };

        const propertiesDB = db.get().collection('properties');
        const allProps = await propertiesDB
            .find(findFinal, { projection: { amenitiesDetails: 0, furnishingDetails: 0, publishedAt: 0, published: 0, _id: 0 } })
            .sort(sortQuery)
            .limit(limitQuery)
            .toArray();

        response.exclusiveProperties = allProps.filter(item => item.isExclusive === true);
        response.featuredProperties  = allProps.filter(item => item.isFeatured === true);

        return res.json({ success: true, message: 'Homepage properties fetched successfully!', data: response });
    } catch (error) {
        console.error('getHomepageProperties error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.addProperty = async (req, res) => {
    try {
        const {
            title, listingType, buildingType, propertyType, possessionStatus, price, area, areaCarpet,
            location, city, postalCode, houseType, bathsType, aboutProperty,
            amenitiesDetails, furnishingDetails,
            additionalRooms, trasactionType, furnishingStatus, ageProperty, coveredParking, coveredUnParking,
            balcony, powerBackup, facing, view, flooring, totalFloorCount, floorNumber, towerBlock,
            landmarkEducationInstitute, landmarkTransportation, landmarkShoppingCenter,
            landmarkHospital, landmarkCommercialHub,
            propertyDescription, sutableFor,
            locationDefination, explaingPrice, explaingProperty, defineSizeStructure,
            uploadedPaths,
        } = req.body;

        const errors = [];
        if (!title)       errors.push('Missing title');
        if (!listingType) errors.push('Missing listingType');
        if (!price)       errors.push('Missing price');
        if (!postalCode)  errors.push('Missing postalCode');
        if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });

        const currentTimestamp = +new Date();
        const now = new Date().toLocaleDateString().split('/').join('');
        const propertyID = `${string_to_slug(title)}-${string_to_slug(listingType)}-${string_to_slug(houseType || '')}-${string_to_slug(location || '')}-postalcode-${string_to_slug(postalCode)}-${now}-${currentTimestamp}`;

        const obj = {
            propertyID,
            createdBy: req.user?._id || null,
            title, listingType, buildingType, propertyType, possessionStatus, price, area, areaCarpet,
            location, city, postalCode, houseType, bathsType, aboutProperty,
            amenitiesDetails: Array.isArray(amenitiesDetails) ? amenitiesDetails.filter(i => i.count) : [],
            furnishingDetails: Array.isArray(furnishingDetails) ? furnishingDetails.filter(i => i.count) : [],
            additionalRooms: Array.isArray(additionalRooms) ? additionalRooms : [],
            trasactionType, furnishingStatus, ageProperty,
            balcony, powerBackup, facing, view, flooring, totalFloorCount, floorNumber, towerBlock,
            landmarkEducationInstitute, landmarkTransportation, landmarkShoppingCenter,
            landmarkHospital, landmarkCommercialHub,
            propertyDescription, sutableFor,
            locationDefination, explaingPrice, explaingProperty, defineSizeStructure,
            uploadedPaths: Array.isArray(uploadedPaths) ? uploadedPaths : [],
            createAt: currentTimestamp,
            updatedAt: currentTimestamp,
        };

        if (price)           obj.priceNumber       = parseFloat(price);
        if (area)            obj.areaNumber        = parseFloat(area);
        if (areaCarpet)      obj.areaCarpetNumber  = parseFloat(areaCarpet);
        if (floorNumber)     obj.floorNumberNumber = parseFloat(floorNumber);
        if (coveredParking)  obj.coveredParking    = parseFloat(coveredParking);
        if (coveredUnParking !== undefined) obj.coveredUnParking = parseFloat(coveredUnParking) || 0;

        const propertiesDB = db.get().collection('properties');
        await propertiesDB.updateOne({ propertyID }, { $set: obj }, { upsert: true });

        const saved = await propertiesDB.findOne({ propertyID });
        return res.json({ success: true, message: 'Property added successfully!', data: buildPropertyResponse(saved) });
    } catch (error) {
        console.error('addProperty error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.updateProperty = async (req, res) => {
    try {
        const { propertyID, ...updates } = req.body;
        if (!propertyID) return res.status(400).json({ success: false, message: 'Missing propertyID' });

        const propertiesDB = db.get().collection('properties');
        const existing = await propertiesDB.findOne({ propertyID });
        if (!existing) return res.status(404).json({ success: false, message: 'Property not found' });

        // Prevent overwriting the generated propertyID or createAt
        delete updates.propertyID;
        delete updates.createAt;

        const setObj = { ...updates, updatedAt: +new Date() };
        if (updates.price)        setObj.priceNumber       = parseFloat(updates.price);
        if (updates.area)         setObj.areaNumber        = parseFloat(updates.area);
        if (updates.areaCarpet)   setObj.areaCarpetNumber  = parseFloat(updates.areaCarpet);
        if (updates.floorNumber)  setObj.floorNumberNumber = parseFloat(updates.floorNumber);
        if (updates.coveredParking) setObj.coveredParking  = parseFloat(updates.coveredParking);

        await propertiesDB.updateOne({ propertyID }, { $set: setObj });

        return res.json({ success: true, message: 'Property updated successfully!', data: { propertyID } });
    } catch (error) {
        console.error('updateProperty error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.getMyProperties = async (req, res) => {
    try {
        const userId = req.user._id;
        const { sortField, sortType, limitList } = req.body || {};

        const sortQuery = {};
        sortQuery[sortField || 'updatedAt'] = sortType || -1;
        const limitQuery = limitList || 20;

        const propertiesDB = db.get().collection('properties');
        const data = await propertiesDB
            .find({ createdBy: userId, isDeleted: { $ne: true } })
            .sort(sortQuery)
            .limit(limitQuery)
            .toArray();

        return res.json({ success: true, message: 'My properties fetched successfully!', data });
    } catch (error) {
        console.error('getMyProperties error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.getTrending = async (req, res) => {
    try {
        const propertyID = 'not-yet-final-sale-2-jp-nagar-phase-2-postalcode-5600078-2142025-1739511517324';
        return res.json({
            success: true,
            message: 'Trending fetched successfully!',
            data: [
                { link: `/trending/${propertyID}`, text: 'DLF Limited' },
                { link: `/trending/${propertyID}`, text: 'Oberoi Realty' },
                { link: `/trending/${propertyID}`, text: 'L&T Realty' },
            ],
        });
    } catch (error) {
        console.error('getTrending error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.searchProperties = async (req, res) => {
    try {
        const { text } = req.body;
        const slug = string_to_slug(text || '');
        const propertiesDB = db.get().collection('properties');
        const data = await propertiesDB
            .find(
                { propertyID: { $regex: slug, $options: 'i' }, isDeleted: { $ne: true } },
                { projection: { title: 1, location: 1, postalCode: 1, city: 1, propertyID: 1, _id: 0 } }
            )
            .toArray();

        return res.json({ success: true, message: 'Search results fetched successfully!', data });
    } catch (error) {
        console.error('searchProperties error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.toggleShortlist = async (req, res) => {
    try {
        const { propertyID } = req.body;
        if (!propertyID) return res.status(400).json({ success: false, message: 'Missing propertyID' });

        const userAccountsDB = db.get().collection('userAccounts');
        const user = await userAccountsDB.findOne(
            req.user.mobile ? { mobile: req.user.mobile } : { _id: ObjectID(req.user._id) }
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const saved = Array.isArray(user.savedProperties) ? user.savedProperties : [];
        const alreadySaved = saved.includes(propertyID);
        const update = alreadySaved
            ? { $pull: { savedProperties: propertyID } }
            : { $addToSet: { savedProperties: propertyID } };

        await userAccountsDB.updateOne(
            req.user.mobile ? { mobile: req.user.mobile } : { _id: ObjectID(req.user._id) },
            update
        );

        // Notify property owner when a user adds their listing to shortlist
        if (!alreadySaved) {
            try {
                const prop = await db.get().collection('properties').findOne(
                    { propertyID },
                    { projection: { title: 1, createdBy: 1 } }
                );
                if (prop?.createdBy && String(prop.createdBy) !== String(req.user._id)) {
                    const io = getIo();
                    if (io) {
                        io.to(`realestate_${prop.createdBy}`).emit('realestate:shortlisted', {
                            propertyID,
                            title: prop.title,
                            shortlistedAt: new Date().toISOString(),
                        });
                    }
                }
            } catch (_) { /* non-critical */ }
        }

        return res.json({
            success: true,
            message: alreadySaved ? 'Removed from shortlist' : 'Added to shortlist',
            data: { shortlisted: !alreadySaved, propertyID },
        });
    } catch (error) {
        console.error('toggleShortlist error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.getShortlisted = async (req, res) => {
    try {
        const userAccountsDB = db.get().collection('userAccounts');
        const user = await userAccountsDB.findOne(
            req.user.mobile ? { mobile: req.user.mobile } : { _id: ObjectID(req.user._id) }
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const savedIds = Array.isArray(user.savedProperties) ? user.savedProperties : [];
        if (!savedIds.length) return res.json({ success: true, message: 'No shortlisted properties', data: [] });

        const propertiesDB = db.get().collection('properties');
        const data = await propertiesDB
            .find({ propertyID: { $in: savedIds }, isDeleted: { $ne: true } })
            .sort({ updatedAt: -1 })
            .toArray();

        return res.json({ success: true, message: 'Shortlisted properties fetched successfully!', data });
    } catch (error) {
        console.error('getShortlisted error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};

exports.deleteProperty = async (req, res) => {
    try {
        const { propertyID } = req.body;
        if (!propertyID) return res.status(400).json({ success: false, message: 'Missing propertyID' });

        const propertiesDB = db.get().collection('properties');
        const existing = await propertiesDB.findOne({ propertyID, isDeleted: { $ne: true } });
        if (!existing) return res.status(404).json({ success: false, message: 'Property not found' });

        // Ownership check — only the creator can delete
        if (String(existing.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorised to delete this property' });
        }

        await propertiesDB.updateOne(
            { propertyID },
            { $set: { isDeleted: true, deletedAt: +new Date() } }
        );

        return res.json({ success: true, message: 'Property deleted successfully!', data: { propertyID } });
    } catch (error) {
        console.error('deleteProperty error:', error);
        return res.status(400).json({ success: false, message: error.message || String(error) });
    }
};
