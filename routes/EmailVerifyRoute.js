const express = require("express");
const {
  verifyOTP,
  resendOtp,
  FormContact,
} = require("../controllers/EmailVerifyController");

const EmailRoute = express.Router();

EmailRoute.post("/verify-otp", verifyOTP);
EmailRoute.post("/resend-otp", resendOtp);
EmailRoute.post("/form/contact", FormContact);
module.exports = EmailRoute;
