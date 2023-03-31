const express = require("express");
const jsonParser = express.json();
const verifyToken = require('../controllers/VerifyToken');
const userController = require("../controllers/userController.js");
const userRouter = express.Router();

userRouter.use("/registration", jsonParser, userController.registration);
userRouter.use("/login", jsonParser, userController.login);
userRouter.use("/refresh_token", verifyToken, userController.refreshToken);
//TODO: /delete_user

module.exports = userRouter;