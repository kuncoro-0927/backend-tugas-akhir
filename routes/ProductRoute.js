const express = require("express");

const {
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getFilteredProducts,
  getAllCategories,
} = require("../controllers/ProductController");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
const upload = require("../middleware/Multer");
const ProductRoute = express.Router();

ProductRoute.get("/product", getAllProducts);
ProductRoute.get("/category", getAllCategories);
ProductRoute.get("/filtered/product", getFilteredProducts);
ProductRoute.get("/product/:id", getProductById);
ProductRoute.put("/update/product", verifyUserToken, updateProduct);
ProductRoute.delete("/user/profile", verifyUserToken, deleteProduct);

module.exports = ProductRoute;
