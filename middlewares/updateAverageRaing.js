const Product = require('../models/product.model');
const Review = require('../models/review.model');

const updateAverageRating = async (productId) => {
  if (!productId) {
    throw new Error("Product ID is required to update the average rating");
  }

  // Fetch all reviews for the product
  const reviews = await Review.find({ product: productId });

  if (!reviews) {
    throw new Error("Reviews not found");
  }

  // Calculate total ratings and average rating
  const totalRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length ? totalRatings / reviews.length : 0;

  // Find the product and update its rating
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  product.rating = Math.round(averageRating * 10) / 10;

  // Save the updated product
  await product.save();

  return product; // Return the updated product
};

module.exports = updateAverageRating;
