const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ err: "Access Denied. No token provided." });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        console.log('JWT Payload:', verified); // Log the payload structure

        // Handle nested payload structure
        const userId = verified.payload?._id || verified._id;
        if (!userId) {
            console.error('No user ID found in token payload');
            return res.status(401).json({ err: "Invalid token structure." });
        }

        // Fetch complete user data from database
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found in database:', userId);
            return res.status(401).json({ err: "User not found." });
        }

        // Attach complete user data to request
        req.user = user;
        next();
    } catch (err) {
        console.error("🔥 JWT Verification Error:", err);
        res.status(400).json({ err: "Invalid token." });
    }
};

module.exports = verifyToken;