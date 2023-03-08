const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = getToken(req);

    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        req.userTokenDecoded = jwt.verify(token, "secretKey");
    } catch (err) {
        return res.status(401).send("Invalid Token");
    }
    return next();
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

module.exports = verifyToken;