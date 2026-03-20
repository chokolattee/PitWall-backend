const mongoose = require('mongoose');
const slugify = require('slugify');

const GENDER_OPTIONS = ['men', 'women', 'unisex', 'kids'];

const COMMON_COLORS = [
  'black', 'white', 'red', 'blue', 'green', 'yellow', 
  'brown', 'gray', 'purple', 'pink', 'orange', 'beige', 
  'tan', 'navy', 'teal', 'gold', 'silver', 'multicolor'
];

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true, 
  },
  image: [String],
  category: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  team: {
    type: String,
    required: true,
    trim: true,
  },
  color: {
    type: [String],
    required: true,
    enum: COMMON_COLORS 
  },
  gender: {
    type: String,
    required: true,
    enum: Object.values(GENDER_OPTIONS)
  },
}, { timestamps: true });


productSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

productSchema.methods.updateStock = async function (quantity) {
  if (quantity > this.stock) {
    throw new Error('Not enough stock available');
  }
  this.stock = this.stock - quantity;
  await this.save();
};

const Product = mongoose.model('Product', productSchema);

module.exports = {
  Product,
  COMMON_COLORS,
  GENDER_OPTIONS
};