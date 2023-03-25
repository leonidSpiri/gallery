module.exports = class User {
    constructor(user_id, email, password_hash, username, date_created, access_token) {
        this.user_id = user_id;
        this.email = email;
        this.password_hash = password_hash;
        this.username = username;
        this.date_created = date_created;
        this.access_token = access_token;
    }
}