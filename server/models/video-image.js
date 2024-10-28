// models/passenger.js
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const videoImageSchema = new mongoose.Schema({
    entrepreneurId: {
        type: ObjectId,
        ref: 'Entrepreneur',
        required: [true, 'Entrepreneur id is missing'],
    },
    logoBanner: {
        type: [String],
        required: [true, 'banner image is required'],
    },
    video: {
        type: [String],
        required: [true, 'video is required']
    },
}, { timestamps: true });

module.exports = mongoose.model('VideoImage', videoImageSchema);
