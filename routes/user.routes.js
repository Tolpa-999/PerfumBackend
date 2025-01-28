const express = require('express');

const userRoute = express.Router();

const userController = require('../controller/users.controller');
const verifyToken = require('../middlewares/verifyToken');
const { authLimiter } = require('../middlewares/rateLimiter');


userRoute.route('/')
    // hint : get all users in trying testing stage
    // .get(verifyToken, userController.getAllUsers)
    .get(userController.getAllUsers)

userRoute.route('/register')
    .post( userController.register)

userRoute.route('/verify-email')
    .post(userController.verifyEmail)

userRoute.route('/login')
    // .post(authLimiter, userController.login)
    .post(userController.login)

// reset password
userRoute.route('/reset-pass-req')
    .post( userController.reset_password_request)
userRoute.route('/reset-pass')
    .post( userController.reset_password)



userRoute.route('/refresh')
    .get(userController.refreshToken)

userRoute.route('/logout')
    .get(userController.logout)

userRoute.route('/invalidate-sessions')
    .post(userController.invalidateSessions);

module.exports = userRoute;