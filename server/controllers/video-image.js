const VideoImage = require("../models/video-image");
const Entrepreneur = require("../models/entrepreneur");
const Company = require("../models/company");
const upload = require("../../utils/multer");
const { Response } = require("../../utils/response");
const fs = require("fs");
const path = require("path");

// Add a new video or images
exports.upload = (req, res, next) => {
  // Limit to 5 images and 1 video
  upload.fields([
    { name: "logoBanner", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      Response(
        res,
        400,
        "Something went wrong during media uploading...",
        err.message
      );
      return;
    }

    const { companyId } = req.body;

    try {
      let logoBanner = req.files.logoBanner
        ? req.files.logoBanner.map(file => `/uploads/${file.filename}`)
        : [];

      let video = req.files.video
        ? req.files.video.map(file => `/uploads/${file.filename}`)
        : [];

      const media = new VideoImage({
        companyId,
        logoBanner,
        video,
      });

      await media.save();
      Response(res, 201, "Media uploaded successfully", media);
    } catch (error) {
      Response(res, 500, "Server Error during media upload", error.message);
    }
  });
};

// Get all media
exports.getAll = async (req, res) => {
  try {
    const media = await VideoImage.find();
    Response(res, 200, "Media fetched successfully", media);
  } catch (error) {
    Response(res, 500, "Error fetching media", error.message);
  }
};

// Get Entrepreneur Media
exports.getEntrepreneurMedia = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the entrepreneur and fetch their email
    const entrepreneur = id ? await Entrepreneur.findById(
      id,
      { _id: 1, email: 1 }
    ) : await Entrepreneur.find();

    if (!entrepreneur) {
      return Response(res, 404, "Entrepreneur not found");
    }

    // Find all companies associated with the entrepreneur
    const companies = id ? await Company.find(
      { entrepreneurId: entrepreneur._id },
      { _id: 1, pitchTitle: 1 }
    ): await Company.find();

    if (!companies.length) {
      return Response(res, 404, "No companies found for this entrepreneur");
    }

    // Extract company IDs
    const companyIds = companies.map((company) => company._id);

    // Fetch videoImages and populate the companyId field with pitchTitle
    const videoImages = await VideoImage.find({ companyId: { $in: companyIds } })
      .populate({
        path: "companyId",
        select: "pitchTitle", // Only include pitchTitle
      });

    // Format the response to include pitchTitle and entrepreneur email
    const formattedMedia = videoImages.map((doc) => ({
      ...doc.toObject(),
      pitchTitle: doc.companyId?.pitchTitle || null,
      entrepreneurEmail: entrepreneur.email,
      companyId: undefined, // Remove companyId if it's not needed
    }));

    Response(res, 200, "Media Fetched Successfully", formattedMedia);
  } catch (error) {
    console.error(error.message);
    Response(res, 500, "Server Error during Document Fetch", error.message);
  }
};

// Update media by ID
exports.updateById = (req, res) => {
  upload.fields([
    { name: "logoBanner", maxCount: 1 },  // For image upload
    { name: "video", maxCount: 1 },       // For video upload
  ])(req, res, async (err) => {
    if (err) {
      Response(res, 400, err.message, {});
      return;
    }

    try {
      const media = await VideoImage.findById(req.params.id);
      if (!media) {
        Response(res, 404, "Media Not Found", {});
        return;
      }

      // Remove old media files from disk if new ones are uploaded
      if (req.files.logoBanner) {
        media.logoBanner.forEach((image) => {
          const imagePath = path.join(__dirname, '../../uploads', path.basename(image));
          fs.unlink(imagePath, (err) => {
            if (err) console.error('Failed to delete image:', err);
          });
        });
        // Storing new medial files
        media.logoBanner = req.files.logoBanner.map(file => `/uploads/${file.filename}`);
      }

      //   Remove old media video from disk if new one is uploaded
      if (req.files.video) {
        media.video.forEach((video) => {
          const videoPath = path.join(__dirname, '../../uploads', path.basename(video));
          fs.unlink(videoPath, (err) => {
            if (err) console.error('Failed to delete video:', err);
          });
        });

        // Storing new media video
        media.video = req.files.video.map(file => `/uploads/${file.filename}`);
      }

      await media.save();
      Response(res, 200, "Media updated successfully", media);
    } catch (error) {
      Response(res, 500, error.message, {});
    }
  });
};

// Delete media by ID
exports.deleteById = async (req, res) => {
  try {
    const media = await VideoImage.findById(req.params.id);
    if (!media) {
      Response(res, 404, "Media not found", {});
      return;
    }

    // Remove media files from disk
    media.logoBanner.forEach((image) => {
      const imagePath = path.join(__dirname, '../../uploads', path.basename(image));
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Failed to delete image:', err);
      });
    });

    // Remove media video from disk
    media.video.forEach((video) => {
      const videoPath = path.join(__dirname, '../../uploads', path.basename(video));
      fs.unlink(videoPath, (err) => {
        if (err) console.error('Failed to delete video:', err);
      });
    });

    await media.remove();
    Response(res, 200, "Media successfully removed", media);
  } catch (error) {
    Response(res, 500, "Error during media removal", error.message);
  }
};
