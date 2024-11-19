const mongoose = require('mongoose');
const Entrepreneur = require("../models/entrepreneur");
const Document = require("../models/document");
const Company = require("../models/company");
const upload = require("../../utils/multer");
const { Response } = require("../../utils/response");
const fs = require("fs");
const path = require("path");

// Add a new document
exports.upload = (req, res, next) => {
    upload.array("documents", 20)(req, res, async (err) => {
        if (err) {
            Response(res, 400, "Something went wrong during document upload...", err.message);
        }
        const { companyId, title } = req.body;
        try {
            const docFind = await Document.findOne({ title });
            if (docFind) {
                Response(res, 403, "Document with this title already exists. Try with a different title", {});
            } else {
                const document = new Document({
                    companyId,
                    title,
                    documents: req.files.map((file) => `/uploads/${file.filename}`),
                });
                await document.save();
                Response(res, 201, "Document Registered Successfully", document);
            }
        } catch (error) {
            Response(res, 500, "Server Error during Document Registration", error.message);
        }
    });
};

// Get all documents
exports.getAll = async (req, res) => {
    try {
        // const documents = await Document.find().populate('entrepreneurId');
        const documents = await Document.find()
            .populate({
                path: "companyId",
                select: "pitchTitle entrepreneurId",
                populate: {
                    path: "entrepreneurId",
                    select: "email", // Fetch the email field from the Entrepreneur collection
                },
            });

        Response(res, 200, "Documents Fetched Successfully", documents);
    } catch (error) {
        Response(res, 500, "Server Error during Document Fetch", error.message);
    }
};

exports.getEntrepreneurDocs = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the entrepreneur and fetch their email
        const entrepreneur = id ? await Entrepreneur.findById(
            id,
            { _id: 1, email: 1 }
        ): await Entrepreneur.find();

        if (!entrepreneur) {
            return Response(res, 404, "Entrepreneur not found");
        }

        // Find all companies associated with the entrepreneur
        const companies = id ? await Company.find(
            { entrepreneurId: entrepreneur._id },
            { _id: 1, pitchTitle: 1 }
        ) : await Company.find();

        if (!companies.length) {
            return Response(res, 404, "No companies found for this entrepreneur");
        }

        // Extract company IDs
        const companyIds = companies.map((company) => company._id);

        // Fetch documents and populate the companyId field with pitchTitle
        const documents = await Document.find({ companyId: { $in: companyIds } })
            .populate({
                path: "companyId",
                select: "pitchTitle", // Only include pitchTitle
            });

        // Format the response to include pitchTitle and entrepreneur email
        const formattedDocuments = documents.map((doc) => ({
            ...doc.toObject(),
            pitchTitle: doc.companyId?.pitchTitle || null,
            entrepreneurEmail: entrepreneur.email,
            companyId: undefined, // Remove companyId if it's not needed
        }));

        Response(res, 200, "Documents Fetched Successfully", formattedDocuments );
    } catch (error) {
        console.error(error.message);
        Response(res, 500, "Server Error during Document Fetch", error.message);
    }
};

// Update media by ID
exports.updateById = (req, res) => {
    upload.fields([
        { name: "documents", maxCount: 5 },  // For image upload
    ])(req, res, async (err) => {
        if (err) {
            Response(res, 400, err.message, {});
            return;
        }

        const { title } = req.body;
        console.log(title, req.files.documents);

        try {
            const document = await Document.findById(req.params.id);
            if (!document) {
                Response(res, 404, "Document Not Found", {});
                return;
            }

            // Remove old document files from disk if new ones are uploaded
            if (req.files.documents) {
                document.documents.forEach((image) => {
                    const imagePath = path.join(__dirname, '../../uploads', path.basename(image));
                    fs.unlink(imagePath, (err) => {
                        if (err) console.error('Failed to delete image:', err);
                    });
                });
                // Storing new medial files
                // document.documents = req.files.documents.map(file => `/uploads${file.path.split('/uploads')[1]}`);
                document.documents = req.files.documents.map(file => `/uploads/${file.filename}`);
            }

            document.title = title || document.title;

            await document.save();
            Response(res, 200, "Media updated successfully", document);
        } catch (error) {
            Response(res, 500, error.message, {});
        }
    });
};

// Delete a document by ID
exports.deleteById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            Response(res, 404, "Document Not Found", {});
            return;
        }

        // Remove documents from disk
        document.documents.forEach((docPath) => {
            const fileName = path.basename(docPath);
            const docFilePath = path.join(__dirname, '../../uploads', fileName);

            // Check if file exists before attempting to delete
            fs.access(docFilePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error("File does not exist:", docFilePath);
                } else {
                    // Async file deletion
                    fs.unlink(docFilePath, (err) => {
                        if (err) {
                            console.error("Failed to delete document:", err);
                        } else {
                            console.log("Successfully deleted document:", docFilePath);
                        }
                    });
                }
            });
        });

        await document.remove();
        Response(res, 200, "Document Removed Successfully", document);
    } catch (error) {
        Response(res, 500, "Error during Document Removal", error.message);
    }
};
