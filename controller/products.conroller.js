const { validationResult } = require('express-validator');
const Product = require('../models/product.model');
const httpStatus = require('../utils/httpStatusText');
const asyncWrapper = require('../middlewares/asyncWrapper');
const appError = require('../utils/appError');


// Get all products without pagination
const getAllProducts = asyncWrapper(async (req, res, next) => {
  const products = await Product.find({});

  res.status(200).json({
    status: httpStatus.SUCCESS,
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
