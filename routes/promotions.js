const express = require('express');
const router = express.Router();
const {
  createPromotion,
  getAllPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
  sendSelectedPromotionNotifications,
} = require('../controllers/PromotionController');
const { isAuthenticatedUser } = require('../middlewares/Auth');

// Route to create a new promotion
router.post('/create', isAuthenticatedUser, createPromotion);

// Route to fetch all promotions
router.get('/all', isAuthenticatedUser, getAllPromotions);

// Route to fetch a single promotion by ID
router.get('/:id', isAuthenticatedUser, getPromotionById);

// Route to update a promotion by ID
router.put('/update/:id', isAuthenticatedUser, updatePromotion);

// Route to delete a promotion by ID
router.delete('/delete/:id', isAuthenticatedUser, deletePromotion);

// Route to send notifications for selected promotions
router.post('/send-notifications', isAuthenticatedUser, sendSelectedPromotionNotifications);

module.exports = router;