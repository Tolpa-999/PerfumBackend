const express = require('express');
const controllers = require('../controller/reviews.controller');
const verifyToken = require('../middlewares/verifyToken');
const { apiLimiter } = require('../middlewares/rateLimiter');

const reviewRoutes = express.Router()


reviewRoutes.route('/:productId')
    .get(apiLimiter, controllers.getReviews)
    .post(apiLimiter, verifyToken, controllers.addReview)
    // .delete(controllers.deleteReview)

reviewRoutes.route('/:productId/:reviewId')
    .delete(apiLimiter, verifyToken, controllers.deleteReview)


module.exports = reviewRoutes