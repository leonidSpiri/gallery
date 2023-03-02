const http = require('http');
const User = require('./User');
const RequestInfo = require('./RequestInfo');
const os = require("os");
global.name = 'admin';
const welcome = require('./welcome');


const server = http.createServer(function (request, response) {
    let userName = os.userInfo().username;
    let user = new User(userName, 128256);
    response.setHeader("userName", userName);
    response.writeHead(200, {'Content-Type': 'text/plain'});
    const message = RequestInfo.messageAboutRequest(request)
        + '\n' + user.sayHi() + '\n' + user.displayInfo()
        + '\n' + welcome.getGreetingMessage;

    response.write(message);
    response.end();
});

server.listen(3000, "127.0.0.1", function () {
    console.log('Server is listening on port 3000');
});