const express = require("express");
const verifyToken = require('../controllers/VerifyToken');
const mediaController = require("../controllers/MediaController");
const mediaRouter = express.Router();

mediaRouter.use("/media_list/:album", verifyToken, mediaController.userPhotoList);
mediaRouter.use("/upload_media", verifyToken, mediaController.upload);
mediaRouter.use("/download_media/:size/:type", verifyToken, mediaController.downloadPhoto);
//TODO: /update_media
//TODO: /delete_media
//TODO: /user_albums

module.exports = mediaRouter;