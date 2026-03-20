const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// App
const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

//Routes
const productRoutes = require('./routes/products');
const authRoutes = require("./routes/auth");
const cartRoutes = require('./routes/carts');  
const orderRoutes = require('./routes/orders'); 
const featuredRoutes = require('./routes/features'); 
const reviewRoutes = require('./routes/reviews'); 
const userRoutes = require('./routes/user'); 
const wishlistRoutes = require('./routes/wishlist'); 
const promotionRoutes = require('./routes/promotions'); 
const categoryRoutes = require('./routes/category');
const teamRoutes = require('./routes/team');

const { seedDefaults: seedCategories } = require('./controllers/CategoryController');
const { seedDefaults: seedTeams } = require('./controllers/TeamController');

// Mongoose
mongoose
    .connect(process.env.DATABASE, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(async () => {
        console.log('DB connected');
        await seedCategories();
        await seedTeams();
    })
    .catch(err => console.log(err));

// Port and IP
const port = process.env.PORT || 8000;
const ip = process.env.IP || '0.0.0.0';

// Configure Cloudinary with credentials 
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/features", featuredRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/teams", teamRoutes);


app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start the server
app.listen(port, ip, () => console.log(`Server is running on http://${ip}:${port}`));