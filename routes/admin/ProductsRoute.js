const express = require("express");
const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getTopProducts,
  toggleProductStatus,
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

ProductsAdminRoute.get(
  "/top/product",
  verifyAdminToken,
  checkRole(1),
  getTopProducts
);

ProductsAdminRoute.put(
  "/toggle/status/:id",
  verifyAdminToken,
  checkRole(1),
  toggleProductStatus
);

module.exports = ProductsAdminRoute;
