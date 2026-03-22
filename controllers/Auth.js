const bcrypt = require("bcryptjs");
const User = require("../models/User");
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library'); 
const client = new OAuth2Client('893426226343-6s9mpjtmoe188rhfqtptmndf6td92hec.apps.googleusercontent.com'); 

exports.Register = async function (req, res) {
    const session = await mongoose.startSession(); 
    session.startTransaction();

    try {
        const { 
            username, 
            email, 
            password, 
            firstName, 
            lastName, 
            phoneNumber, 
            address, 
            zipCode, 
            firebaseUid, 
            profileImage 
        } = req.body;

        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already in use." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let uploadedImage = {
            public_id: 'default_public_id',
            url: 'default_url',
        };

        if (profileImage && profileImage.url) {
            try {
                const result = await cloudinary.uploader.upload(profileImage.url, {
                    folder: 'users',
                    public_id: profileImage.public_id,
                    overwrite: true,
                });

                uploadedImage = {
                    public_id: result.public_id,
                    url: result.secure_url,
                };
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
                return res.status(500).json({ message: 'Image upload failed', error: error.message });
            }
        }

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            address,
            zipCode,
            profileImage: uploadedImage, 
            firebaseUid,
            role: "user", 
            status: "active", 
        });

        const savedUser = await newUser.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: "Account has been registered successfully. Please verify your email to activate your account.",
            user: savedUser,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.Login = async function (req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { email, password, fcmToken } = req.body; // Add fcmToken to destructuring

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Please enter email & password' });
        }

        // Find the user by email and include the password field for comparison
        let user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid Email or Password' });
        }

        // Compare the provided password with the hashed password in the database
        const isPasswordMatched = await user.comparePassword(password);
        if (!isPasswordMatched) {
            return res.status(401).json({ message: 'Invalid Email or Password' });
        }

        // Block deactivated accounts
        if (user.status === 'deactivated') {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
        }

        // Update FCM token if provided
        if (fcmToken) {
            user.fcmToken = fcmToken;
            await user.save({ session });
            console.log("FCM Token updated during regular login:", fcmToken);
        }

        // Generate JWT token
        const token = user.getJwtToken();

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return the token and user information
        return res.status(201).json({
            success: true,
            user,
            token,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//Google Login with Firebase UID and created credentials through database 
exports.googleLogin = async function (req, res) {
    try {
        const { idToken, firebaseUid, fcmToken } = req.body;
        // console.log("Received Firebase UID:", firebaseUid);
        if (fcmToken) {
            // console.log("Received FCM Token:", fcmToken);
        }

        const ticket = await client.verifyIdToken({
            idToken,
            audience: '893426226343-6s9mpjtmoe188rhfqtptmndf6td92hec.apps.googleusercontent.com',
        });

        const payload = ticket.getPayload();
        const { email, name, given_name, family_name, picture: photoURL } = payload;

        let user = await User.findOne({ email });
        if (!user) {
            console.log("User not found, creating a new user");

            user = new User({
                username: email.split("@")[0],
                email,
                firebaseUid,
                firstName: given_name || name.split(" ")[0],
                lastName: family_name || name.split(" ").slice(1).join(" ") || given_name || name.split(" ")[0],
                phoneNumber: "00000000000",
                address: "Default Address",
                zipCode: "0000",
                profileImage: {
                    public_id: "register/users/google-login-profile",
                    url: photoURL || "https://default-profile-image-url.com/default-profile.png",
                },
                fcmToken: fcmToken 
            });

            await user.save();
            console.log("New user created and saved with FCM token:", fcmToken || "none provided");
        } else {
            console.log("User found:", user);

            // Block deactivated accounts
            if (user.status === 'deactivated') {
                return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
            }

            user.phoneNumber = user.phoneNumber || "00000000000";
            user.address = user.address || "Default Address";
            user.zipCode = user.zipCode || "0000";
            
            if (fcmToken) {
                user.fcmToken = fcmToken;
                console.log("FCM Token updated for existing user:", fcmToken);
            }

            await user.save();
        }

        const token = user.getJwtToken();
        console.log("Generated JWT token:", token);

        return res.status(200).json({
            token,
            userId: user._id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            address: user.address,
            zipCode: user.zipCode,
            profileImage: user.profileImage,
            firebaseUid: user.firebaseUid,
            fcmToken: user.fcmToken 
        });
    } catch (error) {
        console.error("Error during Google login:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.updateFCMToken = async function (req, res) {
    try {
        const { fcmToken } = req.body;
        
        if (!fcmToken) {
            return res.status(400).json({ 
                success: false,
                message: "FCM token is required" 
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { fcmToken }, 
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        return res.status(200).json({
            success: true,
            message: "FCM token updated successfully"
        });
    } catch (error) {
        console.error("Error updating FCM token:", error);
        res.status(500).json({ 
            success: false,
            message: "Error updating FCM token", 
            error: error.message 
        });
    }
};
//Get User data via middleware
exports.getUserData= async function (req, res, next) {
    try {
        const user = await User.findById(req.user.id);

        if (!user ) {
            return res.status(404).json({
                success: false,
                message: "User or customer details not found"
            });
        }
        return res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                address: user.address,
                zipCode: user.zipCode,
                profileImage: user.profileImage,
                role: user.role

            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user profile" });
    }
}

exports.updateProfile = async function (req, res, next) {
    try {
        const { firstName, lastName, phoneNumber, address, zipCode } = req.body;

        const newUserData = {
            firstName,
            lastName,
            phoneNumber,
            address,
            zipCode,
        };

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (req.file) {
                console.log("Uploaded file buffer:", req.file.buffer); 
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'users', width: 150, crop: "scale" },
                        (error, result) => {
                            if (error) {
                                reject(new Error("Cloudinary upload failed"));
                            } else {
                                resolve(result);
                            }
                        }
                    );
                    stream.end(req.file.buffer);
                });

                console.log("Cloudinary upload result:", result); // Debugging log
                newUserData.profileImage = {
                    public_id: result.public_id,
                    url: result.secure_url,
                };
            } else {
                console.log("No file uploaded, skipping profile image update");
            }

            // Update the user details
            const updatedUser = await User.findByIdAndUpdate(req.user.id, newUserData, {
                new: true,
                runValidators: true,
                session,
            });

            if (!updatedUser) {
                throw new Error("User not found");
            }

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            // Respond with updated user details
            return res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                user: updatedUser,
            });
        } catch (error) {
            // Abort the transaction in case of an error
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
};

// Fetch all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password field

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No users found',
            });
        }

        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message,
        });
    }
};