const express = require("express");
const jsonParser = express.json();
const verifyToken = require('../controllers/VerifyToken');
const userController = require("../controllers/userController.js");
const userRouter = express.Router();

userRouter.use("/registration", jsonParser, userController.registration);
userRouter.use("/login", jsonParser, userController.login);
userRouter.use("/refresh_token", verifyToken, userController.refreshToken); //TODO: NOT CORRECT, when need to refresh token, it verified it, and will send error bacause it is expired.
//TODO: add table with user_id, date, ip_address, user_agent, token, token_expiration_date, is_expired
//TODO: /delete_user

module.exports = userRouter;