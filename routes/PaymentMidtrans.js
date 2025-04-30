const express = require("express");

const {
  processPayment,
  handlePaymentCallback,
  verifyPayment,
} = require("../controllers/PaymentMidtrans");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
const PaymentRoute = express.Router();

PaymentRoute.post("/payment", verifyUserToken, processPayment);
PaymentRoute.post("/payment/callback", handlePaymentCallback);
PaymentRoute.get("/payment/status/:order_id", verifyPayment);
module.exports = PaymentRoute;
