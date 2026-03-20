const { Category, DEFAULT_CATEGORIES } = require('../models/Category');

// GET /api/categories
exports.getAll = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.status(200).json({ message: 'Categories fetched successfully', categories });
  } catch (err) {
    console.error('getAll categories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/categories
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const existing = await Category.findOne({ name: name.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    const category = await Category.create({ name: name.trim().toLowerCase() });
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (err) {
    console.error('create category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/categories/:id
exports.remove = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('remove category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Seed defaults (called once on server start if empty)
exports.seedDefaults = async () => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      await Category.insertMany(DEFAULT_CATEGORIES.map(name => ({ name })));
      console.log('Default categories seeded');
    }
  } catch (err) {
    console.error('Seed categories error:', err);
  }
};
