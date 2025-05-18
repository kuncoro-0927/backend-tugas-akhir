const express = require("express");
const {
  getAllPromo,
  togglePromoStatus,
  getPromoById,
  addPromo,
  updatePromo,
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

PromoCodesAdminRoute.post(
  "/create/promo",
  verifyAdminToken,
  checkRole(1),
  addPromo
);
PromoCodesAdminRoute.put(
  "/update/promo/:id",
  verifyAdminToken,
  checkRole(1),
  updatePromo
);

PromoCodesAdminRoute.get(
  "/promo/:id",
  verifyAdminToken,
  checkRole(1),
  getPromoById
);

PromoCodesAdminRoute.put(
  "/toggle/:id",
  verifyAdminToken,
  checkRole(1),
  togglePromoStatus
);

module.exports = PromoCodesAdminRoute;
