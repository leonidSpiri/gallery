const express = require("express");
const app = express();
let busboy = require('connect-busboy');
const fileUpload = require('express-fileupload');
const userRouter = require("./routes/UserRouter.js");
const mediaRouter = require("./routes/MediaRouter.js");
const viewRouter = require("./routes/ViewRouter.js");

module.exports = app;
app.use(busboy());
app.use(express.json());
app.use(fileUpload(
    {
        limits: {fileSize: 1000 * 1024 * 1024},
    }
));
app.use(express.urlencoded({extended: true}));


(async () => {
    try {
        app.listen(3000);
        console.log("Сервер ожидает подключения...");
    } catch (err) {
        return console.log(err);
    }
})();


app.use("/users", userRouter);
app.use("/media", mediaRouter);
app.use("/", viewRouter);

process.on("SIGINT", async () => {
    console.log("Приложение завершило работу");
    process.exit();
});