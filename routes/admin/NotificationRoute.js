const express = require("express");
const { getNotifications } = require("../../controllers/admin/Notification.js");
const { verifyAdminToken } = require("../../middleware/VerifyToken.js");
const { checkRole } = require("../../middleware/CheckRole.js");

const NotificationRoute = express.Router();

NotificationRoute.get(
  "/notification",
  verifyAdminToken,
  checkRole(1),
  getNotifications
);

module.exports = NotificationRoute;
