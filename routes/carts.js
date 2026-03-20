const express = require('express');
const router = express.Router();
const { addToCart, getAllCartItems, updateCartItem, updateCartItemQuantity, deleteCartItem, clearCart} = require('../controllers/CartController');
const { isAuthenticatedUser } = require("../middlewares/Auth");


// Create Cart
router.post("/add", isAuthenticatedUser, addToCart);

//Get Cart
router.get("/all", isAuthenticatedUser, getAllCartItems);

//Update Cart Item
router.put("/update", isAuthenticatedUser, updateCartItem); 

//Update Cart Item Quantity
router.put("/update-quantity", isAuthenticatedUser, updateCartItemQuantity); 

//Delete Cart Item
router.delete("/delete", isAuthenticatedUser, deleteCartItem); 

//Delete All Cart Items
router.delete("/clear", isAuthenticatedUser, clearCart);

module.exports = router;
