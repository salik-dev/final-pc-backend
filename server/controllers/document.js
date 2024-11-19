const mongoose = require('mongoose');
const Document = require("../models/document");
const Company = require("../models/document");
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
                    // documents: req.files.map((file) => `/uploads${file.path.split('/uploads')[1]}`),
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
        const {id} = req.params;
        const entrepreneurObjectId = new mongoose.Types.ObjectId(id);
        const companies = await Company.find({entrepreneurId: entrepreneurObjectId}, {_id: 1, pitchTitle: 1 });
        console.log('e data', companies);

        // Extract company IDs from the companies
        const companyIds = companies.map((company) => company._id);

        // Find documents that match the extracted company IDs
        const documents = await Document.find({ companyId: { $in: companyIds } });

        // Respond with the fetched documents
        Response(res, 200, "Documents Fetched Successfully", { companies, documents });
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
