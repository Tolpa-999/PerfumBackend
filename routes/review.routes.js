const express = require('express');
const { body } = require('express-validator');


const controllers = require('../controller/reviews.controller');
const { updateAverageRating } = require('../middlewares/updateAverageRaing');
const verifyToken = require('../middlewares/verifyToken');

const reviewRoutes = express.Router()


reviewRoutes.route('/:productId')
    .get(controllers.getReviews)
    .post(verifyToken, controllers.addReview)
    // .delete(controllers.deleteReview)

reviewRoutes.route('/:productId/:reviewId')
    .delete(verifyToken, controllers.deleteReview)


module.exports = reviewRoutes