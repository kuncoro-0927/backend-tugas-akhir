const express = require("express");

const { saveShippingDetails } = require("../controllers/ShippingController");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
const ShippingRoute = express.Router();

ShippingRoute.post("/shipping/details", verifyUserToken, saveShippingDetails);

module.exports = ShippingRoute;
