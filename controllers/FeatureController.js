const Order = require('../models/Order');
// No need to import Product model since we're only using Order data

// Get trending products across all categories using only Order data
exports.getTrendingProducts = async (req, res) => {
    try {
        // Get parameters from query
        const limit = parseInt(req.query.limit) || 10;
        const period = req.query.period || 'all'; // all, week, month, year
        const sortBy = req.query.sortBy || 'quantity'; // quantity, revenue
        
        // Build match conditions
        let match = {};
        
        // Add time period filter
        const now = new Date();
        if (period === 'week') {
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            match.createdAt = { $gte: lastWeek };
        } else if (period === 'month') {
            const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            match.createdAt = { $gte: lastMonth };
        } else if (period === 'year') {
            const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            match.createdAt = { $gte: lastYear };
        }
        
        // Build aggregation pipeline
        const pipeline = [
            // Filter orders by time period
            { $match: match },
            
            // Deconstruct orderItems array
            { $unwind: '$orderItems' },
            
            // Group by product to calculate metrics
            {
                $group: {
                    _id: '$orderItems.productId',
                    totalSold: { $sum: '$orderItems.quantity' },
                    revenue: { $sum: { $multiply: ['$orderItems.quantity', '$orderItems.productPrice'] } },
                    productName: { $first: '$orderItems.productName' },
                    productImage: { $first: '$orderItems.productImage' },
                    productPrice: { $first: '$orderItems.productPrice' },
                    sizes: { $addToSet: '$orderItems.size' },
                    colors: { $addToSet: '$orderItems.color' },
                    averagePrice: { $avg: '$orderItems.productPrice' }
                }
            },
            
            // Sort by either quantity sold or revenue
            { $sort: { [sortBy === 'revenue' ? 'revenue' : 'totalSold']: -1 } },
            
            // Limit the number of results
            { $limit: limit }
        ];
        
        // Execute the aggregation
        const trendingProducts = await Order.aggregate(pipeline);
        
        res.status(200).json({
            success: true,
            period,
            sortBy,
            count: trendingProducts.length,
            trendingProducts
        });
    } catch (error) {
        console.error('Error getting trending products:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getRecentOrders = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(limit);
            
        res.status(200).json({
            success: true,
            count: recentOrders.length,
            orders: recentOrders
        });
    } catch (error) {
        console.error('Error getting recent orders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};