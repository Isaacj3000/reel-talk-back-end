const express = require('express');
const verifyToken = require('../middleware/verify-token');
const Reel = require('../models/reel');
const router = express.Router();

router.post('/', verifyToken, async(req, res) => {
    try {
        req.body.author = req.user._id;
        const reel = await Reel.create(req.body);
        reel._doc.author = req.user;
        res.status(201).json({ reel });
    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});
router.post('/:reelId/comments', verifyToken, async(req, res) => {
    try {
        req.body.author = req.user._id;
        const reel = await Reel.findById(req.params.reelId);
        reel.comments.push(req.body);
        await reel.save();

        const newComment = reel.comments[reel.comments.length - 1];

        newComment._doc.author = req.user;
        res.status(201).json(newComment);
    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});

router.get('/', verifyToken, async(req, res) => {
    try {
        const reels = await Reel.find({})
        .populate("author")
        .sort({ createdAt: "desc" });
        res.status(200).json(reels);
    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});

router.get('/:reelId', verifyToken, async(req, res) => {
    try {
        // populate authore of hoot and comments
        const reel = await Reel.findById(req.params.reelId).populate([
            "author",
            "comments.author",
        ]);
        res.status(200).json(reel);
    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});

// router.put('/:reelId', verifyToken, async(req, res) => {
//     try {
//         //Find the reel
//         const reel = await Reel.findByIdAndUpdate(req.params.reelId);

//         //check permissions
//         if (!reel.author.equals(req.user._id)) {
//             return res.status(403).json({ err: "You're not allowed to update this reel" });
//         }

//         //Update the reel
//         const updatedReel = await Reel.findByIdAndUpdate(
//             req.params.reelId,
//             req.body,
//             { new: true }
//         );

//         // Append req.user to the author property:
//         updatedReel._doc.author = req.user;

//         // Issue JSON response
//         res.status(200).json(updatedReel);
//     } catch (err) {
//         res.status(500).json({ err: err.message });
//     }
router.put('/:reelId', verifyToken, async (req, res) => {
    try {
        // Find the reel first
        const reel = await Reel.findById(req.params.reelId);

        if (!reel) return res.status(404).json({ err: "Reel not found" });

        //Check if the user is the owner
        if (!reel.author.equals(req.user._id)) {
            return res.status(403).json({ err: "You're not allowed to update this reel" });
        }

        //Update the reel (only if user is authorized)
        const updatedReel = await Reel.findByIdAndUpdate(
            req.params.reelId,
            req.body,
            { new: true }
        ).populate("author"); // ✅ Populating author for response

        updatedReel._doc.author = req.user; // ✅ Attach user details manually

        res.status(200).json(updatedReel);
    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});
router.put('/:reelId/comments/:commentId', verifyToken, async(req, res) => {
    try {
     const reel = await Reel.findById(req.params.reelId);
     const comment = reel.comments.id(req.params.commentId);

     // ensures the current user is the author of the comment
        if (comment.author.toString() !== req.user._id) {
            return res
                .status(403)
                .json({ message: "You're not allowed to update this comment" });
        }

        comment.text = req.body.text;
        await reel.save();
        res.status(200).json({ message: "Comment updated successfully" });
    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});

router.delete('/:reelId', verifyToken, async(req, res) => {
    try {
        const reel = await Reel.findById(req.params.reelId);

        if (!reel.author.equals(req.user._id)) {
            return res.status(403).json({ err: "You're not allowed to delete this reel" });
        }
        // Delete the reel
        const deletedReel = await Reel.findByIdAndDelete(req.params.reelId);
        res.status(200).json(deletedReel);
    } catch (err) {
        res.status(500).json({ err: err.message });
    }
});
router.delete('/:reelId/comments/:commentId', verifyToken, async(req, res) => {
    try {
        const reel = await Reel.findById(req.params.reelId);
        const comment = reel.comments.id(req.params.commentId);

        // ensures the current user is the author of the comment 
        if (comment.author.toString() !== req.user._id) {
            return res
                .status(403)
                .json({ message: "You're not allowed to edit this comment" });
        }
            reel.comments.remove({ _id: req.params.commentId });
            await reel.save();
            res.status(200).json({ message: "Comment deleted successfully" });
    } catch (err) {
        res.status(500).json({ err: err.message });
        
    }
});

module.exports = router;