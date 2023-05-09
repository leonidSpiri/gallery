const express = require("express");
const viewController = require("../controllers/ViewController");
const viewRouter = express.Router();

viewRouter.use("/add_media", viewController.add_media);
viewRouter.use("/login", viewController.login);
viewRouter.use("/registration", viewController.registration);
viewRouter.use("/profile", viewController.profile);
viewRouter.use("/", viewController.home);

module.exports = viewRouter;