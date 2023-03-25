const express = require("express");
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const Minio = require('minio');
const {Pool} = require('pg');

const minioClient = new Minio.Client({
    endPoint: 'home-system.sknt.ru',
    port: 2790,
    useSSL: false,
    accessKey: 'minio123',
    secretKey: 'minio123'
});

const sql = new Pool({
    user: 'admin',
    database: 'gallery',
    password: 'root',
    port: 271,
    host: 'home-system.sknt.ru',
});


//localhost:3000/user/registration
exports.registration = async function (request, response) {
    console.log(request.body);
    if (!request.body) return response.sendStatus(400);
    else {
        try {
            let userName = request.body.userName;
            let userEmail = request.body.userEmail;
            let password = request.body.userPassword;
            if ((userName === '' || userEmail === '' || password === '') || (userName === undefined || userEmail === undefined || password === undefined)) {
                response.status(400).send("All input is required");
                console.log("All input is required");
                return
            }

            await sql.connect()
            await sql.query("select * from users where email = '" + userEmail + "';",
                async function (err, results) {
                    if (err) {
                        console.log(err);
                        response.status(500).send("Server error");
                        return
                    }

                    console.log(results.rowCount);
                    if (results.rowCount > 0) {
                        console.log("User Already Exist. Please Login");
                        response.status(409).send("User Already Exist. Please Login");
                        return
                    } else {
                        const user_id = crypto.randomUUID();
                        const album_id = crypto.randomBytes(16).toString("hex");
                        const passwordHash = crypto.createHash('md5').update(password).digest('hex');
                        const accessToken = jwt.sign(
                            {user_id: user_id, userEmail: userEmail.toString()},
                            "secretKey",
                            {
                                expiresIn: "10d",
                            }
                        );
                        const dateCreated = Date.now();

                        const requestUser = "insert into users (user_id, email, password_hash, username, date_created, access_token) values ('" + user_id + "', '" + userEmail.toString() + "', '" + passwordHash + "', '" + userName.toString() + "', '" + dateCreated + "', '" + accessToken + "');";
                        console.log(requestUser)
                        await sql.query(requestUser, async function (err) {
                            if (err) {
                                console.log(err);
                                response.status(500).send("Server error");
                                return
                            }
                        });
                        const bucketName = "user-" + user_id
                        await minioClient.makeBucket(bucketName, function (err2) {
                            if (err2) {
                                console.log("error on creating bucket", err2);
                                response.status(500).send("Server error");
                            } else {
                                console.log("bucket created successfully");
                            }
                        });

                        const requestAlbum = "insert into album (album_id, user_id, description, avatar_location) values ('" + album_id + "', '" + user_id + "', 'all', '/');";
                        console.log(requestAlbum)
                        await sql.query(requestAlbum, function (err2) {
                            if (err2) {
                                console.log(err2);
                                response.status(500).send("Server error");
                            }
                            response.status(201).json({accessToken: accessToken});
                        });

                    }
                });
        } catch (err) {
            console.log(err);
            response.status(500).send("Server error");
        }
    }
}

//localhost:3000/user/login
exports.login = async function (request, response) {
    console.log(request.body);
    if (!request.body) return response.sendStatus(400);
    else {
        let userEmail = request.body.userEmail.toString();
        let password = request.body.userPassword.toString();
        if ((userEmail === '' || password === '') || (userEmail === undefined || password === undefined)) {
            response.status(400).send("All input is required");
            console.log("All input is required");
            return
        }
        try {
            await sql.connect()
            await sql.query("select * from users where email = '" + userEmail + "';",
                async function (err, results) {
                    if (err) {
                        console.log(err);
                        response.status(500).send("Server error");
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
                            response.status(403).send("Password is not correct");
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
                                    response.status(500).send("Server error");
                                    return
                                }
                                response.status(200).json(user);
                            });
                    } else {
                        console.log("User Not Exist. Please Register");
                        response.status(404).send("User Not Exist. Please Register");
                    }
                });
        } catch (err) {
            console.log(err);
            response.status(500).send("Server error");
        }
    }
}
