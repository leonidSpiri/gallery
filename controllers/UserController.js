const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const Minio = require('minio');
const {Pool} = require('pg');
const responseModel = require('../models/ResponseModel');

const minioClient = new Minio.Client({
    endPoint: '192.168.1.2',//'home-system.sknt.ru',
    port: 9000,//2790,
    useSSL: false,
    accessKey: 'minio123',
    secretKey: 'minio123'
});

const pool = new Pool({
    user: 'admin',
    database: 'gallery',
    password: 'root',
    port: 5432,//271,
    host: '192.168.1.2',//'home-system.sknt.ru'
});

//localhost:3000/users/refresh_token
exports.refreshToken = async function (request, response) {
    const user_id = request.userTokenDecoded.user_id;
    try {
        pool.connect(function (err, sql, done) {
            if (err) {
                return console.error('connexion error', err);
            }

            sql.query("select * from users where user_id = '" + user_id + "';",
                async function (err, results) {
                    if (err) {
                        console.log(err);
                        response.status(500).send(serverError(err));
                        done()
                        return
                    }

                    const user = {
                        user_id: results.rows[0].user_id,
                        email: results.rows[0].email.toString(),
                        password_hash: results.rows[0].password_hash,
                        username: results.rows[0].username.toString(),
                        date_created: results.rows[0].date_created,
                        access_token: results.rows[0].access_token
                    }
                    console.log(user);
                    const accessToken = jwt.sign(
                        {user_id: user.user_id, userEmail: user.email.toString()},
                        "secretKey",
                        {
                            expiresIn: "10d",
                        }
                    );
                    user.access_token = accessToken;
                    await sql.query("update users set access_token = '" + accessToken + "' where user_id = '" + user_id + "';",
                        function (err) {
                            if (err) {
                                console.log(err);
                                response.status(500).send(serverError(err));
                                done()
                                return
                            }
                            const myResponse = new responseModel(null, user, "Success");
                            response.status(200).json(myResponse.toJson());
                            done()
                        });
                });
        });
    } catch (e) {
        console.log(e);
        response.status(500).send(serverError(err));
    }
}


//localhost:3000/users/registration
exports.registration = async function (request, response) {
    console.log(request.body);
    if (!request.body) {
        const myResponse = new responseModel("Some error occurred", null, "All input is required");
        response.status(400).send(myResponse.toJson());
        return
    }

    try {
        let userName = request.body.userName;
        let userEmail = request.body.userEmail;
        let password = request.body.userPassword;
        if ((userName === '' || userEmail === '' || password === '') || (userName === undefined || userEmail === undefined || password === undefined)) {
            const myResponse = new responseModel("All input is required", null, "Some error occurred");
            response.status(400).send(myResponse.toJson());
            console.log("All input is required");
            return
        }

        pool.connect(function (err, sql, done) {
            if (err) {
                return console.error('connexion error', err);
            }
            sql.query("select * from users where email = '" + userEmail + "';",
                async function (err, results) {
                    if (err) {
                        console.log(err);
                        response.status(500).end(serverError(err));
                        done()
                        return
                    }

                    console.log(results.rowCount);
                    if (results.rowCount > 0) {
                        console.log("User Already Exist. Please Login");
                        const myResponse = new responseModel("Some error occurred", {}, "User Already Exist");
                        response.status(409).send(myResponse.toJson());
                        done()
                        return
                    }

                    const user_id = crypto.randomUUID();
                    let user = {
                        user_id: user_id,
                        email: userEmail,
                        userName: userName,
                    }
                    const album_id = crypto.randomBytes(16).toString("hex");
                    const passwordHash = crypto.createHash('md5').update(password).digest('hex');
                    user.password_hash = passwordHash;
                    const accessToken = jwt.sign(
                        {user_id: user_id, userEmail: userEmail.toString()},
                        "secretKey",
                        {
                            expiresIn: "10d",
                        }
                    );
                    user.access_token = accessToken;
                    const dateCreated = Date.now();
                    user.date_created = dateCreated.toString();

                    const requestUser = "insert into users (user_id, email, password_hash, username, date_created, access_token) values ('" + user_id + "', '" + userEmail.toString() + "', '" + passwordHash + "', '" + userName.toString() + "', '" + dateCreated + "', '" + accessToken + "');";
                    console.log(requestUser)
                    await sql.query(requestUser, async function (err) {
                        if (err) {
                            console.log(err);
                            response.status(500).send(serverError(err));
                            done()
                        }
                    });
                    const bucketName = "user-" + user_id
                    await minioClient.makeBucket(bucketName, async function (err2) {
                        if (err2) {
                            console.log("error on creating bucket", err2);
                            const requestDeleteUser = "delete from users where user_id = '" + user_id + "';";
                            await sql.query(requestDeleteUser, function (err3) {
                                response.status(500).send(serverError(err2));
                                done()
                            });
                        } else {
                            console.log("bucket created successfully");
                        }
                    });

                    const requestAlbum = "insert into album (album_id, user_id, description, avatar_location) values ('" + album_id + "', '" + user_id + "', 'all', '/');";
                    console.log(requestAlbum)
                    await sql.query(requestAlbum, function (err2) {
                        if (err2) {
                            console.log(err2);
                            response.status(500).send(serverError(err2));
                            done()
                        }
                        const myResponse = new responseModel(null, user, "Success");
                        response.status(201).send(myResponse.toJson());
                        done()
                    });

                });
        });
    } catch (err) {
        console.log(err);
        response.status(500).send(serverError(err));
    }
}

