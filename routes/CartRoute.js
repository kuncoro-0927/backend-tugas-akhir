const express = require("express");

const {
  addToCart,
  getCartItems,
  updateCartItem,
  deleteCartItem,
  getCartByUserId,
} = require("../controllers/CartController");
const upload = require("../middleware/Multer");
const { verifyUserToken } = require("../middleware/VerifyToken.js");

const CartRoute = express.Router();

CartRoute.post(
  "/add/to/cart",
  upload.single("image"),
  verifyUserToken,
  addToCart
);
CartRoute.get("/get/cart", verifyUserToken, getCartItems);
CartRoute.get("/get/cart/user/:user_id", verifyUserToken, getCartByUserId);
CartRoute.patch("/update/cart/:id", verifyUserToken, updateCartItem);
CartRoute.delete("/delete/cart/:id", verifyUserToken, deleteCartItem);

module.exports = CartRoute;
