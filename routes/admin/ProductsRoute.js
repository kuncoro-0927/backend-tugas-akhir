const express = require("express");
const { getAllProducts } = require("../../controllers/admin/ProductController");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const ProductsAdminRoute = express.Router();

ProductsAdminRoute.get(
  "/all/products",
  verifyAdminToken,
  checkRole(1),
  getAllProducts
);

module.exports = ProductsAdminRoute;
