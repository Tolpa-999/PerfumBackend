const express = require('express');
const { body } = require('express-validator');


const controllers = require('../controller/products.conroller');

const productRoutes = express.Router()

productRoutes.route('/')
    .get(controllers.getAllProducts)
    .post(controllers.addProduct)

productRoutes.route('/:productId')
    .get(controllers.getProduct)

module.exports = productRoutes;