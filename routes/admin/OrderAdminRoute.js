const express = require("express");
const {
  getRecentOrders,
  getAllOrders,
  createOrder,
  getAllOrderItems,
  getAllOrderShipping,
  getAllTransactionOrders,
  updateTrackingNumber,
  updateOrder,
  getOrderById,
} = require("../../controllers/admin/OrderController");
const {
  createAdminPayment,
} = require("../../controllers/admin/PaymentAdminRoute.js");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const OrderAdminRoute = express.Router();

OrderAdminRoute.post(
  "/create/admin/payment",
  verifyAdminToken,
  checkRole(1),
  createAdminPayment
);
OrderAdminRoute.post(
  "/create/admin/orders",
  verifyAdminToken,
  checkRole(1),
  createOrder
);
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

OrderAdminRoute.post(
  "/order/update-tracking",
  verifyAdminToken,
  checkRole(1),
  updateTrackingNumber
);

OrderAdminRoute.put(
  "/update/order/:id",
  verifyAdminToken,
  checkRole(1),
  updateOrder
);
OrderAdminRoute.get(
  "/get/order/:id",
  verifyAdminToken,
  checkRole(1),
  getOrderById
);
module.exports = OrderAdminRoute;
