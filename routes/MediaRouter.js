const express = require("express");
const verifyToken = require('../controllers/VerifyToken');
const mediaController = require("../controllers/MediaController.js");
const mediaRouter = express.Router();

mediaRouter.use("/users_photo_list/:album", verifyToken, mediaController.userPhotoList);
mediaRouter.use("/upload", verifyToken, mediaController.upload);
mediaRouter.use("/download_photo/:size", verifyToken, mediaController.downloadPhoto);

module.exports = mediaRouter;