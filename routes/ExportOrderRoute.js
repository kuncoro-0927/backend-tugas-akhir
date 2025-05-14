const express = require("express");

const { exportOrder } = require("../controllers/ExportOrdersController");
const { verifyAdminToken } = require("../middleware/VerifyToken.js");
const { checkRole } = require("../middleware/CheckRole.js");

const ExportOrderRoute = express.Router();

ExportOrderRoute.get("/export", verifyAdminToken, checkRole(1), exportOrder);

module.exports = ExportOrderRoute;
