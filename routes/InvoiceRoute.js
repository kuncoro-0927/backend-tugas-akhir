const express = require("express");

const { generateInvoice } = require("../controllers/InvoicesController");
const verifyToken = require("../middleware/VerifyToken");

const InvoiceRoute = express.Router();

InvoiceRoute.get("/invoice/:orderId", generateInvoice);

module.exports = InvoiceRoute;
