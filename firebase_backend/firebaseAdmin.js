const admin = require('firebase-admin');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('Firebase initialized using environment variable');
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', error.message);
    throw error;
  }
} else {

  try {
    serviceAccount = require('./serviceAccountKey.json');
    console.log('Firebase initialized using local file');
  } catch (error) {
    console.error('serviceAccountKey.json not found. Make sure it exists in the firebase_backend folder');
    throw error;
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;