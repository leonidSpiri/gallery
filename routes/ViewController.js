const express = require("express");
const viewController = require("../controllers/ViewController.js");
const viewRouter = express.Router();

viewRouter.use("/", viewController.home);
viewRouter.use("/about", viewController.about);

module.exports = viewRouter;