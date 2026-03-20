const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Schema } = mongoose;


const promoSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Please enter a promo code'],
        unique: true,
        validate: [validator.isAlphanumeric, 'Promo code can only contain letters and numbers']
    },
    discount: {
        type: Number,
        required: [true, 'Please enter a discount percentage'],
        min: [0, 'Discount cannot be less than 0%'],
        max: [100, 'Discount cannot be more than 100%']
    },
    expiresAt: {
        type: Date,
        required: [true, 'Please enter an expiration date']
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model("Promo", promoSchema);