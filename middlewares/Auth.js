const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.isAuthenticatedUser = async (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Login first to access this resource' });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch the user using the decoded id
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Attach user and user._id to the request object
        req.user = user;
        req.userId = user._id;

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error("Error verifying token:", error);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};