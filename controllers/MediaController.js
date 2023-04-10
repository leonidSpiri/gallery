const crypto = require('crypto');
const Minio = require('minio');
const {Pool} = require('pg');
const ExifImage = require('exif').ExifImage;
const resizeImg = require('resize-image-buffer');
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

//localhost:3000/upload
exports.upload = async function (req, response) {
    try {
        const bucketName = "user-" + req.userTokenDecoded.user_id
        pool.connect(function (err, sql, done) {
            if (err) {
                return console.error('connexion error', err);
            }
            if (!req.files) {
                response.status(404).send("File was not found");
                done()
                return;
            }
            const files = req.files;

            const requestAlbum = "SELECT album_id FROM album WHERE user_id = '" + req.userTokenDecoded.user_id.toString() + "' AND description = 'all';";
            console.log(requestAlbum)
            sql.query(requestAlbum, async function (err2, resultAlbum) {
                if (err2) {
                    console.log(err2);
                    response.status(500).send(serverError(err));
                    done()
                }
                const album_id = resultAlbum.rows[0].album_id;
                const media_id = crypto.randomBytes(16).toString("hex");
                const media_type = files.file.mimetype;
                const original_name = files.file.name;
                const fileExtension = "." + original_name.split('.').pop();
                let original_geo_location = "";
                let timestamp = Date.now();
                let original_camera_info = "";
                let description = "";
                await new ExifImage({image: files.file.data}, async function (error, exifData) {
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
                            let original_date_created = exifData.exif.CreateDate;
                            console.log(original_date_created)
                            if (original_date_created === undefined) {
                                original_date_created = exifData.image.ModifyDate;
                                console.log(original_date_created)
                            }
                            if (original_date_created === undefined) {
                                original_date_created = exifData.exif.DateTimeOriginal;
                                console.log(original_date_created)
                            }
                            if (original_date_created === undefined) {
                                console.log(original_date_created)
                            } else {
                                const dateParts = original_date_created.split(/[ :]/);
                                console.log(dateParts)
                                const dateObj = new Date(
                                    Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], dateParts[3], dateParts[4], dateParts[5])
                                );
                                timestamp = dateObj.getTime();
                            }
                        }
                        if (exifData.image !== undefined) {
                            original_camera_info = exifData.image.Make + " " + exifData.image.Model;
                            if (exifData.image.ImageDescription !== undefined)
                                description = exifData.image.ImageDescription;
                        }
                    }


                    const file_location = media_id + fileExtension;
                    const requestMedia = "insert into media (media_id, description, file_location, media_type, date_created, geo_location, camera_info, is_favourite, is_deleted, original_name)" +
                        " values ('" + media_id + "', '" + description + "', '" + file_location + "', '" + media_type + "', '" + timestamp + "', '" + original_geo_location + "', '" + original_camera_info + "', 'false', 'false', '" + original_name + "');";
                    console.log(requestMedia)

                    await sql.query(requestMedia, async function (err2) {
                        if (err2) {
                            console.log(err2);
                            response.status(500).send(serverError(err));
                            done()
                            return
                        }


                        const requestMediaRelation = "insert into media_relation (media_id, album_id) values ('" + media_id + "', '" + album_id + "');";
                        console.log(requestMediaRelation)

                        await sql.query(requestMediaRelation, async function (err2) {
                            if (err2) {
                                console.log(err2);
                                await sql.query("DELETE FROM media WHERE media_id = '" + media_id + "';", function (err2) {
                                });
                                response.status(500).send(serverError(err));
                                done()
                                return
                            }
                        });
                    });
                    minioClient.putObject(bucketName, file_location, files.file.data, files.file.size, media_type, async function (err) {
                        if (err) {
                            console.log(err)
                            await sql.query("DELETE FROM media_relation WHERE media_id = '" + media_id + "';", function (err2) {
                            });
                            await sql.query("DELETE FROM media WHERE media_id = '" + media_id + "';", function (err2) {
                            });
                            response.status(500).send(serverError(err));
                            done()
                            return
                        }

                        let mediaJson = {
                            "media_id": media_id,
                            "album_id": album_id,
                            "description": description,
                            "file_location": file_location,
                            "media_type": media_type,
                            "date_created": timestamp,
                            "geo_location": original_geo_location,
                            "camera_info": original_camera_info,
                            "original_name": original_name,
                            "is_favourite": false,
                            "is_deleted": false
                        }
                        const myResponse = new responseModel(null, mediaJson, "Success");
                        response.status(200).json(myResponse.toJson()).end();
                        done()
                    })
                });
            });
        });
    } catch (err) {
        console.log(err);
        response.status(500).send(serverError(err));
    }
}


