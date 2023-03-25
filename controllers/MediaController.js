const crypto = require('crypto');
const Minio = require('minio');
const {Pool} = require('pg');
const exifImage = require('exif').ExifImage;
const resizeImg = require('resize-image-buffer');

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

//localhost:3000/upload
exports.upload = async function (req, res) {
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


            const file_location = media_id + fileExtension;
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
            minioClient.putObject(bucketName, file_location, files.file.data, files.file.size, media_type, function (err) {
                if (err) {
                    console.log(err)
                    res.status(500).send("Server error");
                    return
                }
                res.status(200).send("File uploaded successfully.")
            })
        });
    });
}


//localhost:3000/users_photo_list/all
exports.userPhotoList = async function (req, res) {
    try {
        const user_id = req.userTokenDecoded.user_id;
        const album = req.params["album"];
        const photosArray = []

        const requestAlbum = "SELECT album_id FROM album WHERE user_id = '" + user_id.toString() + "' AND description = '" + album + "';";
        console.log(requestAlbum)

        await sql.query(requestAlbum, async function (err, resultAlbum) {
            if (err) {
                console.log(err);
                res.status(500).send("Server error");
                return
            }
            if (resultAlbum.rows.length === 0) {
                res.status(404).send("Not found");
                return
            }
            const album_id = resultAlbum.rows[0].album_id;
            const requestMedia = "SELECT * FROM media WHERE album_id = '" + album_id.toString() + "';";
            console.log(requestMedia)
            await sql.query(requestMedia, function (err2, resultMedia) {
                if (err2) {
                    console.log(err2);
                    res.status(500).send("Server error");
                    return
                }
                if (resultMedia.rows.length === 0) {
                    res.status(404).send("Not found");
                    return;
                }
                for (let i = 0; i < resultMedia.rows.length; i++) {
                    let json = {
                        "media_id": resultMedia.rows[i].media_id,
                        "album_id": resultMedia.rows[i].album_id,
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
                res.status(200).send(photosArray);
            });

        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
}


//localhost:3000/download_photo/thumbnail?fileName=photo.jpg
exports.downloadPhoto = async function (req, res) {
    try {
        let fullPhoto = true
        if (req.params["size"] === "thumbnail")
            fullPhoto = false;

        const bucketName = "user-" + req.userTokenDecoded.user_id;
        let data;
        minioClient.getObject(bucketName, req.query.fileName, function (err, objStream) {
                if (err) {
                    res.status(500).send("Server error");
                    return console.log(err)
                }
                objStream.on('data', function (chunk) {
                    data = !data ? new Buffer.from(chunk) : Buffer.concat([data, chunk]);
                })
                objStream.on('end', function () {
                    if (!fullPhoto) {
                        (async () => {
                            const image = await resizeImg(data, {
                                width: 200
                            });
                            res.write(image);
                            res.end();
                        })();
                    } else {
                        res.write(data);
                        res.end();
                    }
                })
                objStream.on('error', function (err) {
                    res.status(500);
                    res.send(err);
                })
            }
        )
        ;
    } catch
        (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
}

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
    let dd = degrees + (minutes / 60) + (seconds / 3600);
    if (direction === "S" || direction === "W")
        dd = dd * -1;
    return dd.toFixed(6);
}