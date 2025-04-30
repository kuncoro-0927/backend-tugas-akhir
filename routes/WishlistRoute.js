const express = require("express");

const {
  getWishlist,
  toggleWishlist,
  getWishlistUser,
} = require("../controllers/WishlistsController");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
const WishlistRoute = express.Router();

WishlistRoute.post("/wishlist", verifyUserToken, toggleWishlist);
WishlistRoute.get("/get/all/wishlist", verifyUserToken, getWishlist);
WishlistRoute.get("/get/wishlist/:userId", verifyUserToken, getWishlistUser);
module.exports = WishlistRoute;
