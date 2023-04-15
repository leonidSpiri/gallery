const path = require('path');

//localhost:3000/
exports.home = function (req, res) {
    res.sendFile(path.join(__dirname, '../views/index.html'));
}

//localhost:3000/login
exports.login = function (req, res) {
    res.sendFile(path.join(__dirname, '../views/user/login.html'));
}

//localhost:3000/registration
exports.registration = function (req, res) {
    res.sendFile(path.join(__dirname, '../views/user/registration.html'));
}

//localhost:3000/about
exports.about = function (request, response) {
    let text = '{"about":"About page"}';
    let json = JSON.parse(text);
    response.json(json);
}