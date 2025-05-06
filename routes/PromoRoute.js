const express = require("express");

const { checkPromo } = require("../controllers/PromoController.js");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
const PromoCheckRoute = express.Router();

PromoCheckRoute.post("/promo/check", verifyUserToken, checkPromo);
module.exports = PromoCheckRoute;
