const express = require("express");
const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} = require("../../controllers/admin/ProductController");
const upload = require("../../middleware/Multer");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const ProductsAdminRoute = express.Router();

ProductsAdminRoute.get(
  "/all/products",
  verifyAdminToken,
  checkRole(1),
  getAllProducts
);

ProductsAdminRoute.post(
  "/create/product",
  upload.single("image"),
  verifyAdminToken,
  checkRole(1),
  createProduct
);
ProductsAdminRoute.put(
  "/update/product/:id",
  upload.single("image"),
  verifyAdminToken,
  checkRole(1),
  updateProduct
);

ProductsAdminRoute.delete(
  "/delete/product/:id",
  verifyAdminToken,
  checkRole(1),
  deleteProduct
);
ProductsAdminRoute.get(
  "/product/:id",
  verifyAdminToken,
  checkRole(1),
  getProductById
);

module.exports = ProductsAdminRoute;
