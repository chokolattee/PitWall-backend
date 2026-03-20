const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');

exports.addToWishlist = async (req, res) => {
    try {
      const { userId, productId } = req.body;
      
      console.log('Adding to wishlist:', { userId, productId });
      
      // Validate inputs
      if (!userId || !productId) {
        return res.status(400).json({ message: 'Missing userId or productId' });
      }
      
      // Validate MongoDB ObjectID format
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid userId or productId format' });
      }
      
      // Check if the product is already in the wishlist
      const existingWishlist = await Wishlist.findOne({ userId, productId });
      if (existingWishlist) {
        return res.status(400).json({ message: 'Product already in wishlist' });
      }
      
      // Create a new wishlist item
      const newWishlistItem = new Wishlist({ userId, productId });
      const savedItem = await newWishlistItem.save();
      
      console.log('Wishlist item saved successfully:', savedItem);
      res.status(201).json(savedItem);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      
      // Handle duplicate key error specifically
      if (error.name === 'MongoError' && error.code === 11000) {
        return res.status(400).json({ message: 'Product already in wishlist' });
      }
      
      res.status(500).json({ message: 'Internal server error', details: error.message });
    }
};

exports.getWishlist = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the wishlist for the user
    const wishlist = await Wishlist.find({ userId }).populate('productId');
    res.status(200).json(wishlist);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.removeFromWishlist = async (req, res) => {
    try {
      // Get productId from route parameter
      const productId = req.params.id;
      
      // Since you don't have req.user available, you need to get userId from request body or query
      // Option 1: Get it from query parameters
      let userId = req.query.userId;
      
      // Alternative Option 2: If you're sending it in the request body (would need to change route method to POST or use body-parser for DELETE)
      if (!userId && req.body && req.body.userId) {
        userId = req.body.userId;
      }
      
      // Make sure we have both IDs
      if (!userId || !productId) {
        return res.status(400).json({ message: 'Missing userId or productId' });
      }
      
      console.log('Removing from wishlist:', { userId, productId });
      
      // Find and remove the wishlist item
      const result = await Wishlist.findOneAndDelete({ userId, productId });
      
      if (!result) {
        return res.status(404).json({ message: 'Product not found in wishlist' });
      }
      
      console.log('Successfully removed item from wishlist');
      res.status(200).json({ message: 'Product removed from wishlist' });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

exports.clearWishlist = async (req, res) => {
  const { userId } = req.params;

  try {
    // Clear the wishlist for the user
    await Wishlist.deleteMany({ userId });
    res.status(200).json({ message: 'Wishlist cleared' });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.checkWishlist = async (req, res) => {
    const { userId, productId } = req.body;
    try {
      const existingWishlist = await Wishlist.findOne({ userId, productId });
    
      res.status(200).json({ exists: existingWishlist ? true : false });
    } catch (error) {
      console.error('Error checking wishlist:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };