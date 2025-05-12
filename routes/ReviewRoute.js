const express = require("express");

const {
  getOrderedProductsByUser,
  addReviewForProduct,
  getUserReviews,
  getReviewsByProductId,
} = require("../controllers/ReviewController");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
const ReviewRoute = express.Router();

ReviewRoute.get(
  "/product/review/user",
  verifyUserToken,
  getOrderedProductsByUser
);
ReviewRoute.post("/add/review", verifyUserToken, addReviewForProduct);
ReviewRoute.get("/review/user", verifyUserToken, getUserReviews);
ReviewRoute.get("/review/product/:id", verifyUserToken, getReviewsByProductId);
module.exports = ReviewRoute;
