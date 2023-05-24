const pool = require('../config/AppConfig').pool;

const createAllTables = async () => {
    try {
        pool.connect(function (err, sql, done) {
            if (err) {
                console.error('connection error', err);
                return;
            }

            sql.query({query: sqlCode, timeout: 10000},
                async function (err, results) {
                    if (err) {
                        console.log(err);
                        done()
                        return
                    }
                    console.log(results)
                    done()
                });
        });
    } catch (err) {
        console.log(err);
    }
}
module.exports = createAllTables;

const sqlCode = "CREATE TABLE IF NOT EXISTS \"users\"\n" +
    "(\n" +
    "    user_id       varchar(255) PRIMARY KEY,\n" +
    "    email         varchar(255),\n" +
    "    password_hash varchar(255),\n" +
    "    username      varchar(255),\n" +
    "    date_created  varchar(255),\n" +
    "    access_token  varchar(255)\n" +
    ");\n" +
    "\n" +
    "CREATE TABLE IF NOT EXISTS album\n" +
    "(\n" +
    "    album_id        varchar(255) PRIMARY KEY,\n" +
    "    user_id         varchar(255),\n" +
    "    description     varchar(255),\n" +
    "    avatar_location varchar(255)\n" +
    ");\n" +
    "\n" +
    "CREATE TABLE IF NOT EXISTS media_relation\n" +
    "(\n" +
    "    id       BIGSERIAL PRIMARY KEY,\n" +
    "    album_id varchar(255),\n" +
    "    media_id varchar(255)\n" +
    ");\n" +
    "\n" +
    "CREATE TABLE IF NOT EXISTS media\n" +
    "(\n" +
    "    media_id      varchar(255) PRIMARY KEY,\n" +
    "    file_location varchar(255),\n" +
    "    description   text,\n" +
    "    media_type    varchar(255),\n" +
    "    date_created  varchar(255),\n" +
    "    geo_location  varchar(255),\n" +
    "    camera_info   varchar(255),\n" +
    "    original_name varchar(255),\n" +
    "    is_favourite  bool,\n" +
    "    is_deleted    bool\n" +
    ");\n" +
    "\n" +
    "ALTER TABLE album\n" +
    "    ADD FOREIGN KEY (user_id) REFERENCES \"users\" (user_id);\n" +
    "\n" +
    "ALTER TABLE media_relation\n" +
    "    ADD FOREIGN KEY (album_id) REFERENCES album (album_id);\n" +
    "\n" +
    "ALTER TABLE media_relation\n" +
    "    ADD FOREIGN KEY (media_id) REFERENCES media (media_id);"