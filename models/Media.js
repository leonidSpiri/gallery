module.exports = class Media {
    constructor(media_id, album_id, description, file_location, media_type, date_created, geo_location, camera_info, is_favourite, is_deleted, original_name) {
        this.media_id = media_id;
        this.album_id = album_id;
        this.description = description;
        this.file_location = file_location;
        this.media_type = media_type;
        this.date_created = date_created;
        this.geo_location = geo_location;
        this.camera_info = camera_info;
        this.original_name = original_name;
        this.is_favourite = is_favourite;
        this.is_deleted = is_deleted;
    }
}