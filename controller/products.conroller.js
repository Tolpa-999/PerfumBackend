const { validationResult } = require('express-validator');
const Product = require('../models/product.model');
const httpStatus = require('../utils/httpStatusText');
const asyncWrapper = require('../middlewares/asyncWrapper');
const appError = require('../utils/appError');


// Get all products without pagination
const getAllProducts = asyncWrapper(async (req, res, next) => {
  const { category, minPrice, maxPrice, sort, page = 1, limit = 10, search, minRating, sizes } = req.query;

  // 🏷️ Filters
  let filter = {};

  // 🔍 Filter by Category
  if (category) {
    filter.category = category;
  }

  // 💰 Filter by Price Range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // 🌟 Filter by Minimum Rating
  if (minRating) {
    filter.rating = { $gte: Number(minRating) };
  }

  // 🔎 Search by Product Name or Description
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  // 📏 Filter by Available Sizes
  if (sizes) {
    filter.sizes = { $in: sizes.split(",").map(Number) }; // Convert "50,100,150" to [50, 100, 150]
  }

  // 📌 Pagination
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  // 🔄 Sorting Options
  let sortOption = {};
  if (sort) {
    const sortFields = {
      priceAsc: { price: 1 },    // Low to High Price
      priceDesc: { price: -1 },  // High to Low Price
      rating: { rating: -1 },    // Best Rated
      newest: { createdAt: -1 }, // Newest Products
    };
    sortOption = sortFields[sort] || {};
  }

  // 🔍 Fetching Products
  const products = await Product.find(filter)
    .populate("reviews") // Fetch review details
    .sort(sortOption)
    .skip(skip)
    .limit(limitNumber);

  // 🛠️ Get Total Count for Pagination Info
  const totalProducts = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalProducts / limitNumber);

  res.status(200).json({
    status: httpStatus.SUCCESS,
    currentPage: pageNumber,
    totalPages,
    totalProducts,
    data: products,
  });
});


// Get a single product by ID with reviews
const getProduct = asyncWrapper(async (req, res, next) => {
  const { productId } = req.params || req.body;

  if (!productId) {
    return next(appError.create("Product ID not provided in the request", 404, httpStatus.FAIL));
  }

  const product = await Product.findById(productId).populate({
    path: 'reviews',
    options: { limit: 6, sort: '-createdAt' }, // Optional sort by review date
  });

  if (!product) {
    return next(appError.create("Product not found", 404, httpStatus.FAIL));
  }

  res.status(200).json({
    status: httpStatus.SUCCESS,
    message: "Product fetched successfully",
    data: product,
  });

});

// Add a new product
const addProduct = asyncWrapper(async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(appError.create("Invalid data provided", 400, httpStatus.FAIL));
  }

  const { name, price, category } = req.body;

  // Example validation for required fields
  if (!name || !price || !category) {
    return next(appError.create("Missing required fields (name, price, category)", 400, httpStatus.FAIL));
  }

  const product = await Product.create(req.body);

  res.status(201).json({
    status: httpStatus.SUCCESS,
    message: "Product added successfully",
    data: product,
  });

});

module.exports = {
  getAllProducts,
  getProduct,
  addProduct,
};