//localhost:3000/users_photo_list/all
exports.userPhotoList = async function (req, response) {
    try {
        pool.connect(function (err, sql, done) {
            if (err) {
                return console.error('connexion error', err);
            }

            const user_id = req.userTokenDecoded.user_id;
            const album = req.params["album"];
            const photosArray = []

            const requestAlbum = "SELECT album_id FROM album WHERE user_id = '" + user_id.toString() + "' AND description = '" + album + "';";
            console.log(requestAlbum)

            sql.query(requestAlbum, async function (err, resultAlbum) {
                if (err) {
                    console.log(err);
                    response.status(500).send(serverError(err));
                    done()
                    return
                }
                if (resultAlbum.rows.length === 0) {
                    const myResponse = new responseModel("Some error occurred", {}, "Not found");
                    response.status(404).send(myResponse.toJson())
                    done()
                    return
                }
                const album_id = resultAlbum.rows[0].album_id;
                const requestMedia = "SELECT m.*\n" +
                    "FROM media m\n" +
                    "         JOIN media_relation mr ON m.media_id = mr.media_id\n" +
                    "WHERE mr.album_id = '" + album_id + "';";
                console.log(requestMedia)
                await sql.query(requestMedia, function (err2, resultMedia) {
                    if (err2) {
                        console.log(err2);
                        response.status(500).send(serverError(err));
                        done()
                        return
                    }
                    if (resultMedia.rows.length === 0) {
                        const myResponse = new responseModel("Some error occurred", {}, "Not found");
                        response.status(404).send(myResponse.toJson())
                        done()
                        return
                    }
                    for (let i = 0; i < resultMedia.rows.length; i++) {
                        let json = {
                            "media_id": resultMedia.rows[i].media_id,
                            "album_id": album_id,
                            "description": resultMedia.rows[i].description,
                            "file_location": resultMedia.rows[i].file_location,
                            "media_type": resultMedia.rows[i].media_type,
                            "date_created": resultMedia.rows[i].date_created,
                            "geo_location": resultMedia.rows[i].geo_location,
                            "camera_info": resultMedia.rows[i].camera_info,
                            "original_name": resultMedia.rows[i].original_name,
                            "is_favourite": resultMedia.rows[i].is_favourite,
                            "is_deleted": resultMedia.rows[i].is_deleted
                        }
                        photosArray.push(json);
                    }
                    const myResponse = new responseModel(null, photosArray, "Success");
                    response.status(200).json(myResponse.toJson()).end;
                    sql.end
                    done()
                });

            });
        });
    } catch (err) {
        console.log(err);
        response.status(500).send(serverError(err));
    }
}


//localhost:3000/download_photo/thumbnail?fileName=photo.jpg
exports.downloadPhoto = async function (req, response) {
    try {
        pool.connect(function (err, sql, done) {
            if (err) {
                return console.error('connexion error', err);
            }
            let fullPhoto = true
            if (req.params["size"] === "thumbnail")
                fullPhoto = false;

            const bucketName = "user-" + req.userTokenDecoded.user_id;
            let data;
            minioClient.getObject(bucketName, req.query.fileName, function (err, objStream) {
                    if (err) {
                        response.status(500).send(serverError(err));
                        done()
                        return console.log(err)
                    }
                    objStream.on('data', function (chunk) {
                        data = !data ? new Buffer.from(chunk) : Buffer.concat([data, chunk]);
                    })
                    objStream.on('end', function () {
                        if (!fullPhoto) {
                            (async () => {
                                const image = await resizeImg(data, {
                                    width: 130
                                });
                                response.write(image);
                                response.end();
                            })();
                        } else {
                            response.write(data);
                            response.end();
                        }
                    })
                    objStream.on('error', function (err) {
                        response.status(500).send(serverError(err));
                    })
                }
            );
            minioClient.end
            done()
        });
    } catch
        (err) {
        console.log(err);
        response.status(500).send(serverError(err));
    }
}

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
    let dd = degrees + (minutes / 60) + (seconds / 3600);
    if (direction === "S" || direction === "W")
        dd = dd * -1;
    return dd.toFixed(6);
}

function serverError(err) {
    const myResponse = new responseModel("Server Error", {}, err.toString());
    return myResponse.toJson();
}