const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
            sites[ind] = req.body.site;
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