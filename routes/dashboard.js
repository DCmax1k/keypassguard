const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.CRYPTR_KEY);

const User = require('../models/User');
const {sendWelcomeEmail, sendVerifyNewEmail} = require('./util/sendEmail');

router.post('/addsite', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        const newSite = {
            id: Math.random() + '' + Date.now(),
            name: '',
            username: '',
            password: '',
            note: '',
        }
        user.sites.push(newSite);
        await user.save();
        res.json({
            status: 'success',
            site: newSite,
        });

    } catch(err) {
        console.error(err);
    }
});

router.post('/deletesite', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        const ind = user.sites.findIndex((s) => {return s.id === req.body.site.id});
        if (ind > -1) {
            user.sites.splice(ind, 1);
        }
        await user.save();
        res.json({
            status: 'success',

        });

    } catch(err) {
        console.error(err);
    }
});

router.post('/editsite', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const sites = user.sites;

        const ind = sites.findIndex((s) => {return s.id === req.body.site.id});
        
        if (ind > -1) {
            const encryptedPassword = cryptr.encrypt(req.body.site.password);
            
            sites[ind] = {
                ...req.body.site,
                password: encryptedPassword,
                };
        } else {
            console.error('Couldnt find site!');
        }
        user.sites = sites;
        await user.save();
        res.json({
            status: 'success',

        });

    } catch(err) {
        console.error(err);
    }
});

router.post('/requestdecrypt', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const site = req.body.site;
        const sites = user.sites;
        const ind = sites.findIndex((s) => {return s.id === site.id});

        let data;

        if (site.password.length === 0) {
            data = "";
        } else {
            const decrypted = cryptr.decrypt(sites[ind].password);

            data = btoa(decrypted);
        }

        res.json({
            status: 'success',
            data,
        });

    } catch(err) {
        console.error('Decryption Error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Decryption failed',
        });
    }
});

router.post('/changeusername', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const { newValue } = req.body;

        user.username = newValue;
        await user.save();

        res.json({
            status: 'success',
        });

    } catch(err) {
        console.error('Decryption Error:', err);
    }
});

router.post('/changeemail', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const { newValue } = req.body;

        const { email, username } = user;
        const verifyEmailCode = Math.floor(Math.random() * 900000) + 100000;

        user.email = newValue;
        user.settings.emailVerified = false;
        user.settings.verifyEmailCode = verifyEmailCode;
        user.settings.emailChanged = Date.now();
        await user.save();

        sendVerifyNewEmail(newValue, username, `https://www.keypassguard.com/login/verifyemail/${user._id}/${verifyEmailCode}`);
        
        res.json({
            status: 'success',
        });

    } catch(err) {
        console.error('Decryption Error:', err);
    }
});

router.post('/resendemail', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        const { email, username } = user;

        const time = Date.now();
        const emailChanged = user.settings.emailChanged;
        let verifyEmailCode = user.settings.verifyEmailCode;

        if (time - emailChanged > (1000 * 60 * 5)) {
            verifyEmailCode = Math.floor(Math.random() * 900000) + 100000;
            user.settings.verifyEmailCode = verifyEmailCode;
            await user.save();
        }

        sendVerifyNewEmail(email, username, `https://www.keypassguard.com/login/verifyemail/${user._id}/${verifyEmailCode}`);
        
        res.json({
            status: 'success',
        });

    } catch(err) {
        console.error(err);
    }
});

function authToken(req, res, next) {
    const token = req.cookies['auth-token'];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.userId;
        next();
    });
}

module.exports = router;