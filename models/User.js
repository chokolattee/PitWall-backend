    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');

    const userSchema = new mongoose.Schema({
        username: {
            type: String,
            maxLength: [30, 'Your name cannot exceed 30 characters'],
            default: 'DefaultUsername'
        },
        email: {
            type: String,
            required: [true, 'Please enter your email'],
            unique: true
        },
        password: {
            type: String,
            select: false
        },
        firstName: {
            type: String,
            required: [true, 'First Name is required'],
            minlength: [2, 'First Name must be at least 2 characters'],
            maxlength: [50, 'First Name must be less than 50 characters'],
        },
        lastName: {
            type: String,
            required: [true, 'Last Name is required'],
            minlength: [2, 'Last Name must be at least 2 characters'],
            maxlength: [50, 'Last Name must be less than 50 characters'],
        },
        phoneNumber: {
            type: Number, 
            required: [true, 'Phone Number is required'],
        },
        address: {
            type: String,
            required: [true, 'Address is required'],
            minlength: [5, 'Address must be at least 5 characters'],
            maxlength: [100, 'Address must be less than 100 characters'],
        },
        zipCode: {
            type: Number, 
            required: [true, 'Zip Code is required'],
        },
        profileImage: {
            public_id: {
                type: String,
                required: [true, 'Profile image public ID is required']
            },
            url: {
                type: String,
                required: [true, 'Profile image URL is required'],
            }
        },
        fcmToken: {
            type: String,
            required: false,
        },
        status: {
            type: String, 
            enum: ['active', 'deactivated'], 
            default: 'active'
        },
        firebaseUid: {
            type: String,
            required: true,
            unique: true
        },
        role:  {
            type: String, 
            enum: ['admin', 'user'], 
            default: 'user'
        },
        notifications: [
            {
                title:       { type: String, required: true },
                body:        { type: String, required: true },
                type:        { type: String, enum: ['order', 'promotion'], default: 'promotion' },
                referenceId: { type: String, default: null },
                productId:   { type: String, default: null },
                timestamp:   { type: Date, default: Date.now },
                read:        { type: Boolean, default: false },
            }
        ],
    });

    userSchema.methods.getJwtToken = function () {
        return jwt.sign({ id: this._id, role: this.role}, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_TIME
        });
    }

    userSchema.methods.comparePassword = async function (enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password)
    }

    module.exports = mongoose.model("User", userSchema);
