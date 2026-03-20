const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity cannot be less than 1"],
      default: 1,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["men", "women", "unisex", "kids"], // Optional: Restrict to valid values
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Ensure a user can only have one unique product with specific attributes in the cart
CartSchema.index(
  { userId: 1, productId: 1, brand: 1, category: 1, size: 1, color: 1, gender: 1 },
  { unique: true }
);

module.exports = mongoose.model("Cart", CartSchema);