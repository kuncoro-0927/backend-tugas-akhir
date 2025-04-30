const express = require("express");
const passport = require("../middleware/PassportGoogleOAuth.js");

const {
  registerUser,
  loginUser,
  loginWithGoogle,
  getUserData,
  logout,
  requestPasswordReset,
  resetPassword,
  refreshTokenHandler,
} = require("../controllers/AuthController");
const AuthRoute = express.Router();
// const verifyToken = require("../middleware/VerifyToken.js");
const { verifyUserToken } = require("../middleware/VerifyToken.js");
AuthRoute.post("/register", registerUser);
AuthRoute.post("/login", loginUser);
AuthRoute.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    prompt: "select_account",
  })
);

AuthRoute.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  loginWithGoogle
);

AuthRoute.post("/auth/logout", (req, res) => {
  res.cookie("jwt", "", { httpOnly: true, expires: new Date(0), path: "/" });
  res.status(200).json({ message: "Logout successful" });
});

AuthRoute.get("/userr", getUserData);

AuthRoute.post("/logout", logout);

AuthRoute.get("/verify-token", verifyUserToken, (req, res) => {
  res.status(200).json({
    user: req.user,
  });
});

AuthRoute.post("/refresh-token", refreshTokenHandler);
AuthRoute.post("/forgot-password", requestPasswordReset);
AuthRoute.post("/reset-password", resetPassword);
module.exports = AuthRoute;
