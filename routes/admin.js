const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const DeletedUser = require('../models/DeletedUser');

router.post('/load', authToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'username sites').lean();
        return res.json({
            status: 'success',
            users: users.map(({_id, username, sites}) => ({
                id: _id,
                username,
                sitesCount: sites.length,
            })),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 'error', message: 'Failed to load users'});
    }
});

router.post('/deletedusers', authToken, requireAdmin, async (req, res) => {
    try {
        const users = await DeletedUser.find({}, 'username sites').lean();
        return res.json({
            status: 'success',
            users: users.map(({_id, username, sites}) => ({
                id: _id,
                username,
                sitesCount: sites.length,
            })),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 'error', message: 'Failed to load deleted users'});
    }
});

router.post('/edituser', authToken, requireAdmin, async (req, res) => {
    try {
        const {userId} = req.body;
        const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
        const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword.trim() : '';

        if (!userId || !username || username.includes('@')) {
            return res.json({status: 'error', message: 'Username must be at least 1 character long and cannot contain @'});
        }
        if (newPassword && newPassword.length < 8) {
            return res.json({status: 'error', message: 'Password must be at least 8 characters long'});
        }

        const user = await User.findById(userId);
        if (!user) return res.json({status: 'error', message: 'User not found'});

        if (user.username !== username) {
            const existingUser = await User.findOne({username, _id: {$ne: user._id}});
            if (existingUser) {
                return res.json({status: 'error', code: 'USERNAME_TAKEN', message: 'Username already taken'});
            }
            user.username = username;
        }

        if (newPassword) {
            user.password = await bcrypt.hash(newPassword, 10);
        }
        await user.save();

        return res.json({status: 'success'});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 'error', message: 'Failed to update user'});
    }
});

router.post('/deleteuser', authToken, requireAdmin, async (req, res) => {
    try {
        const {userId} = req.body;
        if (userId === req.userId) {
            return res.json({status: 'error', message: 'You cannot delete your own admin account'});
        }

        const user = await User.findById(userId);
        if (!user) return res.json({status: 'error', message: 'User not found'});

        const deletedUser = new DeletedUser({
            ...user.toObject(),
            deletedOn: new Date(),
        });
        await deletedUser.save();
        await User.deleteOne({_id: user._id});

        return res.json({status: 'success'});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 'error', message: 'Failed to delete account'});
    }
});

router.post('/restoreuser', authToken, requireAdmin, async (req, res) => {
    try {
        const {userId} = req.body;
        const deletedUser = await DeletedUser.findById(userId);
        if (!deletedUser) return res.json({status: 'error', message: 'Deleted user not found'});

        const username = typeof req.body.username === 'string'
            ? req.body.username.trim()
            : deletedUser.username;
        if (!username || username.includes('@')) {
            return res.json({status: 'error', message: 'Username must be at least 1 character long and cannot contain @'});
        }

        const existingUser = await User.findOne({username});
        if (existingUser) {
            return res.json({status: 'error', code: 'USERNAME_TAKEN', message: 'Username already taken'});
        }
        if (await User.exists({_id: deletedUser._id})) {
            return res.json({status: 'error', message: 'An active account already exists for this user'});
        }

        const userData = deletedUser.toObject();
        delete userData.deletedOn;
        userData.username = username;
        await new User(userData).save();
        await DeletedUser.deleteOne({_id: deletedUser._id});

        return res.json({status: 'success'});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 'error', message: 'Failed to restore account'});
    }
});

router.post('/permanentlydeleteuser', authToken, requireAdmin, async (req, res) => {
    try {
        const {userId} = req.body;
        if (!userId) return res.json({status: 'error', message: 'User not found'});

        const result = await DeletedUser.deleteOne({_id: userId});
        if (result.deletedCount === 0) {
            return res.json({status: 'error', message: 'Deleted user not found'});
        }
        return res.json({status: 'success'});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 'error', message: 'Failed to permanently delete account'});
    }
});

function authToken(req, res, next) {
    const token = req.body?.jsonWebToken || req.cookies['auth-token'];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.userId;
        res.cookie('auth-token', token, {httpOnly: true, expires: new Date(Date.now() + 12 * 60 * 60 * 1000)});
        next();
    });
}

async function requireAdmin(req, res, next) {
    try {
        const user = await User.findById(req.userId, 'rank');
        if (!user || user.rank !== 'admin') {
            return res.status(403).json({status: 'error', message: 'Admin access required'});
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 'error', message: 'Failed to verify admin access'});
    }
}

module.exports = router;
