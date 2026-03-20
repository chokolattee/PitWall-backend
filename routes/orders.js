const express = require('express');
const router = express.Router();
const { 
    createOrder,
    getSingleOrder,
    myOrders,
    getAllOrders,
    updateOrder,
    deleteOrder,
    getUserNotifications,
    cancelOrderStatus 
} = require('../controllers/OrderController');

const { isAuthenticatedUser } = require("../middlewares/Auth");

// User routes
router.post('/create', isAuthenticatedUser, createOrder);
router.get('/myorders', isAuthenticatedUser, myOrders);
router.get('/myorder/:id', isAuthenticatedUser, getSingleOrder);
router.get('/notifications', isAuthenticatedUser, getUserNotifications);
router.put('/cancel/:id', isAuthenticatedUser, cancelOrderStatus);

// Admin routes
router.get('/all', isAuthenticatedUser, getAllOrders);
router.put('/update/:id', isAuthenticatedUser, updateOrder);
router.delete('/delete/:id', isAuthenticatedUser, deleteOrder);

module.exports = router;