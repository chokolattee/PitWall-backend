const Cart = require("../models/Cart");

exports.addToCart = async (req, res) => {
    const { productId, quantity = 1, brand, category, color, gender } = req.body;
    const userId = req.user.id; // Fetch user ID from the authenticated request
    const userEmail = req.user.email; // Fetch user email from the authenticated request

    if (!productId || !brand || !category || !color || !gender) {
      return res.status(400).json({
        success: false,
        message: "Product ID, brand, category, color, and gender are required",
      });
    }
  
    try {
      let cartItem = await Cart.findOne({
        userId,
        productId,
        brand,
        category,
        color,
        gender,
      });
  
      if (cartItem) {
        cartItem.quantity += quantity;
        await cartItem.save();
        return res.status(200).json({
          success: true,
          message: "Item quantity updated in cart",
          cartItem,
          user: { id: userId, email: userEmail },
        });
      }
  
      // Create a new cart item if product doesn't exist in cart
      cartItem = new Cart({
        userId,
        productId,
        quantity,
        brand,
        category,
        color,
        gender,
      });
      await cartItem.save();
  
      // Return the cart item without populating product details
      return res.status(201).json({
        success: true,
        message: "Item added to cart",
        cartItem,
        user: { id: userId, email: userEmail },
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      return res.status(500).json({ success: false, message: "Failed to add item to cart." });
    }
  };

// Fetch all items in the cart for the authenticated user
exports.getAllCartItems = async (req, res) => {
  const userId = req.user.id; // Fetch userId from the authenticated user

  try {
    // Find all cart items associated with the userId and populate product details
    const cartItems = await Cart.find({ userId })
      .populate('productId', 'name price image') 
      .select('productId quantity brand category color gender'); // Select specific fields

    if (cartItems.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No items found in cart",
        cartItems: [],
      });
    }

    // Return the cart items with populated product names
    res.status(200).json({
      success: true,
      cartItems,
    });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cart items",
      error: error.message,
    });
  }
};

// Update an item's quantity in the cart authenticated user
exports.updateCartItemQuantity= async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id

  // Validate required fields
  if (!productId || quantity === undefined) {
    return res.status(400).json({ success: false, message: "Product ID and quantity are required" });
  }

  try {
    // Find the cart item for the given user and product
    const cartItem = await Cart.findOne({ userId, productId });

    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    // Update the item's quantity
    cartItem.quantity = quantity;
    await cartItem.save();

    res.status(200).json({ success: true, message: "Item quantity updated", cartItem });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating item quantity", error: error.message });
  }
};

//Update Cart Item Color
exports.updateCartItem = async (req, res) => {
    const { productId, color } = req.body;
    const userId = req.user.id; // Fetch user ID from the authenticated request
  
    // Validate required fields
    if (!productId || !color) {
      return res.status(400).json({
        success: false,
        message: "Product ID and color are required",
      });
    }
  
    try {
      // Find the cart item for the given user and product
      const cartItem = await Cart.findOne({ userId, productId });
  
      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: "Item not found in cart",
        });
      }
  
      // Update color 
      cartItem.color = color;
      await cartItem.save();
  
      res.status(200).json({
        success: true,
        message: "Cart item updated successfully",
        cartItem,
      });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update cart item",
        error: error.message,
      });
    }
  };

// Delete an item from the cart authenticated user
exports.deleteCartItem = async (req, res) => {
  const { productId } = req.body; // Only productId is needed in the request body
  const userId = req.user.id; // Use authenticated user's ID

  try {
    // Find the cart item and remove it based on authenticated user's ID
    const deletedItem = await Cart.findOneAndDelete({ userId, productId });

    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    res.status(200).json({ success: true, message: "Item deleted from cart", deletedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting item from cart", error });
  }
};

//Clear Cart Items
exports.clearCart = async (req, res) => {
  const userId = req.user.id; // Fetch user ID from the authenticated request

  try {
    // Delete all cart items for the authenticated user
    const deletedItems = await Cart.deleteMany({ userId });

    if (deletedItems.deletedCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No items found in cart to delete",
      });
    }

    res.status(200).json({
      success: true,
      message: "All items removed from cart",
      deletedCount: deletedItems.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message,
    });
  }
};

