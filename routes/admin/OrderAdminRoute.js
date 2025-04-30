const express = require("express");
const {
  getRecentOrders,
  getAllOrders,
  getAllOrderItems,
  getAllOrderShipping,
  getAllTransactionOrders,
} = require("../../controllers/admin/OrderController");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const OrderAdminRoute = express.Router();

OrderAdminRoute.get(
  "/last/orders",
  verifyAdminToken,
  checkRole(1),
  getRecentOrders
);
OrderAdminRoute.get(
  "/all/orders",
  verifyAdminToken,
  checkRole(1),
  getAllOrders
);

OrderAdminRoute.get(
  "/all/order/items",
  verifyAdminToken,
  checkRole(1),
  getAllOrderItems
);

OrderAdminRoute.get(
  "/all/order/shipping",
  verifyAdminToken,
  checkRole(1),
  getAllOrderShipping
);
OrderAdminRoute.get(
  "/all/transactions",
  verifyAdminToken,
  checkRole(1),
  getAllTransactionOrders
);
module.exports = OrderAdminRoute;
