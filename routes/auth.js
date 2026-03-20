const express = require("express");
const router = express.Router();

const { 
    Register, 
    Login, 
    googleLogin, 
    getUserData, 
    updateProfile,
    updateFCMToken,
    getAllUsers,
} = require('../controllers/Auth');
const { isAuthenticatedUser } = require("../middlewares/Auth");
const upload = require("../utils/multer");


//Authentication routes through Firebase
// router.post("/signup", Register);
router.post("/signup", upload.single("profileImage"), Register);;
router.post("/login", Login);
router.post("/google-login", googleLogin);


//Authentication with middleware
router.get('/profile', isAuthenticatedUser, getUserData);
router.put('/profile/update', isAuthenticatedUser, upload.single("profileImage"), updateProfile);

// FCM token update route
router.post('/update-fcm-token', isAuthenticatedUser, updateFCMToken);

//get users
router.get('/users', getAllUsers);

module.exports = router;