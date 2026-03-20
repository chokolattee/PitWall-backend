const express = require('express');
const router = express.Router();
const { createReview, getAllReviews, updateReview, deleteReview, getReviewsByProduct, getMyReviews } = require('../controllers/ReviewController');
const { isAuthenticatedUser } = require("../middlewares/Auth");
const upload = require('../utils/multer');

router.post('/create', isAuthenticatedUser, upload.array('images', 5), createReview);
router.get('/allReviews', isAuthenticatedUser, getAllReviews);
router.get('/myReviews', isAuthenticatedUser, getMyReviews);
router.get('/product/:productId', getReviewsByProduct);
router.put('/update/:id', isAuthenticatedUser, upload.array('images', 5), updateReview); 
router.delete('/delete/:id', isAuthenticatedUser, deleteReview); 

module.exports = router;