const express = require("express");

const {
  getProvinces,
  getCities,
  calculateCost,
} = require("../controllers/RajaOngkirController");

const RajaOngkirRoute = express.Router();

RajaOngkirRoute.get("/provinces", getProvinces);
RajaOngkirRoute.get("/cities", getCities);
RajaOngkirRoute.post("/calculate-shipping", calculateCost);
module.exports = RajaOngkirRoute;
