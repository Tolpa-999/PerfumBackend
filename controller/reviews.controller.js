const { validationResult } = require('express-validator');

const Review = require('../models/review.model');
const Product = require('../models/product.model');

const httpStatus = require('../utils/httpStatusText');
const asyncWrapper = require('../middlewares/asyncWrapper');
const appError = require('../utils/appError');
const updateAverageRating = require('../middlewares/updateAverageRaing');

// Global constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 6;

// Helper function: Validate product existence
const validateProduct = async (productId, next) => {
  const product = await Product.findById(productId);
  if (!product) {
    return next(appError.create("Product not found", 404, httpStatus.FAIL));
  }
  return product;
};

// Helper function: Parse and validate pagination parameters
const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1);
  return { page, limit };
};

// Get reviews with pagination
const getReviews = asyncWrapper(async (req, res, next) => {
  const { page, limit } = parsePagination(req.query);
  const skip = (page - 1) * limit;

  const { productId } = req.params;
  if (!productId) {
    return next(appError.create("Product ID not found in the request", 404, httpStatus.FAIL));
  }

  const reviews = await Review.find({ product: productId })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalReviews = await Review.countDocuments({ product: productId });
  const totalPages = Math.ceil(totalReviews / limit);

  res.status(200).json({
    status: httpStatus.SUCCESS,
    message: "Review fetched successfully",
    data: {
      reviews: reviews.length ? reviews : "No reviews found for this product.",
      totalReviews,
      currentPage: page,
      totalPages,
    },
  });

});

// Add a review
const addReview = asyncWrapper(async (req, res, next) => {
  const { productId } = req.params;
  
  const {userId, username} = req

  if (!productId) {
    return next(appError.create("Product ID not found in the request", 404, httpStatus.FAIL));
  }

  if (!userId) {
    return next(appError.create("User ID not found in the request", 404, httpStatus.FAIL));
  } 

  if (!username) {
    return next(appError.create("User name not found in the request", 404, httpStatus.FAIL));
  }


  //  await validateProduct({productId, userId}, next);

  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return next(appError.create("Invalid data provided", 400, httpStatus.FAIL));
  // }


  const { comment, rating } = req.body;


  const productExists = await Product.findById(productId);
  if (!productExists) {
    return next(appError.create("Product not found", 404, httpStatus.FAIL));
  }

  const existingReview = await Review.findOne({ product: productId, user: userId });
  if (existingReview) {
    console.log('You have already reviewed this product');
    return next(appError.create("You have already reviewed this product", 400, httpStatus.FAIL));
  }

  const newReview = await Review.create({ product: productId, user: userId, username, comment, rating });

  await updateAverageRating(productId);

  res.status(201).json({
    status: httpStatus.SUCCESS,
    message: "Review added successfully",
    data: { review: newReview },
  });

});

// Delete a review
const deleteReview = asyncWrapper(async (req, res, next) => {
  const { productId, reviewId } = req.params;

  const {userId, username} = req;

  if (!productId) {
    return next(appError.create("Product ID not found in the request", 404, httpStatus.FAIL));
  }

  await validateProduct(productId, next);

  if (!reviewId) {
    return next(appError.create("Review ID not found in the request", 404, httpStatus.FAIL));
  }

  if (!userId) {
    return next(appError.create("User ID not found in the request", 404, httpStatus.FAIL));
  } 

  if (!username) {
    return next(appError.create("User name not found in the request", 404, httpStatus.FAIL));
  }

  

  const ReviewFound = await Review.findById(reviewId);
  if (!ReviewFound) {
    return next(appError.create("Review not found", 404, httpStatus.FAIL));
  }

  // console.log('comparison userId => ', userId, 'review userId', ReviewFound.user, 'comparison username =>', username, 'review username', ReviewFound.username);
  if (userId !== ReviewFound.user || username !== ReviewFound.username) {
    return next(appError.create("You are not authorized to delete this review", 403, httpStatus.FAIL));
  }

  await Review.deleteOne({ _id: reviewId });

  await updateAverageRating(productId);

  res.status(200).json({
    status: httpStatus.SUCCESS,
    message: "Review deleted successfully",
  });

});

module.exports = {
  getReviews,
  addReview,
  deleteReview,
};
