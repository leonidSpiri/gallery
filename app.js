const express = require("express");
const app = express();
const jsonParser = express.json();
const crypto = require('crypto');
const path = require("path");
const hbs = require("hbs");
const jwt = require("jsonwebtoken");
const MongoClient = require("mongodb").MongoClient;


const mongoClient = new MongoClient("mongodb://root:1@home-system.sknt.ru:270/", {useUnifiedTopology: true});

app.set("view engine", "hbs");
hbs.registerPartials(__dirname + "/views/partials");

(async () => {
    try {
        await mongoClient.connect();
        app.locals.db = mongoClient.db("gallery");
        app.listen(3000);
        console.log("Сервер ожидает подключения...");
    } catch (err) {
        return console.log(err);
    }
})();

app.use(function (request, response, next) {
    console.log("Middleware");
    next();
});


//localhost:3000/static/user/registration.html
app.use("/static", express.static(__dirname + "/views"));


//localhost:3000/user/profile.html
app.use("/user/profile.html", function (_, response) {
    response.render("user/profile.hbs", {
        title: "My profile",
        userName: "Root",
        userAge: "20",
        albumsVisible: true,
        albums: ["Sochi 2023", "Ladoga 2022", "Moscow 2023"],
    });
});


//localhost:3000/user/about.html
app.use("/about.html", function (_, response) {
    response.render("about.hbs");
});


//localhost:3000/
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});


//localhost:3000/about
app.get("/about", function (request, response) {
    let text = '{"about":"About page"}';
    let json = JSON.parse(text);
    response.json(json);
});


//localhost:3000/categories/image/id/8
app.get("/categories/:categoryId/id/:productId", function (request, response) {
    let catId = request.params["categoryId"];
    let prodId = request.params["productId"];
    let text = '{"categoryId":"' + catId + '", "productId":"' + prodId + '"}';
    let json = JSON.parse(text);
    response.json(json);
});


//localhost:3000/user/registration
app.post("/user/registration", jsonParser, async function (request, response) {
    console.log(request.body);
    if (!request.body) return response.sendStatus(400);
    else {
        let userName = request.body.userName.toString();
        let userAge = request.body.userAge.toString();
        let password = request.body.userPassword.toString();
        if (userName === '' || userAge === '' || password === '') {
            response.status(400).send("All input is required");
            console.log("All input is required");
            return
        }
        try {
            await mongoClient.connect();
            const db = app.locals.db;
            const collection = db.collection("users");
            const oldUser = await collection.findOne({userName});

            if (oldUser) {
                console.log("User Already Exist. Please Login" + oldUser);
                response.status(409).send("User Already Exist. Please Login");
                return
            }

            const uuid = crypto.randomUUID();
            const passwordHash = crypto.createHash('md5').update(password).digest('hex');
            const accessToken = jwt.sign(
                {user_id: uuid, userName},
                "secretKey",
                {
                    expiresIn: "10d",
                }
            );

            const user = {uuid, userName, userAge, passwordHash, accessToken};
            await collection.insertOne(user);
            console.log(user);
            response.status(201).json(user);

        } catch (err) {
            console.log(err);
            response.status(500).send("Server error");
        }
    }
});


//localhost:3000/user/login
app.post("/user/login", jsonParser, async function (request, response) {
    console.log(request.body);
    if (!request.body) return response.sendStatus(400);
    else {
        let userName = request.body.userName.toString();
        let password = request.body.userPassword.toString();
        if (userName === '' || password === '') {
            response.status(400).send("All input is required");
            console.log("All input is required");
            return
        }
        try {
            await mongoClient.connect();
            const db = app.locals.db;
            const collection = db.collection("users");
            const oldUser = await collection.findOne({userName});

            if (!oldUser) {
                console.log("User Not Exist. Please Register" + oldUser);
                response.status(404).send("User Not Exist. Please Register");
                return
            }
            const uuid = oldUser.uuid;
            const newPasswordHash = crypto.createHash('md5').update(password).digest('hex');
            const oldPasswordHash = oldUser.passwordHash;
            if (newPasswordHash !== oldPasswordHash) {
                console.log("Password is not correct");
                response.status(403).send("Password is not correct");
                return
            }

            const accessToken = jwt.sign(
                {user_id: uuid, userName},
                "secretKey",
                {
                    expiresIn: "10d",
                }
            );

            const user = {uuid, userName, newPasswordHash, accessToken};
            await collection.findOneAndUpdate({userName}, {$set: user})
            console.log(user);
            response.status(201).json(user);
        } catch (err) {
            console.log(err);
            response.status(500).send("Server error");
        }
    }
});


process.on("SIGINT", async () => {

    await mongoClient.close();
    console.log("Приложение завершило работу");
    process.exit();
});