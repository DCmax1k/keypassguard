const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.CRYPTR_KEY);

const User = require('../models/User');

router.post('/addsite', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        const newSite = {
            id: Math.random() + Date.now(),
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