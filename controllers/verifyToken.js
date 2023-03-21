import pkg from 'pg';
import jwt from 'jsonwebtoken';

const {Pool} = pkg;

const sql = new Pool({
    user: 'admin',
    database: 'gallery',
    password: 'root',
    port: 271,
    host: 'home-system.sknt.ru',
});

const verifyToken = async (req, res, next) => {
    const token = getToken(req).toString();
    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        req.userTokenDecoded = jwt.verify(token, "secretKey");

        let userToken;

        await sql.connect()
        await sql.query("SELECT access_token FROM users WHERE user_id ='" + req.userTokenDecoded.user_id + "';",
            async function (err, results, fields) {
                if (err) {
                    console.log(err);
                    response.status(500).send("Server error");
                    return
                }
                if (results.rows.length === 0) {
                    return res.status(401).send("Invalid Token");
                }
                userToken = results.rows[0].access_token.toString();
                console.log(userToken)
                if (token !== userToken) {
                    return res.status(401).send("Invalid Token");
                }
                console.log(req.userTokenDecoded)
                return next();
            });
    } catch (err) {
        return res.status(401).send("Invalid Token");
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

//module.exports = verifyToken;
export default verifyToken;