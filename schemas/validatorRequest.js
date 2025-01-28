const Joi = require('joi');
const appError = require("../utils/appError")
const httpStatus = require("../utils/httpStatusText");

const schemas = {

    getAllUsers: Joi.object({
        page: Joi.number().min(1).max(100000).default(1).integer(),
        limit: Joi.number().min(1).max(100000).default(1).integer(),
    }),

    register: Joi.object({
        username: Joi.string().alphanum().min(5).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(30)
            .required()
    }),

    verifyEmail: Joi.object({
        token: Joi.string().required().max(500),
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(30).required()
    }),

    reset_password_request: Joi.object({
        email: Joi.string().email().required(),
    }),

    reset_password: Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string().min(8).max(30).required()
    }),

    refreshToken: Joi.object({
        refreshToken: Joi.string().max(500),
    }),

    accessToken: Joi.object({
        Authorization: Joi.string().max(500),
        authorization: Joi.string().max(500),
    }),

};

module.exports = (schemaName, body) => {
    const { error } = schemas[schemaName].validate(body);
    if (error) {
        // console.log(error)
        return appError.create(error.details[0].message, 400, httpStatus.FAIL)
    };
    return true;
};