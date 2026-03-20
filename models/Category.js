const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

// Default seed values
const DEFAULT_CATEGORIES = [
  'headwear', 'sunglasses', 'tumbler', 'flags',
  'figurines', 'keychains', 'cards', 'bags', 'accessories',
];

module.exports = { Category, DEFAULT_CATEGORIES };
