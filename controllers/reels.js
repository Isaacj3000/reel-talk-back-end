const express = require('express');
const verifyToken = require('../middleware/verify-token');
const Reel = require('../models/reel');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/trending', verifyToken, async (req, res) => {
    try {
        console.log("Fetching trending reels...");

        const trendingReels = await Reel.find({})
            .populate("author", "username")
            .populate("comments.author", "username")
            .lean();

        // Sort reels by engagement (likes & comments) with null checks
        trendingReels.sort((a, b) => {
            const aLikes = Array.isArray(a.likes) ? a.likes.length : 0;
            const bLikes = Array.isArray(b.likes) ? b.likes.length : 0;
            const aComments = Array.isArray(a.comments) ? a.comments.length : 0;
            const bComments = Array.isArray(b.comments) ? b.comments.length : 0;
            
            return (bLikes + bComments) - (aLikes + aComments);
        });

        // Return only top 10 trending reels
        const topTrending = trendingReels.slice(0, 10);

        res.status(200).json(topTrending);
    } catch (err) {
        console.error("Error Fetching Trending Reels:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/', verifyToken, async (req, res) => {
    try {
        req.body.author = req.user._id;
        const reel = await Reel.create(req.body);
        await reel.populate("author", "username");  

        res.status(201).json(reel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:reelId/comments', verifyToken, async (req, res) => {
    try {
        req.body.author = req.user._id;
        const reel = await Reel.findById(req.params.reelId);
        if (!reel) return res.status(404).json({ error: "Reel not found" });

        reel.comments.push(req.body);
        await reel.save();

        // Get the updated reel with populated comment authors
        const updatedReel = await Reel.findById(req.params.reelId)
            .populate('comments.author', 'username');
        
        // Get the last comment (the one we just added)
        const newComment = updatedReel.comments[updatedReel.comments.length - 1];

        res.status(201).json(newComment);
    } catch (err) {
        console.error("Error creating comment:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/', verifyToken, async (req, res) => {
    try {
        const reels = await Reel.find({})
            .populate("author", "username")
            .sort({ createdAt: "desc" });

        res.status(200).json(reels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:reelId', verifyToken, async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.reelId)
            .populate("author", "username")
            .populate("comments.author", "username");

        if (!reel) return res.status(404).json({ error: "Reel not found" });

        res.status(200).json(reel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:reelId/like', verifyToken, async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.reelId);
        if (!reel) return res.status(404).json({ error: "Reel not found" });

        const userId = req.user._id;
        const likeIndex = reel.likes.indexOf(userId);

        if (likeIndex === -1) {
            reel.likes.push(userId);
        } else {
            reel.likes.splice(likeIndex, 1);
        }

        await reel.save();
        res.status(200).json(reel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:reelId/comments/:commentId/like', verifyToken, async (req, res) => {
    try {
      const reel = await Reel.findById(req.params.reelId);
      if (!reel) return res.status(404).json({ error: "Reel not found" });
  
      const comment = reel.comments.id(req.params.commentId);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
  
      const userId = req.user._id.toString();
      const hasLiked = comment.likes.includes(userId);
  
      if (hasLiked) {
        // Unlike the comment
        comment.likes.pull(userId);
      } else {
        // Like the comment
        comment.likes.push(userId);
      }
  
      await reel.save();
  
      res.status(200).json({
        message: hasLiked ? "Comment unliked" : "Comment liked",
        likes: comment.likes.length,
        commentId: comment._id,
      });
    } catch (err) {
      console.error("Error liking comment:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  

router.put('/:reelId', verifyToken, async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.reelId);
        if (!reel) return res.status(404).json({ error: "Reel not found" });

        if (!reel.author.equals(req.user._id)) {
            return res.status(403).json({ error: "You're not allowed to update this reel" });
        }

        const updatedReel = await Reel.findByIdAndUpdate(
            req.params.reelId,
            req.body,
            { new: true }
        ).populate("author", "username"); // Keep author populated

        res.status(200).json(updatedReel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:reelId/comments/:commentId', verifyToken, async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.reelId);
        if (!reel) return res.status(404).json({ error: "Reel not found" });

        const comment = reel.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ error: "Comment not found" });

        if (!comment.author.equals(req.user._id)) {
            return res.status(403).json({ error: "You're not allowed to update this comment" });
        }

        comment.text = req.body.text;
        await reel.save();

        // Populate updated comment author
        await reel.populate("comments.author", "username");

        res.status(200).json({ message: "Comment updated successfully", comment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ==============================
DELETE ROUTES (Deleting Reels & Comments)
================================ */
router.delete('/:reelId', verifyToken, async (req, res) => {
    try {
        console.log('\n=== Delete Reel Request ===');
        console.log('Request params:', req.params);
        console.log('Request headers:', {
            authorization: req.headers.authorization ? 'Bearer [HIDDEN]' : 'none',
            'content-type': req.headers['content-type']
        });
        console.log('User from token:', {
            id: req.user._id,
            username: req.user.username
        });

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.reelId)) {
            console.log(' Invalid MongoDB ObjectId:', req.params.reelId);
            return res.status(400).json({ error: "Invalid reel ID format" });
        }

        console.log('🔍 Finding reel with ID:', req.params.reelId);
        const reel = await Reel.findById(req.params.reelId);
        
        if (!reel) {
            console.log(' Reel not found in database');
            return res.status(404).json({ error: "Reel not found" });
        }

        console.log(' Found reel:', {
            id: reel._id,
            author: reel.author,
            title: reel.title
        });

        // Convert both to strings for comparison
        const reelAuthorId = reel.author.toString();
        const userId = req.user._id.toString();
        
        console.log('🔒 Comparing IDs:', {
            reelAuthorId,
            userId,
            match: reelAuthorId === userId
        });

        if (reelAuthorId !== userId) {
            console.log('Authorization failed - user is not the author');
            return res.status(403).json({ error: "You're not allowed to delete this reel" });
        }

        try {
            console.log(' Attempting to delete reel...');
            const deletedReel = await Reel.findByIdAndDelete(req.params.reelId);
            
            if (!deletedReel) {
                console.log(' Delete operation failed - no document found');
                return res.status(500).json({ error: "Failed to delete reel" });
            }

            console.log('Reel deleted successfully');
            res.status(200).json({ message: "Reel deleted successfully" });
        } catch (deleteError) {
            console.error(' MongoDB delete error:', deleteError);
            console.error('Error stack:', deleteError.stack);
            res.status(500).json({ error: "Database error while deleting reel" });
        }
    } catch (err) {
        console.error(' Error in delete route:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:reelId/comments/:commentId', verifyToken, async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.reelId);
        if (!reel) return res.status(404).json({ error: "Reel not found" });

        const comment = reel.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ error: "Comment not found" });

        if (!comment.author.equals(req.user._id)) {
            return res.status(403).json({ error: "You're not allowed to delete this comment" });
        }

        reel.comments.pull({ _id: req.params.commentId });
        await reel.save();
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ==============================
DELETE ALL ROUTE (Admin only)
================================ */
router.delete('/admin/delete-all', verifyToken, async (req, res) => {
    try {
        console.log('\n=== Delete All Reels Request ===');
        console.log('Requested by user:', {
            id: req.user._id,
            username: req.user.username
        });

        // Add a safety check - you can modify this condition based on your needs
        if (req.user.username !== 'ZAzou') {
            console.log('Unauthorized attempt to delete all reels');
            return res.status(403).json({ error: "You're not authorized to perform this action" });
        }

        const result = await Reel.deleteMany({});
        console.log('Delete operation result:', {
            deletedCount: result.deletedCount
        });

        res.status(200).json({ 
            message: "All reels deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Error deleting all reels:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
