const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
        },
        author: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    { timestamps: true }
);

const reelSchema = new mongoose.Schema(
    {
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    text: {
        type: String,
        required: true,
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [commentSchema],

    },
    { timestamps: true }
);
const Reel = mongoose.model('Reel', reelSchema);

module.exports = Reel;