const express = require('express');
const { body } = require('express-validator');


const controllers = require('../controller/reviews.controller');
const { updateAverageRating } = require('../middlewares/updateAverageRaing');

const reviewRoutes = express.Router()


reviewRoutes.route('/:productId')
    .get(controllers.getReviews)
    .post(controllers.addReview)
    // .delete(controllers.deleteReview)

reviewRoutes.route('/:productId/:reviewId')
    .delete(controllers.deleteReview)


module.exports = reviewRoutes