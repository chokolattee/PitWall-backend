const Order = require('../models/Order');
const Product = require('../models/Product');
const admin = require('../firebase_backend/firebaseAdmin'); 
const User = require('../models/User');
const { sendOrderStatusEmail } = require('../utils/email');

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { 
            shippingInfo, 
            orderItems, 
            paymentInfo, 
            voucher,
            subtotal,
            shippingFee,
            discountAmount,
            totalPrice
        } = req.body;

        const normalizedPaymentInfo = {
            ...(paymentInfo || {}),
            method: (paymentInfo?.method || '').replace(/\s*\/\s*/g, '/').trim()
        };

        const order = await Order.create({
            shippingInfo,
            orderItems,
            paymentInfo: normalizedPaymentInfo,
            voucher: voucher || {},
            subtotal,
            shippingFee: shippingFee || 100,
            discountAmount: discountAmount || 0,
            totalPrice,
            paidAt: normalizedPaymentInfo.method === 'Cash on Delivery' ? null : Date.now(),
            user: req.userId
        });

        res.status(201).json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Order creation failed',
            error: error.message
        });
    }
};

// Get single order by ID
exports.getSingleOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate({
                path: 'orderItems.productId',
                select: 'name category brand'
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get logged in user orders
exports.myOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        let totalAmount = 0;
        orders.forEach(order => {
            totalAmount += order.totalPrice;
        });

        res.status(200).json({
            success: true,
            count: orders.length,
            totalAmount,
            orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// FCM Notification function
const sendFCMNotification = async (fcmToken, title, body, data = {}) => {
    try {
      console.log(`Sending notification to token: ${fcmToken}`);
      
      const message = {
        token: fcmToken,  
        notification: { title, body },
        data: typeof data === 'object' ? 
          Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, String(value)])
          ) : {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'pitwall-orders',
            priority: 'high',
            visibility: 'public',
            sound: 'default',
            defaultSound: true,
            color: '#E10600'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true
            }
          },
          headers: { 'apns-priority': '10' }
        }
      };
      
      const response = await admin.messaging().send(message);
      console.log(`Successfully sent notification: ${response}`);
      return response;
    } catch (error) {
      console.error('Error sending FCM notification:', error);
      throw error;
    }
};

/**
 * Returns the allowed next statuses for a given current status.
 * Enforces forward-only progression; cancellation allowed from Processing & Confirmed.
 */
const getAllowedNextStatuses = (currentStatus) => {
    switch (currentStatus) {
        case 'Processing':
            return ['Confirmed', 'Cancelled'];
        case 'Confirmed':
            return ['Shipped', 'Cancelled'];
        case 'Shipped':
            return ['Delivered'];
        case 'Delivered':
        case 'Cancelled':
            return []; // Terminal states
        default:
            return [];
    }
};

