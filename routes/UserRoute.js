const express = require("express");

const {
  getUserData,
  updateUserProfile,
  getTopUsers,
  getAll,
  getUserStats,
} = require("../controllers/UserController");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
const UserRoute = express.Router();

UserRoute.get("/user", verifyUserToken, getUserData);
UserRoute.get("/all/user", verifyUserToken, getAll);
UserRoute.get("/top/user", getTopUsers);
UserRoute.get("/stats/user", getUserStats);
UserRoute.put("/user/profile", verifyUserToken, updateUserProfile);

module.exports = UserRoute;
