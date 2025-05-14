const express = require("express");

const { sendFeedback } = require("../controllers/FaqsController");

const FaqsRoute = express.Router();

FaqsRoute.post("/send/feedback", sendFeedback);

module.exports = FaqsRoute;
