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
        verifyEmailCode: {
            type: Number,
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        emailChanged: {
            type: Date,
            default: Date.now(),
        }
    }

});

module.exports = mongoose.model('User', UserSchema);