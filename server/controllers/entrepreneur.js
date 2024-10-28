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

        let {
            fullName,
            email,
            phoneNumber,
            profilePicture,
            location,
            industry,
            Bios,
            skills
        } = req.body;

        try {
            const { role, status, _id } = await User.findOne({ email }, { role: 1, status: 1, _id: 1 });
            const entrepreneurEXist = await Entrepreneur.findOne({ email });
            if (entrepreneurEXist) {
                return Response(res, 403, "Entrepreneur with this email already exists", {});
            }

            // profilePicture = `/uploads/${req.file.path.split('/uploads')[1]}`;
            profilePicture = `/uploads/${req.file.filename}`;

            let entrepreneur = new Entrepreneur({
                fullName,
                email,
                phoneNumber,
                profilePicture,
                location,
                industry,
                Bios,
                skills
            });

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

// Update investor by ID
exports.updateById = (req, res) => {
    upload.fields([
        { name: "profilePicture", maxCount: 1 },  // For image upload
    ])(req, res, async (err) => {
        if (err) {
            return Response(res, 400, "Error during profile picture upload", {});
        }

        const {
            fullName,
            email,
            phoneNumber,
            location,
            industry,
            Bios,
            skills
        } = req.body;

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
                // entrepreneur.profilePicture = req.files.profilePicture.map(file => `/uploads${file.path.split('/uploads')[1]}`);
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
        const data = await Entrepreneur.aggregate([
            {
                $lookup: {
                    from: 'companies',
                    localField: '_id',
                    foreignField: 'entrepreneurId',
                    as: 'companies',
                },
            },
            {
                $lookup: {
                    from: 'documents',
                    localField: '_id',
                    foreignField: 'entrepreneurId',
                    as: 'documents',
                },
            },
            {
                $lookup: {
                    from: 'videoimages',
                    localField: '_id',
                    foreignField: 'entrepreneurId',
                    as: 'videoImages',
                },
            },
        ]);

        Response(res, 200, "Entrepreneur Fetch Successfully", data);
    } catch (error) {
        Response(res, 500, "Error during find Entrepreneur", error.message);
    }
};