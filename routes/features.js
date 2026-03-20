const express = require('express');
const router = express.Router();
const { getTrendingProducts } = require('../controllers/FeatureController');

router.get('/trending', getTrendingProducts);

module.exports = router;
