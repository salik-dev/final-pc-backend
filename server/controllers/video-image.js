const VideoImage = require("../models/video-image");
const upload = require("../../utils/multer");
const { Response } = require("../../utils/response");
const fs = require("fs");
const path = require("path");

// Add a new video or images
exports.upload = (req, res, next) => {
  // Limit to 5 images and 1 video
  upload.fields([
    { name: "logoBanner", maxCount: 1 },  // For image upload
    { name: "video", maxCount: 1 },       // For video upload
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

    const { entrepreneurId } = req.body;

    try {
      // let logoBanner = req.files.logoBanner
      //   ? req.files.logoBanner.map(file => `/uploads${file.path.split('/uploads')[1]}`)
      //   : [];

        let logoBanner = req.files.logoBanner
        ? req.files.logoBanner.map(file => `/uploads/${file.filename}`)
        : [];

        // let video = req.files.video
        // ? req.files.video.map(file => `/uploads${file.path.split('/uploads')[1]}`)
        // : [];

        let video = req.files.video
        ? req.files.video.map(file => `/uploads/${file.filename}`)
        : [];

      const media = new VideoImage({
        entrepreneurId,
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

    const { entrepreneurId } = req.body;

    try {
      const media = await VideoImage.findById(req.params.id);
      if (!media) {
        Response(res, 404, "Media Not Found", {});
        return;
      }
      console.log(entrepreneurId, req.files.logoBanner, req.files.video);

      // Remove old media files from disk if new ones are uploaded
      if (req.files.logoBanner) {
        media.logoBanner.forEach((image) => {
          const imagePath = path.join(__dirname, '../../uploads', path.basename(image));
          fs.unlink(imagePath, (err) => {
            if (err) console.error('Failed to delete image:', err);
          });
        });
        // Storing new medial files
        // media.logoBanner = req.files.logoBanner.map(file => `/uploads${file.path.split('/uploads')[1]}`);
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
        // media.video = req.files.video.map(file => `/uploads${file.path.split('/uploads')[1]}`);
        media.video = req.files.video.map(file => `/uploads/${file.filename}`);
      }

      media.entrepreneurId = entrepreneurId;
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
