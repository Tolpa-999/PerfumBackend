const express = require('express');
const controllers = require('../controller/products.conroller');
const { apiLimiter } = require('../middlewares/rateLimiter');
const productRoutes = express.Router()

productRoutes.route('/')
    .get(apiLimiter, controllers.getAllProducts)
    // .post(controllers.addProduct)

productRoutes.route('/:productId')
    .get(apiLimiter, controllers.getProduct)

module.exports = productRoutes;