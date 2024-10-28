const { Response } = require('../../utils/response');
const industryInterest = require('../models/industry-interest');
const IndustryInterest = require('../models/industry-interest');

// Add or update industry interests for a user
exports.create = async (req, res) => {
    try {
        const { industries } = req.body;

        // Validate that the industries are provided as an array
        if (!Array.isArray(industries) || industries.length === 0) {
            Response(res, 400, 'At least one industry must be selected.', {});
            // return res.status(400).json({ message: 'At least one industry must be selected.' });
        }

        // just push new-JSON keywords
        const isSchemaExist = await IndustryInterest.find();
        if (isSchemaExist.length > 0) {
            const updateResult = await IndustryInterest.updateMany(
                {}, // Update all matching documents
                { $set: { industries: ["technology", "finance", "healthcare"] } }
            );

            console.log(`${updateResult.modifiedCount} documents updated.`);
        }
        else {
            // Create new new-JSON
            const newInterest = new IndustryInterest({ industries });
            await newInterest.save();
        }
        Response(res, 201, 'Industry interests keyword added successfully', {});
        // return res.status(201).json({ message: 'Industry interests keyword added successfully', newInterest });
    } catch (error) {
        console.error('Error adding/updating industry interest:', error);
        Response(res, 500, 'Internal Server Error', error.message);

        // res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

exports.getAll = async (req, res) => {
    try {

        let interest = await IndustryInterest.find();
        if (!interest) {
            Response(res, 400, 'No industry interests found for this user.', {});
            // return res.status(404).json({ message: 'No industry interests found for this user.' });
        }
        interest = interest[0].industries;
        Response(res, 200, {}, interest);
        // res.status(200).json({ message: 'Industry interests fetched successfully.', interest });
    } catch (error) {
        console.error('Error fetching industry interest:', error);
        Response(res, 400, 'Internal Server Error', error.message);
    }
};
