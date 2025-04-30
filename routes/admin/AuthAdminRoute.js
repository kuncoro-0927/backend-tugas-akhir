const express = require("express");

const {
  loginAdmin,
  getAdminData,
  refreshAdminTokenHandler,
} = require("../../controllers/admin/AuthAdminController.js");

const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const AuthAdminRoute = express.Router();

AuthAdminRoute.post("/admin/login", loginAdmin);
AuthAdminRoute.get("/admin/me", verifyAdminToken, checkRole(1), getAdminData);
AuthAdminRoute.post("/admin-refresh-token", refreshAdminTokenHandler);
AuthAdminRoute.get("/verify-token", (req, res) => {
  res.status(200).json({
    user: req.user,
  });
});

module.exports = AuthAdminRoute;
