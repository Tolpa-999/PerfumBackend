require('dotenv').config()
const cors = require("cors")
const express = require('express');
const app = express();
app.use(cors({
    origin: 'https://perfumeni.vercel.app', // Replace with your frontend's URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    credentials: true, // Allow cookies if needed
  }))


const mongoose = require('mongoose')

const url = process.env.MONGO_URL;

mongoose.connect(url).then(() => {
    console.log("Connected succesfully")
})

const httpStatus = require("./utils/httpStatusText")

app.use(express.json())

const productRoutes = require("./routes/products.routes")
const reviewRoutes = require("./routes/review.routes")
app.use('/api/products', productRoutes)
app.use('/api/reviews', reviewRoutes)

app.all("*", (req, res) => {
    res.status(404).json({ status: httpStatus.ERROR, message: "resource not availble" })
})

app.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({ status: error.statusText || httpStatus.ERROR, message: error.message, code: error.statusCode || 500, data: null })
})


app.listen(process.env.PORT || 2000, () => {
    console.log("listening on port 2000")
})