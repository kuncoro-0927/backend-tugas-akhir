const express = require("express");
const {
  getTotalSales,
  getTodaySalesData,
  getTotalAmountSuccess,
} = require("../../controllers/admin/SalesController");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const SalesRoute = express.Router();

SalesRoute.get("/total/sales", verifyAdminToken, checkRole(1), getTotalSales);
SalesRoute.get(
  "/total/today/sales",
  verifyAdminToken,
  checkRole(1),
  getTodaySalesData
);
SalesRoute.get(
  "/total/amount",
  verifyAdminToken,
  checkRole(1),
  getTotalAmountSuccess
);
module.exports = SalesRoute;
