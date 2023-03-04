const express = require("express");
const app = express();
const urlencodedParser = express.urlencoded({extended: false});
const jsonParser = express.json();
const crypto = require('crypto');

app.use(function (request, response, next) {
    console.log("Middleware");
    next();
});

//localhost:3000/redirect
app.use("/redirect", function (request, response) {
    response.redirect(302, "https://google.com")
});

//localhost:3000/static/about.html
//localhost:3000/static/user/registration.html
app.use("/static", express.static(__dirname + "/viewa"));


//localhost:3000/
app.get("/", function (request, response) {
    response.status(200);
    response.send("<h1>Главная страница</h1>");
});

//localhost:3000/about
app.get("/about", function (request, response) {
    response.status(200);
    response.send("<h1>О сайте</h1>");
});

//localhost:3000/contact?id=1&name=admin
app.get("/contact", function (request, response) {
    let id = request.query.id;
    let userName = request.query.name;
    response.status(200).send("<h1>Контакты</h1> <p>id=" + id + "</p><p>name=" + userName + "</p>");
});

//localhost:3000/categories/image/id/8
app.get("/categories/:categoryId/id/:productId", function (request, response) {
    let catId = request.params["categoryId"];
    let prodId = request.params["productId"];
    response.send(`Категория: ${catId}  ID: ${prodId}`);
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