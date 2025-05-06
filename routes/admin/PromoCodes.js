const express = require("express");
const {
  getAllPromo,
  togglePromoStatus,
} = require("../../controllers/admin/PromoCodeController");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const PromoCodesAdminRoute = express.Router();

PromoCodesAdminRoute.get(
  "/all/promo",
  verifyAdminToken,
  checkRole(1),
  getAllPromo
);

PromoCodesAdminRoute.put(
  "/toggle/:id",
  verifyAdminToken,
  checkRole(1),
  togglePromoStatus
);

module.exports = PromoCodesAdminRoute;
