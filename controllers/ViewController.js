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

//localhost:3000/profile
exports.profile = function (req, res) {
    res.sendFile(path.join(__dirname, '../views/user/profile.html'));
}

//localhost:3000/add_media
exports.add_media = function (req, res) {
    res.sendFile(path.join(__dirname, '../views/add_media.html'));
}