const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ err: "Access Denied. No token provided." });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.error("🔥 JWT Verification Error:", err);
        res.status(400).json({ err: "Invalid token." });
    }
};

module.exports = verifyToken;