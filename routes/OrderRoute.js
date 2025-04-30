const express = require("express");

const {
  proceedToCheckout,
  getOrderDetails,
  updateOrderStatus,
  getUserOrdersWithDetails,
} = require("../controllers/OrdersController");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
const OrderRoute = express.Router();

OrderRoute.post("/checkout", verifyUserToken, proceedToCheckout);
OrderRoute.get("/detail/order/:orderId", verifyUserToken, getOrderDetails);
OrderRoute.patch("/order/:orderId/status", verifyUserToken, updateOrderStatus);
OrderRoute.get("/orders/user/full", verifyUserToken, getUserOrdersWithDetails);
module.exports = OrderRoute;
