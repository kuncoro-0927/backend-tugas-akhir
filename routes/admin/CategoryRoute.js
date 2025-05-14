const express = require("express");
const {
  getAllCategories,
  createCategory,
  updateCategory,
  getCategoryById,
  deleteCategory,
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
CategoryAdminRoute.post(
  "/create/category",
  verifyAdminToken,
  checkRole(1),
  createCategory
);
CategoryAdminRoute.put(
  "/update/category/:id",
  verifyAdminToken,
  checkRole(1),
  updateCategory
);

CategoryAdminRoute.get(
  "/get/category/:id",
  verifyAdminToken,
  checkRole(1),
  getCategoryById
);
CategoryAdminRoute.delete(
  "/delete/category/:id",
  verifyAdminToken,
  checkRole(1),
  deleteCategory
);

CategoryAdminRoute.get("/user/categories", getAllCategories);

module.exports = CategoryAdminRoute;
