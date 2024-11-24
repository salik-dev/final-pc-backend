const User = require('../models/user');
const Entrepreneur = require("../models/entrepreneur");
const upload = require("../../utils/multer");
const { Response } = require("../../utils/response");
const fs = require("fs");
const path = require("path");

// Add a new investor
exports.create = (req, res, next) => {
    upload.single("profilePicture")(req, res, async (err) => {
        if (err) {
            return Response(res, 400, "Error during profile picture upload", err.message);
        }
        let { fullName, email, phoneNumber, profilePicture, location, industry, Bios, skills } = req.body;

        try {
            const { role, status, _id } = await User.findOne({ email }, { role: 1, status: 1, _id: 1 });
            const entrepreneurEXist = await Entrepreneur.findOne({ email });
            if (entrepreneurEXist) {
                return Response(res, 403, "Entrepreneur with this email already exists", {});
            }
            profilePicture = `/uploads/${req.file.filename}`;
            let entrepreneur = new Entrepreneur({ fullName, email, phoneNumber, profilePicture, location, industry, Bios, skills });
            entrepreneur = await entrepreneur.save();
            entrepreneur = entrepreneur.toObject(); // Convert to plain object
            entrepreneur.role = role;
            entrepreneur.status = status;
            entrepreneur.authId = _id;
            return Response(res, 201, "Entrepreneur Registered Successfully", entrepreneur);
        } catch (error) {
            return Response(res, 500, "Server Error during Entrepreneur Registration", error.message);
        }
    });
};

// Get all investors
exports.getAll = async (req, res) => {
    try {
        const entrepreneur = await Entrepreneur.find();
        return Response(res, 200, "Entrepreneurs Fetched Successfully", entrepreneur);
    } catch (error) {
        return Response(res, 500, "Server Error during Entrepreneur Fetch", error.message);
    }
};

exports.getEntrepreneur = async (req, res) => {
    try {
        const entrepreneurs = await Entrepreneur.find({}, { _id: 1, email: 1 });
        Response(res, 200, "Entrepreneur Fetched Successfully", entrepreneurs);
    } catch (error) {
        Response(res, 500, "Something went wrong during Entrepreneur data fetch", error.message);
    }
}

// Update investor by ID
exports.updateById = (req, res) => {
    upload.fields([
        { name: "profilePicture", maxCount: 1 },  // For image upload
    ])(req, res, async (err) => {
        if (err) {
            return Response(res, 400, "Error during profile picture upload", {});
        }
        const { fullName, email, phoneNumber, location, industry, Bios, skills } = req.body;
        try {
            let entrepreneur = await Entrepreneur.findById(req.params.id);
            if (!entrepreneur) {
                return Response(res, 404, "Entrepreneur Not Found", {});
            }
            const user = await User.findOne({ email }).select("+password");
            // Remove old profile picture from disk if new ones are uploaded
            if (req.files.profilePicture) {
                entrepreneur.profilePicture.forEach((image) => {
                    const imagePath = path.join(__dirname, '../../uploads', path.basename(image));
                    fs.unlink(imagePath, (err) => {
                        if (err) console.error('Failed to delete image:', err);
                    });
                });
                // Storing new medial files
                entrepreneur.profilePicture = req.files.profilePicture.map(file => `/uploads/${file.filename}`);
            }

            entrepreneur.fullName = fullName || entrepreneur.fullName;
            entrepreneur.phoneNumber = phoneNumber || entrepreneur.phoneNumber;
            entrepreneur.location = location || entrepreneur.location;
            entrepreneur.industry = industry || entrepreneur.industry;
            entrepreneur.Bios = Bios || entrepreneur.Bios;
            entrepreneur.skills = skills || entrepreneur.skills;

            entrepreneur = await entrepreneur.save();
            entrepreneur = entrepreneur.toObject(); // Convert to plain object
            entrepreneur.role = user.role;
            entrepreneur.status = user.status;
            entrepreneur.authId = user._id;
            return Response(res, 200, "Entrepreneur Updated Successfully", entrepreneur);
        } catch (error) {
            return Response(res, 500, "Server Error during Entrepreneur Update", error.message);
        }
    });
};

// Delete a document by ID
exports.deleteById = async (req, res) => {
    try {
        const entrepreneur = await Entrepreneur.findById(req.params.id);
        if (!entrepreneur) {
            Response(res, 404, "Entrepreneur Not Found", {});
            return;
        }
        // Remove documents from disk
        entrepreneur.profilePicture.forEach((docPath) => {
            const fileName = path.basename(docPath);
            const profilePicPath = path.join(__dirname, '../../uploads', fileName);

            // Check if file exists before attempting to delete
            fs.access(profilePicPath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error("File does not exist:", profilePicPath);
                } else {
                    // Async file deletion
                    fs.unlink(profilePicPath, (err) => {
                        if (err) {
                            console.error("Failed to delete entrepreneur:", err);
                        } else {
                            console.log("Successfully deleted entrepreneur:", profilePicPath);
                        }
                    });
                }
            });
        });
        await entrepreneur.remove();
        Response(res, 200, "Document Removed Successfully", entrepreneur);
    } catch (error) {
        Response(res, 500, "Error during Document Removal", error.message);
    }
};

exports.findEntrepreneurs = async (req, res) => {
    try {
        const entrepreneurs = await Entrepreneur.aggregate([
            {
                $lookup: {
                    from: 'companies',
                    localField: '_id',
                    foreignField: 'entrepreneurId',
                    as: 'companies',
                },
            },
            {
                $unwind: {
                    path: '$companies',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'documents',
                    localField: 'companies._id',
                    foreignField: 'companyId',
                    as: 'companies.documents',
                },
            },
            {
                $lookup: {
                    from: 'videoimages',
                    localField: 'companies._id',
                    foreignField: 'companyId',
                    as: 'companies.videoImages',
                },
            },
            {
                $group: {
                    _id: '$_id',
                    fullName: { $first: '$fullName' },
                    email: { $first: '$email' },
                    phoneNumber: { $first: '$phoneNumber' },
                    profilePicture: { $first: '$profilePicture' },
                    location: { $first: '$location' },
                    industry: { $first: '$industry' },
                    Bios: { $first: '$Bios' },
                    skills: { $first: '$skills' },
                    companies: { $push: '$companies' },
                },
            },
        ]);
        Response(res, 200, "Entrepreneur Fetch Successfully", entrepreneurs);
    } catch (error) {
        Response(res, 500, "Error during find Entrepreneur", error.message);
    }
};