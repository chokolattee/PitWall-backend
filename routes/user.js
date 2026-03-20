const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require("../middlewares/Auth");
const { getUserOrders, getAllUsers, updateUserRole, updateUserStatus } = require('../controllers/UserController');

router.get('/orders',          isAuthenticatedUser, getUserOrders);
router.get('/all',             isAuthenticatedUser, getAllUsers);
router.put('/status/:userId',  isAuthenticatedUser, updateUserStatus);
router.put('/role/:userId',    isAuthenticatedUser, updateUserRole);

module.exports = router;