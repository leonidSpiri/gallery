module.exports = class Album {
    constructor(album_id, user_id, description, avatar_location) {
        this.album_id = album_id;
        this.user_id = user_id;
        this.description = description;
        this.avatar_location = avatar_location;
    }
}