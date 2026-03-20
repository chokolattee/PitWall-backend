const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    shippingInfo: {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        }
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    orderItems: [
        {
            productName: {
                type: String,
                required: true
            },
            size: {
                type: String,
                required: true
            },
            color: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            productImage: {
                type: String,
                required: true
            },
            productPrice: {
                type: Number,
                required: true
            },
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: 'Product'
            }
        }
    ],
    paymentInfo: {
        method: {
            type: String,
            required: true,
            enum: ['Cash on Delivery', 'Credit/Debit Card', 'GCash']
        }
    },
    voucher: {
        code: {
            type: String
        },
        discount: {
            type: Number 
        }
    },
    subtotal: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        required: true,
        default: 100
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        required: true,
        default: 'Processing',
        enum: ['Processing', 'Confirmed','Shipped', 'Delivered', 'Cancelled']
    },
    paidAt: {
        type: Date,
        default: Date.now
    },
    deliveredAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);