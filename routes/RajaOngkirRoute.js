const express = require("express");

const {
  getProvinces,
  getCities,
  calculateCost,
  trackWaybill,
} = require("../controllers/RajaOngkirController");

const RajaOngkirRoute = express.Router();

RajaOngkirRoute.get("/provinces", getProvinces);
RajaOngkirRoute.get("/cities", getCities);
RajaOngkirRoute.post("/calculate-shipping", calculateCost);
RajaOngkirRoute.post("/track/waybill", trackWaybill);
module.exports = RajaOngkirRoute;
