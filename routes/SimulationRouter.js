const express = require("express");
const simulationController = require("../controllers/SimulationController");

const simulationRouter = express.Router();

simulationRouter.get("/factorial", simulationController.factorialSimulation);

module.exports = simulationRouter;