//localhost:3000/users/login
exports.login = async function (request, response) {
    console.log(request.body);
    if (!request.body) {
        const myResponse = new responseModel("Some error occurred", {}, "All input is required");
        response.status(400).send(myResponse.toJson());
        return
    }
    var userEmail = request.body.userEmail;
    let password = request.body.userPassword;
    if ((userEmail === '' || password === '') || (userEmail === undefined || password === undefined)) {
        const myResponse = new responseModel("Some error occurred", {}, "All input is required");
        response.status(400).send(myResponse.toJson());
        console.log(myResponse.toJson());
        return
    }
    userEmail = userEmail.toString();
    password = password.toString();
    try {
        pool.connect(function (err, sql, done) {
            if (err) {
                return console.error('connexion error', err);
            }
            sql.query("select * from users where email = '" + userEmail + "';",
                async function (err, results) {
                    if (err) {
                        console.log(err);
                        response.status(500).send(serverError(err));
                        done()
                        return
                    }

                    if (results.rowCount === 1) {
                        const user = {
                            user_id: results.rows[0].user_id,
                            email: results.rows[0].email.toString(),
                            password_hash: results.rows[0].password_hash,
                            username: results.rows[0].username.toString(),
                            date_created: results.rows[0].date_created,
                            access_token: results.rows[0].access_token
                        }
                        console.log(user);
                        const user_id = user.user_id;
                        const newPasswordHash = crypto.createHash('md5').update(password).digest('hex');
                        const oldPasswordHash = user.password_hash;
                        if (newPasswordHash !== oldPasswordHash) {
                            console.log("Password is not correct");
                            const myResponse = new responseModel("Some error occurred", {}, "Password is not correct");
                            response.status(403).send(myResponse.toJson());
                            done()
                            return
                        }

                        const accessToken = jwt.sign(
                            {user_id: user_id, userEmail: userEmail.toString()},
                            "secretKey",
                            {
                                expiresIn: "10d",
                            }
                        );
                        user.access_token = accessToken;
                        await sql.query("update users set access_token = '" + accessToken + "' where user_id = '" + user_id + "';",
                            function (err) {
                                if (err) {
                                    console.log(err);
                                    response.status(500).send(serverError(err));
                                    return
                                }
                                const myResponse = new responseModel(null, user, "Success");
                                response.status(200).json(myResponse.toJson());
                                done()
                            });
                    } else {
                        console.log("User Not Exist. Please Register");
                        const myResponse = new responseModel("Some error occurred", {}, "User Not Exist");
                        response.status(404).send(myResponse.toJson())
                        done()
                    }
                });
        });
    } catch (err) {
        console.log(err);
        response.status(500).send(serverError(err));
    }
}

function serverError(err) {
    const myResponse = new responseModel("Server Error", {}, err.toString());
    return myResponse.toJson();
}