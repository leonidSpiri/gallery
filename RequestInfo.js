function messageAboutRequest(request) {
    console.log('request.headers: ', request.headers);
    return 'Hello World!' +
        '\nYou request url:  ' + request.url +
        '\nYour method is: ' + request.method +
        '\nYour IP address is: ' + request.connection.remoteAddress;
}

module.exports.messageAboutRequest = messageAboutRequest;