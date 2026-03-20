const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.getUserOrders = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please log in.' 
      });
    }
    
    // Get the user ID from authenticated request
    const userId = req.user.id || req.user._id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid user authentication.' 
      });
    }
    
    // Find all orders for this user, sorted by creation date (newest first)
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    
    // If no orders found
    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
        orderCounts: {
          toPay: 0,
          toShip: 0,
          toDeliver: 0,
          toRate: 0
        }
      });
    }
    
    // Get all order IDs
    const orderIds = orders.map(order => order._id);
    
    // Find all reviews created by this user for these orders
    const reviews = await Review.find({
      user: userId,
      order: { $in: orderIds }
    }).lean();
    
    // Create a map of order IDs to reviews
    const orderReviewMap = {};
    reviews.forEach(review => {
      const orderIdStr = review.order.toString();
      orderReviewMap[orderIdStr] = review;
    });
    
    // Add isRated flag to each order
    const ordersWithRatingInfo = orders.map(order => {
      const orderIdStr = order._id.toString();
      // Check if there's a review for this order
      const hasReview = orderReviewMap[orderIdStr] ? true : false;
      
      return {
        ...order,
        isRated: hasReview
      };
    });
    
    // Calculate order counts for different statuses
    const orderCounts = {
      toPay: 0,
      toShip: 0,
      toDeliver: 0,
      toRate: 0
    };
    
    ordersWithRatingInfo.forEach(order => {
      // Handle case variations and typos in status
      const status = (order.orderStatus || '').toLowerCase();
      
      // Count orders by status
      if (status.includes('process') || status.includes('pending')) {
        orderCounts.toPay++;
      } else if (status.includes('confirm')) {
        orderCounts.toShip++;
      } else if (status.includes('ship')) {
        orderCounts.toDeliver++;
      } else if (status.includes('deliver') && !order.isRated) {
        orderCounts.toRate++;
      }
    });
    
    res.status(200).json({
      success: true,
      orders: ordersWithRatingInfo,
      orderCounts
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders', 
      error: error.message 
    });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });

    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      users,
      stats: {
        total:    users.length,
        active:   users.filter(u => u.status === 'active').length,
        inactive: users.filter(u => u.status === 'deactivated').length,
        admins:   users.filter(u => u.role === 'admin').length,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users.', error: error.message });
  }
};

// Update user status ('active' | 'deactivate') 
exports.updateUserStatus = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });

    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'deactivated'].includes(status))
      return res.status(400).json({ success: false, message: 'Status must be "active" or "deactivated".' });

    if (userId === (req.user.id || req.user._id).toString())
      return res.status(400).json({ success: false, message: 'You cannot change your own status.' });

    const user = await User.findByIdAndUpdate(userId, { status }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.status(200).json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
      user,
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status.', error: error.message });
  }
};

// Update user role ('user' | 'admin') 
exports.updateUserRole = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });

    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ success: false, message: 'Role must be "user" or "admin".' });

    if (userId === (req.user.id || req.user._id).toString())
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.status(200).json({ success: true, message: `Role updated to "${role}" successfully.`, user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Failed to update role.', error: error.message });
  }
};