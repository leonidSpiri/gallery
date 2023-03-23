const express = require("express");
const app = express();
const jsonParser = express.json();
const crypto = require('crypto');
const path = require("path");
const jwt = require("jsonwebtoken");
let busboy = require('connect-busboy');
const Minio = require('minio');
const {Pool} = require('pg');
const fileUpload = require('express-fileupload');
const exifImage = require('exif').ExifImage;

const verifyToken = require('./controllers/verifyToken');

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

module.exports = app;
app.use(busboy());
app.use(express.json());
app.use(fileUpload(
    {
        limits: {fileSize: 1000 * 1024 * 1024},
    }
));
app.use(express.urlencoded({extended: true}));
(async () => {
    try {
        app.listen(3000);
        console.log("Сервер ожидает подключения...");
    } catch (err) {
        return console.log(err);
    }
})();


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

app.post('/upload', verifyToken, async function (req, res) {
    const bucketName = "user-" + req.userTokenDecoded.user_id
    await sql.connect()
    if (!req.files) {
        res.status(404).send("File was not found");
        return;
    }
    const files = req.files;

    const requestAlbum = "SELECT album_id FROM album WHERE user_id = '" + req.userTokenDecoded.user_id.toString() + "' AND description = 'all';";
    console.log(requestAlbum)
    await sql.query(requestAlbum, async function (err2, resultAlbum) {
        if (err2) {
            console.log(err2);
            res.status(500).send("Server error");
        }
        const album_id = resultAlbum.rows[0].album_id;
        const media_id = crypto.randomBytes(16).toString("hex");
        const media_type = files.file.mimetype;
        const original_name = files.file.name;
        const fileExtension = "." + original_name.split('.').pop();
        let original_geo_location = "";
        let timestamp = Date.now();
        let original_camera_info = "";
        await new exifImage({image: files.file.data}, async function (error, exifData) {
            if (error)
                console.log('Error: ' + error.message);
            else {
                console.log(exifData);
                if (exifData.gps !== undefined && exifData.gps.GPSLatitude !== undefined && exifData.gps.GPSLongitude !== undefined) {
                    const latDegree = exifData.gps.GPSLatitude[0];
                    const latMinute = exifData.gps.GPSLatitude[1];
                    const latSecond = exifData.gps.GPSLatitude[2];
                    const latDirection = exifData.gps.GPSLatitudeRef;

                    const latFinal = ConvertDMSToDD(latDegree, latMinute, latSecond, latDirection);

                    const lonDegree = exifData.gps.GPSLongitude[0];
                    const lonMinute = exifData.gps.GPSLongitude[1];
                    const lonSecond = exifData.gps.GPSLongitude[2];
                    const lonDirection = exifData.gps.GPSLongitudeRef;

                    const lonFinal = ConvertDMSToDD(lonDegree, lonMinute, lonSecond, lonDirection);
                    original_geo_location = latFinal + " " + lonFinal;
                }
                if (exifData.exif !== undefined) {
                    const original_date_created = exifData.exif.CreateDate;
                    const dateParts = original_date_created.split(/[ :]/);
                    const dateObj = new Date(
                        Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], dateParts[3], dateParts[4], dateParts[5])
                    );
                    timestamp = dateObj.getTime();
                }
                if (exifData.image !== undefined)
                    original_camera_info = exifData.image.Make + " " + exifData.image.Model;
            }


            const file_location = "http://home-system.sknt.ru:2790/" + bucketName + "/" + media_id;
            const requestMedia = "insert into media (media_id, album_id, description, file_location, media_type, date_created, geo_location, camera_info, is_favourite, is_deleted, original_name)" +
                " values ('" + media_id + "', '" + album_id + "', '', '" + file_location + "', '" + media_type + "', '" + timestamp + "', '" + original_geo_location + "', '" + original_camera_info + "', 'false', 'false', '" + original_name + "');";
            console.log(requestMedia)


            await sql.query(requestMedia, function (err2) {
                if (err2) {
                    console.log(err2);
                    res.status(500).send("Server error");
                    return
                }
            });
            minioClient.putObject(bucketName, media_id + fileExtension, files.file.data, files.file.size, media_type, function (err, etag) {
                if (err) {
                    console.log(err)
                    res.status(500).send("Server error");
                    return
                }
                res.status(200).send("File uploaded successfully.")
            })
        });


    });
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
                async function (err, results, fields) {
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
                        await sql.query(requestUser, async function (err, results, fields) {
                            if (err) {
                                console.log(err);
                                response.status(500).send("Server error");
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
                async function (err, results, fields) {
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
                            function (err, results, fields) {
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

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
    let dd = degrees + (minutes / 60) + (seconds / 3600);
    if (direction === "S" || direction === "W")
        dd = dd * -1;
    return dd.toFixed(6);
}


process.on("SIGINT", async () => {

    await mongoClient.close();
    console.log("Приложение завершило работу");
    process.exit();
});