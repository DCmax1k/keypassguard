const mongoose = require('mongoose');

const DeletedUserSchema = new mongoose.Schema({
    deletedOn: {
        type: Date,
        default: Date.now,
    },
    username: {
        type: String,
        default: "",
    },
    password: {
        type: String,
        required: false,
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
            default: null,
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        emailChanged: {
            type: Date,
            default: Date.now(),
        },
        resentEmailLast: {
            type: Date,
        },
        forgotPassword: {
            type: Object, 
            default: { tempCode: null, validUntil: null,  }
        }
    },
    pushtokens: [Object], // {token, deviceInfo, active}
    subscriptions: [Object], // {}
    extraDetails: {
        type: Object, // {ip, deviceInfo, lastLogin}
        default: {
            preferences: {},
        }
    },
    googleId: {
        type: String,
    },
    facebookId: {
        type: String,
    },
    appleId: {
        type: String,
    }

});

module.exports = mongoose.model('DeletedUser', DeletedUserSchema);