const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    dateJoined: {
        type: Date,
        default: Date.now,
    },
    rank: {
        type: String,
        default: "user",
    },
    // Premium features
    plus: {
        type: Boolean,
        default: false,
    },
    sites: {
        type: [Object],
        default: [],
    },
    settings: {
        type: Object,
        default: {

        }
    }

});

module.exports = mongoose.model('User', UserSchema);