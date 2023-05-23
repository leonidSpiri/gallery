CREATE TABLE IF NOT EXISTS "users"
(
    user_id varchar
(
    255
) PRIMARY KEY,
    email varchar
(
    255
),
    password_hash varchar
(
    255
),
    username varchar
(
    255
),
    date_created varchar
(
    255
),
    access_token varchar
(
    255
)
    );

CREATE TABLE IF NOT EXISTS album
(
    album_id varchar
(
    255
) PRIMARY KEY,
    user_id varchar
(
    255
),
    description varchar
(
    255
),
    avatar_location varchar
(
    255
)
    );

CREATE TABLE IF NOT EXISTS media_relation
(
    id
    BIGSERIAL
    PRIMARY
    KEY,
    album_id
    varchar
(
    255
),
    media_id varchar
(
    255
)
    );

CREATE TABLE IF NOT EXISTS media
(
    media_id varchar
(
    255
) PRIMARY KEY,
    file_location varchar
(
    255
),
    description text,
    media_type varchar
(
    255
),
    date_created varchar
(
    255
),
    geo_location varchar
(
    255
),
    camera_info varchar
(
    255
),
    original_name varchar
(
    255
),
    is_favourite bool,
    is_deleted    bool
);

ALTER TABLE album
    ADD FOREIGN KEY (user_id) REFERENCES "users" (user_id);

ALTER TABLE media_relation
    ADD FOREIGN KEY (album_id) REFERENCES album (album_id);

ALTER TABLE media_relation
    ADD FOREIGN KEY (media_id) REFERENCES media (media_id);