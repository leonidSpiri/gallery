//const express = require("express");
//const crypto = require('crypto');
//const path = require("path");
//const hbs = require("hbs");
//const jwt = require("jsonwebtoken");
//let busboy = require('connect-busboy')
//import {Pool} from 'pg';
//const fs = require("fs");
//const Minio = require('minio');
//const {Pool} = require('pg');
//const exifImage = require('exif').ExifImage;
//const verifyToken = require('./controllers/verifyToken');

import {fileTypeFromStream} from 'file-type';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import jwt from 'jsonwebtoken';
import busboy from 'connect-busboy';
import fs from 'fs';
import Minio from 'minio';
import pkg from 'pg';
import exifImage from 'exif';
import verifyToken from './controllers/verifyToken.js';

const {Pool} = pkg;


const app = express();
const jsonParser = express.json();


const minioClient = new Minio.Client({
    endPoint: '192.168.1.2',
    port: 9000,
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

export default app;
app.use(busboy());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

(async () => {
    try {
        app.listen(3000);
        console.log("Сервер ожидает подключения...");
    } catch (err) {
        return console.log(err);
    }
})();

app.use(function (request, response, next) {
    console.log("Middleware");
    next();
});


//localhost:3000/user/about.html
app.use("/about.html", function (_, response) {
    response.render("about.hbs");
});


//localhost:3000/
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});


//localhost:3000/about
app.get("/about", function (request, response) {
    let text = '{"about":"About page"}';
    let json = JSON.parse(text);
    response.json(json);
});


//localhost:3000/categories/image/id/8
app.get("/categories/:categoryId/id/:productId", function (request, response) {
    let catId = request.params["categoryId"];
    let prodId = request.params["productId"];
    let text = '{"categoryId":"' + catId + '", "productId":"' + prodId + '"}';
    let json = JSON.parse(text);
    response.json(json);
});

app.post('/upload', verifyToken, function (req, res) {
    try {
        const bucketName = "user-" + req.userTokenDecoded.user_id
        req.pipe(req.busboy);
        req.busboy.on('file', async function (fieldname, file) {

            const fileName = req.query.fileName;
            const fileType = await fileTypeFromStream(file)
            const filePath = 'images/' + fileName + "." + fileType.ext;
            const fstream = fs.createWriteStream(filePath);
            const metaData = {
                'Content-Type': fileType.mime,
                'fileName': fileName
            }
            console.log(metaData)
            console.log(filePath)
            file.pipe(fstream);
            fstream.on('close', async function () {

                await new exifImage({image: filePath}, function (error, exifData) {
                    if (error)
                        console.log('Error: ' + error.message);
                    else
                        console.log(exifData); // Do something with your data!
                });

                await minioClient.fPutObject(bucketName, fileName + "." + fileType.ext, filePath, metaData, function (err, etag) {
                    if (err) return console.log(err)
                    //fs.unlinkSync(filePath)
                    console.log('File uploaded successfully.')
                    res.status(200).send("File uploaded successfully.")
                });
            });


        });
    } catch (error) {
        console.log('Error: ' + error.message);
        res.status(500).send("Server error");
    }
});

app.get("/users_photo_list", verifyToken, async function (req, res) {
    try {
        const bucketName = "user-" + req.userTokenDecoded.user_id
        const objectsStream = minioClient.listObjects(bucketName, '', true)
        const photosNamesArray = []
        objectsStream.on('data', function (obj) {
            console.log(obj)
            photosNamesArray.push(obj.name)
        })
        objectsStream.on('error', function (e) {
            console.log(e)
            res.status(500).send("Server error");
        })
        objectsStream.on('end', function () {
            res.status(200).send(photosNamesArray)
        })

    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
});

app.get("/download_photo", verifyToken, async function (req, res) {
    try {
        const bucketName = "user-" + req.userTokenDecoded.user_id
        let data;
        minioClient.getObject(bucketName, req.query.fileName, function (err, objStream) {
            if (err) {
                return console.log(err)
            }
            objStream.on('data', function (chunk) {
                data = !data ? new Buffer.from(chunk) : Buffer.concat([data, chunk]);
            })
            objStream.on('end', function () {
                res.writeHead(200, {'Content-Type': 'image/jpeg'});
                res.write(data);
                res.end();
            })
            objStream.on('error', function (err) {
                res.status(500);
                res.send(err);
            })
        });


    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
});

//localhost:3000/user/registration
app.post("/user/registration", jsonParser, async function (request, response) {
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
                        const passwordHash = crypto.createHash('md5').update(password).digest('hex');
                        const accessToken = jwt.sign(
                            {user_id: user_id, userEmail: userEmail.toString()},
                            "secretKey",
                            {
                                expiresIn: "10d",
                            }
                        );
                        const dateCreated = Date.now();
                        const request = "insert into users (user_id, email, password_hash, username, date_created, access_token) values ('" + user_id + "', '" + userEmail.toString() + "', '" + passwordHash + "', '" + userName.toString() + "', '" + dateCreated + "', '" + accessToken + "');";
                        console.log(request)
                        await sql.query(request, function (err) {
                            if (err) {
                                console.log(err);
                                response.status(500).send("Server error");
                            }

                            const bucketName = "user-" + user_id
                            minioClient.makeBucket(bucketName, function (err2) {
                                if (err2) {
                                    console.log("error on creating bucket", err2);
                                    response.status(500).send("Server error");
                                } else {
                                    console.log("bucket created successfully");
                                    response.status(201).json({accessToken: accessToken});
                                }
                            });


                        });

                    }
                });
        } catch (err) {
            console.log(err);
            response.status(500).send("Server error");
        }
    }
});


//localhost:3000/user/login
app.post("/user/login", jsonParser, async function (request, response) {
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
                        const user = results.rows[0];
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
});


process.on("SIGINT", async () => {
    console.log("Приложение завершило работу");
    process.exit();
});