// Admin: Update order status
exports.updateOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.orderStatus === 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'You have already delivered this order'
            });
        }

        if (order.orderStatus === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'This order has already been cancelled'
            });
        }

        const newStatus = req.body.status || req.body.orderStatus;
        
        if (!newStatus) {
            return res.status(400).json({
                success: false,
                message: 'No status provided'
            });
        }

        // Validate allowed transition
        const allowedStatuses = getAllowedNextStatuses(order.orderStatus);
        if (!allowedStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from '${order.orderStatus}' to '${newStatus}'. Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`
            });
        }

        order.orderStatus = newStatus;
        
        if (newStatus === 'Delivered') {
            order.deliveredAt = Date.now();
            if (!order.paidAt && order.paymentInfo.method === 'Cash on Delivery') {
                order.paidAt = Date.now();
            }
        }

        await order.save();
        console.log('Order successfully updated to status:', newStatus);

        // ── Always send email notification on every status update ──
        try {
            const userForEmail = await User.findById(order.user);
            if (userForEmail && userForEmail.email) {
                const customerName = userForEmail.firstName || userForEmail.username || 'Customer';
                await sendOrderStatusEmail(
                    userForEmail.email,
                    customerName,
                    order._id.toString(),
                    newStatus,
                    order
                );
                console.log(`Order status email sent to ${userForEmail.email} for status: ${newStatus}`);
            } else {
                console.log('No user email found for order notification:', order._id);
            }
        } catch (emailError) {
            // Non-blocking: log failure but do not fail the request
            console.error('Order status email failed (non-blocking):', emailError.message);
        }

        if (req.body.sendNotification) {
            try {
                const user = await User.findById(order.user);
                
                if (user && user.fcmToken) {
                    let title = 'Order Update';
                    let body = '';
                    const orderIdShort = order._id.toString().slice(-6);
                    const customerName = user.name || 'Customer';
                    
                    switch(newStatus) {
                        case 'Processing':
                            title = 'Order Processing';
                            body = `Dear ${customerName}, your order #${orderIdShort} is now being processed.`;
                            break;
                        case 'Confirmed':
                            title = 'Order Confirmed';
                            body = `Dear ${customerName}, your order #${orderIdShort} has been confirmed.`;
                            break;
                        case 'Shipped':
                            title = 'Order Shipped';
                            body = `Good news! Your order #${orderIdShort} has been shipped and is on its way.`;
                            break;
                        case 'Delivered':
                            title = 'Order Delivered';
                            body = `Your order #${orderIdShort} has been delivered. Thank you for shopping with us!`;
                            break;
                        case 'Cancelled':
                            title = 'Order Cancelled';
                            body = `Your order #${orderIdShort} has been cancelled.`;
                            break;
                        default:
                            body = `Your order #${orderIdShort} status has been updated to ${newStatus}.`;
                    }
                    
                    await sendFCMNotification(
                        user.fcmToken, 
                        title, 
                        body,
                        {
                            orderId: order._id.toString(),
                            orderStatus: newStatus,
                            screen: 'OrderDetail'
                        }
                    );
                    console.log('Push notification sent successfully');
                } else {
                    console.log('No FCM token available for user or user not found');
                }
            } catch (notificationError) {
                console.error('Error sending push notification:', notificationError);
                return res.status(200).json({
                    success: true,
                    message: 'Order status updated but notification failed',
                    notificationError: true,
                    order
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Admin: Delete order
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        await Order.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Fetch all notifications for a user (orders + promotions)
exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.userId; 
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // ── Order-based notifications ──────────────────────────────────
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

        const orderNotifications = orders.map(order => {
            const orderIdShort = order._id.toString().slice(-6);
            let title = 'Order Update';
            let body  = '';

            switch (order.orderStatus) {
                case 'Processing':
                    title = 'Order Processing';
                    body  = `Your order #${orderIdShort} is now being processed.`;
                    break;
                case 'Confirmed':
                    title = 'Order Confirmed';
                    body  = `Your order #${orderIdShort} has been confirmed.`;
                    break;
                case 'Shipped':
                    title = 'Order Shipped';
                    body  = `Good news! Your order #${orderIdShort} has been shipped.`;
                    break;
                case 'Delivered':
                    title = 'Order Delivered';
                    body  = `Your order #${orderIdShort} has been delivered.`;
                    break;
                case 'Cancelled':
                    title = 'Order Cancelled';
                    body  = `Your order #${orderIdShort} has been cancelled.`;
                    break;
                default:
                    body = `Your order #${orderIdShort} status is ${order.orderStatus}.`;
            }

            return {
                orderId:     order._id,
                title,
                body,
                type:        'order',
                orderStatus: order.orderStatus,
                timestamp:   order.updatedAt || order.createdAt,
                screen:      'OrderDetail',
            };
        });

        // ── Promotion notifications stored in the user document ────────
        const promotionNotifications = (user.notifications || []).map(n => ({
            orderId:     null,
            promotionId: n.referenceId,
            productId:   n.productId || null,
            title:       n.title,
            body:        n.body,
            type:        n.type || 'promotion',
            timestamp:   n.timestamp,
            screen:      'PromotionDetails',
            read:        n.read,
        }));

        // ── Merge and sort newest-first ───────────────────────────────
        const notifications = [...orderNotifications, ...promotionNotifications]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.status(200).json({
            success: true,
            notifications,
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message,
        });
    }
};

exports.cancelOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const userIdFromBody = req.body.userId;
        const isAuthorized = 
            order.user.toString() === req.userId || 
            (userIdFromBody && order.user.toString() === userIdFromBody);
        
        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own orders'
            });
        }

        const cancellableStatuses = ['Processing', 'Confirmed'];
        if (!cancellableStatuses.includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Orders in ${order.orderStatus} status cannot be cancelled. Please contact customer service.`
            });
        }

        const cancellationReason = req.body.reason || 'Cancelled by customer';

        order.orderStatus = 'Cancelled';
        order.cancellationReason = cancellationReason;
        order.cancelledAt = Date.now();
        
        await order.save();
        console.log('Order successfully cancelled by user');

        // Always send cancellation email
        try {
            const userForEmail = await User.findById(order.user);
            if (userForEmail && userForEmail.email) {
                const customerName = userForEmail.firstName || userForEmail.username || 'Customer';
                await sendOrderStatusEmail(
                    userForEmail.email,
                    customerName,
                    order._id.toString(),
                    'Cancelled',
                    order
                );
                console.log(`Cancellation email sent to ${userForEmail.email}`);
            }
        } catch (emailError) {
            console.error('Cancellation email failed (non-blocking):', emailError.message);
        }

        try {
            const orderId = order._id.toString();
            const userId = order.user.toString();
            const user = await User.findById(userId);
            
            if (user && user.fcmToken) {
                const orderIdShort = orderId.slice(-6);
                await sendFCMNotification(
                    user.fcmToken, 
                    'Order Cancellation Confirmed',
                    `Your order #${orderIdShort} has been successfully cancelled.`,
                    {
                        orderId: orderId,
                        userId: userId,
                        orderStatus: 'Cancelled',
                        screen: 'OrderDetail'
                    }
                );
            }
        } catch (notificationError) {
            console.error('Error sending cancellation confirmation:', notificationError);
        }

        res.status(200).json({
            success: true,
            message: 'Your order has been cancelled successfully',
            order
        });
    } catch (error) {
        console.error('Error in user order cancellation:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong while cancelling your order',
            error: error.message
        });
    }
};