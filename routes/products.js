const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { create, getAllProducts, getProductBySlug, getProductById, update, remove, getEnumValues, searchProducts, filterProducts} = require('../controllers/ProductController');


router.post('/add-product', upload.array('image', 5), create);
router.put('/update-product/:id', upload.array('image', 5), update);

router.get('/enums', getEnumValues);
router.get('/search', searchProducts);
router.get('/filter', filterProducts);

router.get('/get-products', getAllProducts);
router.get('/get-product-by-slug/:slug', getProductBySlug);
router.get('/get-product-by-id/:id', getProductById);
router.delete('/remove-product/:id', remove);
module.exports = router;