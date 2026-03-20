const Promotion = require('../models/Promotions');
const User = require('../models/User');
const admin = require('../firebase_backend/firebaseAdmin'); 

// Create a new promotion
exports.createPromotion = async (req, res) => {
  try {
    const { product, title, description, discountPercentage, startDate, endDate, imageUrl } = req.body;

    // Validate required fields
    if (!product || !title || !description || !discountPercentage || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const promotion = await Promotion.create({
      product,
      title,
      description,
      discountPercentage,
      startDate,
      endDate,
      imageUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Promotion created successfully',
      promotion,
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create promotion',
      error: error.message,
    });
  }
};

// Get all promotions
exports.getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find().populate('product', 'name price category brand');
    res.status(200).json({
      success: true,
      promotions,
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotions',
      error: error.message,
    });
  }
};

exports.getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id).populate('product', 'name price category brand');
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found',
      });
    }

    res.status(200).json({
      success: true,
      promotion,
    });
  } catch (error) {
    console.error('Error fetching promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotion',
      error: error.message,
    });
  }
};

// Update a promotion
exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, discountPercentage, startDate, endDate, imageUrl } = req.body;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found',
      });
    }

    // Update fields
    if (title) promotion.title = title;
    if (description) promotion.description = description;
    if (discountPercentage) promotion.discountPercentage = discountPercentage;
    if (startDate) promotion.startDate = startDate;
    if (endDate) promotion.endDate = endDate;
    if (imageUrl) promotion.imageUrl = imageUrl;

    await promotion.save();

    res.status(200).json({
      success: true,
      message: 'Promotion updated successfully',
      promotion,
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promotion',
      error: error.message,
    });
  }
};

// Delete a promotion
exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found',
      });
    }

    await promotion.remove();

    res.status(200).json({
      success: true,
      message: 'Promotion deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete promotion',
      error: error.message,
    });
  }
};

const sendFCMNotification = async (fcmToken, title, body, data = {}) => {
    try {
      const message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: typeof data === 'object'
          ? Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]))
          : {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'pitwall-promotions', 
            priority: 'high',
            visibility: 'public',
            sound: 'default',
            defaultSound: true,
            color: '#1976D2',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
          headers: {
            'apns-priority': '10',
          },
        },
      };
  
      const response = await admin.messaging().send(message);
      console.log(`Successfully sent notification: ${response}`);
      return response;
    } catch (error) {
      console.error('Error sending FCM notification:', error);
      throw error;
    }
  };
  
  exports.sendSelectedPromotionNotifications = async (req, res) => {
    try {
      const { promotionIds } = req.body;

      const promotions = await Promotion.find({ _id: { $in: promotionIds } }).populate('product', 'name');
      if (promotions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No promotions found for the given IDs',
        });
      }

      // Fetch users with FCM tokens for push notifications
      const usersWithToken = await User.find(
        { fcmToken: { $exists: true, $ne: null } },
        '_id fcmToken'
      );

      // Prevent duplicate pushes to the same physical device when token is reused.
      const uniqueTokenEntries = [];
      const seenTokens = new Set();
      for (const user of usersWithToken) {
        const token = (user.fcmToken || '').trim();
        if (!token || seenTokens.has(token)) continue;
        seenTokens.add(token);
        uniqueTokenEntries.push({ userId: user._id, token });
      }

      const responses = [];

      for (const promotion of promotions) {
        const title = promotion.title;
        const body  = `${promotion.product.name} is now ${promotion.discountPercentage}% off! ${promotion.description}`;
        const data  = {
          promotionId: promotion._id.toString(),
          productId:   promotion.product._id.toString(),
          type:        'promotion',
          screen:      'PromotionDetails',
        };
        // Persist in-app notification for ALL users (no role filter) 
        const notifDoc = {
          title,
          body,
          type:        'promotion',
          referenceId: promotion._id.toString(),
          productId:   promotion.product._id.toString(),
          timestamp:   new Date(),
          read:        false,
        };
        await User.updateMany(
          {},
          { $push: { notifications: { $each: [notifDoc], $position: 0 } } }
        );

        // Send FCM push once per unique device token
        for (const entry of uniqueTokenEntries) {
          try {
            const response = await sendFCMNotification(entry.token, title, body, data);
            responses.push({ userId: entry.userId, promotionId: promotion._id, success: true, response });
          } catch (error) {
            responses.push({ userId: entry.userId, promotionId: promotion._id, success: false, error: error.message });
          }
        }
      }

      res.status(200).json({
        success: true,
        message: 'Notifications sent for selected promotions',
        results: responses,
      });
    } catch (error) {
      console.error('Error sending promotion notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send promotion notifications',
        error: error.message,
      });
    }
  };

// Get a specific promotion by ID or title
exports.getPromotionByIdOrTitle = async (req, res) => {
    try {
      const { id, title } = req.query;
  
      let promotion;
      if (id) {
        promotion = await Promotion.findById(id).populate('product', 'name price category brand');
      } else if (title) {
        promotion = await Promotion.findOne({ title }).populate('product', 'name price category brand');
      }
  
      if (!promotion) {
        return res.status(404).json({
          success: false,
          message: 'Promotion not found',
        });
      }
  
      res.status(200).json({
        success: true,
        promotion,
      });
    } catch (error) {
      console.error('Error fetching promotion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch promotion',
        error: error.message,
      });
    }
  };