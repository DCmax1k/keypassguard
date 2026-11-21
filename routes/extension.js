const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');

const cryptr = new Cryptr(process.env.CRYPTR_KEY);
const User = require('../models/User');
const generateUniqueId = require('./util/generateUniqueId');

const EXTENSION_ACCESS_TOKEN_TTL = '5m';

function normalizeHost(input = '') {
    try {
        const value = String(input).trim();
        if (!value) return '';
        const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
        return url.hostname.toLowerCase().replace(/^www\./i, '');
    } catch (error) {
        return '';
    }
}

function parseSiteUrl(input = '') {
    try {
        const value = String(input).trim();
        if (!value) return null;
        const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
        return {
            host: url.hostname.toLowerCase().replace(/^www\./i, ''),
            path: url.pathname.replace(/\/+$/, '') || '/',
            protocol: url.protocol,
            origin: url.origin,
        };
    } catch (error) {
        return null;
    }
}

function siteMatchesUrl(site, requestedUrl) {
    if (!site || !site.url || !requestedUrl) return false;

    const saved = parseSiteUrl(site.url);
    const requested = parseSiteUrl(requestedUrl);
    if (!saved || !requested) return false;

    const sameSite = saved.host === requested.host
        || requested.host.endsWith(`.${saved.host}`);
    if (!sameSite) return false;

    return true;
}

function serializeSite(site) {
    return {
        id: site && site.id ? site.id : generateUniqueId(),
        name: site && site.name ? site.name : (site && site.url ? site.url : 'Saved login'),
        username: site && site.username ? site.username : '',
        url: site && site.url ? site.url : '',
    };
}

function authExtensionToken(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const token = tokenFromHeader || req.body?.token || req.query?.token;

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Extension authentication required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ status: 'error', message: 'Invalid or expired extension token.' });
        }
        req.userId = decoded.userId;
        next();
    });
}

router.post('/auth/extension-refresh', async (req, res) => {
    const refreshToken = req.body?.refreshToken || req.body?.token || req.body?.sessionToken || req.cookies?.['auth-token'];

    if (!refreshToken) {
        return res.status(401).json({ status: 'error', message: 'Refresh token is required.' });
    }

    try {
        let decoded;

        try {
            decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch (refreshErr) {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        }

        const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: EXTENSION_ACCESS_TOKEN_TTL });
        return res.json({
            status: 'success',
            accessToken,
            expiresAt: Date.now() + 5 * 60 * 1000,
            message: 'Extension session refreshed.'
        });
    } catch (error) {
        if (error && error.name === 'TokenExpiredError') {
            return res.status(403).json({ status: 'error', message: 'Session expired. Please sign in again.' });
        }
        return res.status(403).json({ status: 'error', message: 'Invalid refresh token.' });
    }
});

router.post('/extension/vault', authExtensionToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        const domain = (req.body?.url || req.body?.domain || req.query?.url || req.query?.domain || '').trim();
        const sites = Array.isArray(user.sites) ? user.sites : [];

        const filteredSites = domain
            ? sites.filter((site) => siteMatchesUrl(site, domain))
            : sites;

        const entries = filteredSites.map(serializeSite);

        return res.json({ status: 'success', entries });
    } catch (error) {
        console.error('Extension vault fetch error:', error);
        return res.status(500).json({ status: 'error', message: 'Unable to load saved passwords.' });
    }
});

router.post('/extension/vault/associate-url', authExtensionToken, async (req, res) => {
    try {
        const { id, url } = req.body || {};
        const parsedUrl = parseSiteUrl(url);
        if (!id || !parsedUrl || !/^https?:$/.test(parsedUrl.protocol)) {
            return res.status(400).json({ status: 'error', message: 'A valid site and HTTP(S) URL are required.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        const site = user.sites.find((entry) => entry.id === id);
        if (!site) {
            return res.status(404).json({ status: 'error', message: 'Saved login not found.' });
        }

        if (!site.url) {
            site.url = parsedUrl.origin;
            user.markModified('sites');
            await user.save();
        }

        return res.json({ status: 'success', site: serializeSite(site) });
    } catch (error) {
        console.error('Extension URL association error:', error);
        return res.status(500).json({ status: 'error', message: 'Unable to associate this website with the saved login.' });
    }
});

router.post('/extension/vault/save', authExtensionToken, async (req, res) => {
    try {
        const sitePayload = req.body?.site;
        if (!sitePayload || !sitePayload.url) {
            return res.status(400).json({ status: 'error', message: 'A valid site URL is required.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        const normalizedUrl = String(sitePayload.url || '').trim();
        const entry = {
            id: sitePayload.id || generateUniqueId(),
            name: sitePayload.name || normalizedUrl,
            username: sitePayload.username || '',
            password: sitePayload.password ? cryptr.encrypt(sitePayload.password) : '',
            note: sitePayload.note || '',
            url: normalizedUrl,
        };

        const existingIndex = user.sites.findIndex((existingSite) => {
            if (sitePayload.id && existingSite.id === sitePayload.id) return true;
            if (!existingSite.url) return false;
            return normalizeHost(existingSite.url) === normalizeHost(normalizedUrl);
        });

        if (existingIndex >= 0) {
            user.sites[existingIndex] = {
                ...user.sites[existingIndex],
                ...entry,
                id: user.sites[existingIndex].id || entry.id,
            };
        } else {
            user.sites.push(entry);
        }

        user.markModified('sites');
        await user.save();

        return res.json({ status: 'success', site: serializeSite(entry) });
    } catch (error) {
        console.error('Extension vault save error:', error);
        return res.status(500).json({ status: 'error', message: 'Unable to save login.' });
    }
});

module.exports = router;
