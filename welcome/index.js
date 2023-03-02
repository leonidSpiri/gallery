const morning = require('./morning');
const afternoon = require('./afternoon');
const evening = require('./evening');
let currentDate = new Date();
global.date = currentDate;

function greeting() {
    let hour = currentDate.getHours();
    if (hour > 16)
        return evening + " " + global.name;
    else if (hour > 10)
        return afternoon + " " + name;
    else
        return morning + " " + name;
}

module.exports = {
    getMorningMessage: function () {
        return morning;
    },
    getEveningMessage: function () {
        return evening;
    },
    getGreetingMessage: greeting()
}