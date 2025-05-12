const express = require("express");
const {
  getAllCategories,
} = require("../../controllers/admin/CategoryController");

const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const CategoryAdminRoute = express.Router();

CategoryAdminRoute.get(
  "/all/category",
  verifyAdminToken,
  checkRole(1),
  getAllCategories
);

module.exports = CategoryAdminRoute;
