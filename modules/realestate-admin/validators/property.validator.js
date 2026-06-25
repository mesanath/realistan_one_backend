'use strict';
const { z } = require('zod');

const fileSchema = z.object({
    id: z.string().optional(),
    path: z.string().url('uploadedPaths entry must have a valid URL path').optional(),
}).optional();

const amenitySchema = z.object({
    name: z.string().min(1, 'Amenity name cannot be empty'),
    count: z.number().int().min(0).optional(),
});

const furnishingSchema = z.object({
    name: z.string().min(1, 'Furnishing name cannot be empty'),
    count: z.number().int().min(0).optional(),
});

exports.addPropertySchema = z.object({
    title: z.string({ required_error: 'title is required' }).min(1, 'title cannot be empty'),
    listingType: z.enum(['Sell', 'Rent'], { required_error: 'listingType is required', invalid_type_error: 'listingType must be "Sell" or "Rent"' }),
    houseType: z.string({ required_error: 'houseType is required' }).min(1, 'houseType cannot be empty'),
    location: z.string({ required_error: 'location is required' }).min(1, 'location cannot be empty'),
    postalCode: z.string({ required_error: 'postalCode is required' }).min(1, 'postalCode cannot be empty'),

    area: z.string().optional(),
    areaCarpet: z.string().optional(),
    price: z.string().optional(),
    city: z.string().optional(),
    buildingType: z.string().optional(),
    propertyType: z.string().optional(),
    possessionStatus: z.string().optional(),
    bathsType: z.string().optional(),
    aboutProperty: z.string().optional(),
    additionalRooms: z.string().optional(),
    transactionType: z.string().optional(),
    furnishingStatus: z.string().optional(),
    ageProperty: z.string().optional(),
    coveredParking: z.string().optional(),
    balcony: z.string().optional(),
    powerBackup: z.string().optional(),
    facing: z.string().optional(),
    view: z.string().optional(),
    flooring: z.string().optional(),
    totalFloorCount: z.string().optional(),
    floorNumber: z.string().optional(),
    towerBlock: z.string().optional(),
    landmarkEducationInstitute: z.string().optional(),
    landmarkTransportation: z.string().optional(),
    landmarkShoppingCenter: z.string().optional(),
    landmarkHospital: z.string().optional(),
    landmarkCommercialHub: z.string().optional(),
    propertyDescription: z.string().optional(),
    uploadedPaths: z.array(fileSchema).optional(),
    amenitiesDetails: z.array(amenitySchema).optional(),
    furnishingDetails: z.array(furnishingSchema).optional(),
});

exports.editPropertySchema = z.object({
    area: z.string().optional(),
    areaCarpet: z.string().optional(),
    price: z.string().optional(),
    city: z.string().optional(),
    buildingType: z.string().optional(),
    propertyType: z.string().optional(),
    possessionStatus: z.string().optional(),
    bathsType: z.string().optional(),
    aboutProperty: z.string().optional(),
    additionalRooms: z.string().optional(),
    transactionType: z.string().optional(),
    furnishingStatus: z.string().optional(),
    ageProperty: z.string().optional(),
    coveredParking: z.string().optional(),
    balcony: z.string().optional(),
    powerBackup: z.string().optional(),
    facing: z.string().optional(),
    view: z.string().optional(),
    flooring: z.string().optional(),
    totalFloorCount: z.string().optional(),
    floorNumber: z.string().optional(),
    towerBlock: z.string().optional(),
    landmarkEducationInstitute: z.string().optional(),
    landmarkTransportation: z.string().optional(),
    landmarkShoppingCenter: z.string().optional(),
    landmarkHospital: z.string().optional(),
    landmarkCommercialHub: z.string().optional(),
    propertyDescription: z.string().optional(),
    uploadedPaths: z.array(fileSchema).optional(),
    amenitiesDetails: z.array(amenitySchema).optional(),
    furnishingDetails: z.array(furnishingSchema).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Request body cannot be empty' });

exports.propertyIDParamSchema = z.object({
    propertyID: z.string({ required_error: 'propertyID param is required' }).min(1, 'propertyID cannot be empty'),
});
