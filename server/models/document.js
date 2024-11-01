// models/passenger.js
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const additionalDocSchema = new mongoose.Schema({
    entrepreneurId: {
        type: ObjectId,
        ref: 'Entrepreneur',
        required: true,
    },
    title: {
        type: String,
        required: [true, "title is required"],
        unique: true,
    },
    documents: [String],
}, { timestamps: true });

module.exports = mongoose.model('Document', additionalDocSchema);
