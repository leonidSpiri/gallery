const jwt = require("jsonwebtoken");
const responseModel = require('../models/ResponseModel');
const pool = require('../config/AppConfig').pool;

const verifyToken = async (req, res, next) => {
    let token = getToken(req)
    if (!token) {
        const myResponse = new responseModel("Some error occurred", null, "A token is required for authentication");
        res.status(403).send(myResponse.toJson());
        return
    }
    token = token.toString();
    try {
        req.userTokenDecoded = jwt.verify(token, "secretKey");
        let userToken;
        return next();
        pool.connect(function (err, sql, done) {
            if (err) {
                console.error('connection error', err);
                return response.status(500).send(serverError("Ошибка подключения к базе данных. Проверьте подключение"));
            }
            sql.query("SELECT access_token FROM users WHERE user_id ='" + req.userTokenDecoded.user_id + "';",
                async function (err, results) {
                    if (err) {
                        console.log(err);
                        res.status(500).send(serverError(err));
                        done()
                        return
                    }
                    if (results.rows.length === 0) {
                        const myResponse = new responseModel("Some error occurred", {}, "Token not found");
                        done()
                        return res.status(404).send(myResponse.toJson());
                    }
                    userToken = results.rows[0].access_token.toString();
                    console.log(userToken)
                    if (token !== userToken) {
                        const myResponse = new responseModel("Some error occurred", {}, "Invalid Token");
                        done()
                        return res.status(401).send(myResponse.toJson());
                    }
                    console.log(req.userTokenDecoded)
                    done()
                    return next();
                });
        });
    } catch (err) {
        console.log(err);
        res.status(500).send(serverError(err));
    }
};

function getToken(req) {
    if (
        req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
        return req.headers.authorization.split(" ")[1];
    }
    return null;
}

function serverError(err) {
    const myResponse = new responseModel("Server Error", {}, err.toString());
    return myResponse.toJson();
}

module.exports = verifyToken;