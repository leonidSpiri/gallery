const express = require("express");
const jsonParser = express.json();
const userController = require("../controllers/userController.js");
const userRouter = express.Router();

userRouter.use("/registration", jsonParser, userController.registration);
userRouter.use("/login", jsonParser, userController.login);
//TODO: /delete_user

module.exports = userRouter;