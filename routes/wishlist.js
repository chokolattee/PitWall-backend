const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require("../middlewares/Auth");
const { addToWishlist, getWishlist, removeFromWishlist, clearWishlist, checkWishlist} = require('../controllers/WishlistController');

router.post('/add', addToWishlist);
router.get('/get/:userId', getWishlist);
router.delete('/remove/:id', removeFromWishlist);
router.delete('/clear', clearWishlist);
router.post('/check', checkWishlist);

module.exports = router;