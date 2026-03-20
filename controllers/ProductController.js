const ProductModule = require('../models/Product');
const { Product, COMMON_COLORS, GENDER_OPTIONS } = ProductModule;
const { Category } = require('../models/Category');
const { Team } = require('../models/Team');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getEnumValues = async (req, res) => {
  try {
    const [categories, teams] = await Promise.all([
      Category.find({}).sort({ name: 1 }),
      Team.find({}).sort({ name: 1 }),
    ]);

    res.status(200).json({
      message: "Enum values fetched successfully",
      data: {
        categories: categories.map(c => ({ _id: c._id, name: c.name })),
        teams: teams.map(t => ({ _id: t._id, name: t.name })),
        colors: COMMON_COLORS,
        genders: GENDER_OPTIONS
      }
    });
  } catch (err) {
    console.error("Error in getEnumValues:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json({
      message: "Products fetched successfully",
      products,
    });
  } catch (err) {
    console.error("Error in getAllProducts:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.create = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      stock, 
      category, 
      team, 
      color, 
      gender, 
    } = req.body;

    // Check required fields
    if (!name || !description || !price || !stock || !category || !team || !color || !gender) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    // Validate gender against enum
    if (!GENDER_OPTIONS.includes(gender)) {
      return res.status(400).json({ error: "Invalid gender" });
    }

    // Parse and validate color
    const colorArray = Array.isArray(color) ? color : [color];
    if (!colorArray.every(c => COMMON_COLORS.includes(c))) {
      return res.status(400).json({ error: "Invalid color" });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'products',
          width: 150,
          crop: "scale",
        });
        imageUrls.push(result.secure_url);
        fs.unlinkSync(file.path);
      }
    }

    const newProduct = new Product({
      name,
      description,
      price,
      stock,
      image: imageUrls,
      category,
      team,
      color: colorArray,
      gender,
    });

    await newProduct.save();

    res.status(201).json({
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    description, 
    price, 
    stock, 
    category, 
    team, 
    color, 
    gender, 
  } = req.body;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate gender if provided
    if (gender && !GENDER_OPTIONS.includes(gender)) {
      return res.status(400).json({ error: "Invalid gender" });
    }

    // Validate color if provided
    const colorArray = color ? (Array.isArray(color) ? color : [color]) : null;
    if (colorArray && !colorArray.every(c => COMMON_COLORS.includes(c))) {
      return res.status(400).json({ error: "Invalid color" });
    }

    let updatedImageUrls = [];

    if (req.files && req.files.length > 0) {
      if (product.image && product.image.length > 0) {
        for (const imageUrl of product.image) {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
      }

      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'products',
          width: 150,
          crop: "scale",
        });
        updatedImageUrls.push(result.secure_url);
        fs.unlinkSync(file.path);
      }
    } else {
      updatedImageUrls = product.image;
    }

    // Update product fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (category) product.category = category;
    if (team) product.team = team;
    if (colorArray) product.color = colorArray;
    if (gender) product.gender = gender;
    product.image = updatedImageUrls;

    await product.save();

    res.status(200).json({
      message: 'Product updated successfully',
      product,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(400).json({ error: 'Delete error: product not found' });
    }

    return res.status(200).json({ message: 'Product deleted successfully' });
  }
  catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Additional filter functions

exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category: category.toLowerCase() });
    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getProductsByteam = async (req, res) => {
  try {
    const { team } = req.params;
    const products = await Product.find({ team: { $regex: new RegExp(`^${team}$`, 'i') } });
    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { 
      query, 
      category, 
      team, 
      gender, 
      minPrice, 
      maxPrice, 
      color,
    } = req.query;

    const searchCriteria = {};
    
    // Text search
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Filters - validate all inputs
    if (category) {
      searchCriteria.category = category.toLowerCase();
    }
    
    if (team) {
      searchCriteria.team = { $regex: new RegExp(`^${team}$`, 'i') };
    }
    
    if (gender) {
      if (!GENDER_OPTIONS.includes(gender)) {
        return res.status(400).json({ error: "Invalid gender" });
      }
      searchCriteria.gender = gender;
    }
    
    if (color) {
      if (!COMMON_COLORS.map(c => c.toLowerCase()).includes(color.toLowerCase())) {
        return res.status(400).json({ error: "Invalid color" });
      }
      searchCriteria.color = { $regex: new RegExp(color, 'i') };
    }
    
    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      searchCriteria.price = {};
      if (minPrice !== undefined) searchCriteria.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) searchCriteria.price.$lte = Number(maxPrice);
    }
    
    const products = await Product.find(searchCriteria);
    
    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Add a new method to update stock
exports.updateProductStock = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  
  try {
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    try {
      await product.updateStock(quantity);
      
      res.status(200).json({
        message: 'Product stock updated successfully',
        product,
      });
    } catch (stockError) {
      return res.status(400).json({ error: stockError.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    
    // Initialize empty search criteria
    const searchCriteria = {};
    
    // Text search for name, team, and category only
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { team: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Find products matching the criteria
    const products = await Product.find(searchCriteria);
    
    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
exports.filterProducts = async (req, res) => {
  try {
    // Get filter params from query
    const { 
      category, 
      team, 
      gender, 
      minPrice, 
      maxPrice, 
      color,
      sort 
    } = req.query;

    console.log('Filter params:', { category, team, gender, minPrice, maxPrice, color, sort });

    // Build filter object
    const filter = {};

    if (category) {
      filter.category = { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, 'i') };
    }

    if (team) {
      filter.team = { $regex: new RegExp(escapeRegex(team.trim()), 'i') };
    }

    if (gender) {
      filter.gender = { $regex: new RegExp(`^${escapeRegex(gender.trim())}$`, 'i') };
    }

    if (color) {
      // Match value inside color array, case-insensitive
      filter.color = { $elemMatch: { $regex: new RegExp(`^${escapeRegex(color.trim())}$`, 'i') } };
    }

    // Price range - handle as integers (stored in cents/centavos)
    if (minPrice || maxPrice) {
      filter.price = {};
      
      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }
      
      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    console.log('MongoDB filter:', filter);

    // Determine sort options
    let sortOption = { createdAt: -1 }; // Default: newest first
    
    if (sort) {
      switch (sort) {
        case 'price_asc':
          sortOption = { price: 1 };
          break;
        case 'price_desc':
          sortOption = { price: -1 };
          break;
        case 'name_asc':
          sortOption = { name: 1 };
          break;
        // Default case is already set
      }
    }

    // Execute query
    const products = await Product.find(filter).sort(sortOption);

    console.log(`Found ${products.length} products matching filters`);

    // Return successful response with products
    res.status(200).json({
      message: "Products filtered successfully",
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error filtering products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error filtering products',
      error: error.message
    });
  }
};