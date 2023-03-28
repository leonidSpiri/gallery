module.exports = class ResponseModel {
    constructor(error, data, message) {
        this.error = error || "";
        this.data = data || "";
        this.message = message || "";
    }

    toJson() {
        return {
            error: this.error,
            data: this.data,
            message: this.message
        }
    }
}