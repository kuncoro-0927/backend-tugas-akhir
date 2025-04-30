const express = require("express");
const { getAllUsers } = require("../../controllers/admin/UsersController");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const UsersAdminRoute = express.Router();

UsersAdminRoute.get("/all/users", verifyAdminToken, checkRole(1), getAllUsers);

module.exports = UsersAdminRoute;
