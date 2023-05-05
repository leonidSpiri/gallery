const express = require("express");
const viewController = require("../controllers/ViewController");
const viewRouter = express.Router();

viewRouter.use("/about", viewController.about);
viewRouter.use("/login", viewController.login);
viewRouter.use("/registration", viewController.registration);
viewRouter.use("/", viewController.home);

module.exports = viewRouter;