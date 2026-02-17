const express = require("express");
const {
  getAllPromo,
  togglePromoStatus,
  getPromoById,
  addPromo,
  updatePromo,
  deletePromo,
  getAllReviews,
  getReviewById,
  deleteReview,
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

PromoCodesAdminRoute.delete(
  "/delete/promo/:id",
  verifyAdminToken,
  checkRole(1),
  deletePromo
);

PromoCodesAdminRoute.get(
  "/get/all/reviews",
  verifyAdminToken,
  checkRole(1),
  getAllReviews
);

PromoCodesAdminRoute.get(
  "/get/review/:id",
  verifyAdminToken,
  checkRole(1),
  getReviewById
);

PromoCodesAdminRoute.delete(
  "/delete/review/:id",
  verifyAdminToken,
  checkRole(1),
  deleteReview
);
module.exports = PromoCodesAdminRoute;
