const express = require("express");
const app = express();
const jsonParser = express.json();
const crypto = require('crypto');
const path = require("path");
const hbs = require("hbs");

app.set("view engine", "hbs");
hbs.registerPartials(__dirname + "/views/partials");


app.use(function (request, response, next) {
    console.log("Middleware");
    next();
});



//localhost:3000/static/user/registration.html
app.use("/static", express.static(__dirname + "/views"));




//localhost:3000/user/profile.html
app.use("/user/profile.html", function(_, response){
    response.render("user/profile.hbs", {
        title: "My profile",
        userName: "Root",
        userAge: "20",
        albumsVisible: true,
        albums: ["Sochi 2023", "Ladoga 2022", "Moscow 2023"],
    });
});


//localhost:3000/user/about.html
app.use("/about.html", function(_, response){
    response.render("about.hbs");
});



//localhost:3000/
app.get('/', function(req, res) {
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
app.post("/user/registration", jsonParser, function (request, response) {
    console.log(request.body);
    if (!request.body) return response.sendStatus(400);
    else {
        //response.statusCode = 200;
        let userName = request.body.userName.toString();
        let userAge = request.body.userAge.toString();
        let password = request.body.userPassword.toString();
        let userHash = crypto.createHash('md5').update(password).digest('hex');
        let text = '{"userName":"' + userName + '", "accessToken":"1dbd23456dfb7890dfb", "userAge":"' + userAge + '", "userHash":"' + userHash + '"}';
        let json = JSON.parse(text);
        response.json(json);
    }
});


app.listen(3000);