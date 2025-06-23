const express = require("express");
const {
  getAllUsers,
  createUser,
  getRoles,
  updateUser,
  getUserById,
  deleteUser,
} = require("../../controllers/admin/UsersController");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const UsersAdminRoute = express.Router();

UsersAdminRoute.get("/all/users", verifyAdminToken, checkRole(1), getAllUsers);

UsersAdminRoute.post(
  "/create/users",
  verifyAdminToken,
  checkRole(1),
  createUser
);
UsersAdminRoute.get("/roles", verifyAdminToken, checkRole(1), getRoles);

UsersAdminRoute.put(
  "/update/users/:id",
  verifyAdminToken,
  checkRole(1),
  updateUser
);

UsersAdminRoute.get(
  "/get/users/:id",
  verifyAdminToken,
  checkRole(1),
  getUserById
);
UsersAdminRoute.delete(
  "/delete/users/:id",
  verifyAdminToken,
  checkRole(1),
  deleteUser
);
module.exports = UsersAdminRoute;
