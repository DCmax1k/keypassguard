const express = require('express');
const app = express();

// Imports
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + '/client/build'));
app.use(cookieParser());

// Main route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/build/index.html');
});
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/client/build/index.html');
});

// DB models
const User = require('./models/User');

// Routes
const loginRoute = require('./routes/login');
app.use('/login', loginRoute);



app.post('/auth', authToken, async (req, res) => {

    try {
        const user = await User.findOne({_id: req.userId});
        if (!user) {
            return res.json({status: 'error', message: 'Bad authentication! Redirecting...'})
        };

        res.json({
            status: 'success',
            user,
        });
    } catch(err) {
        console.error(err);
    }
    
});

// Sitemap
let sitemap;
app.get('/sitemap.xml', async (req, res) => {
    res.header('Content-Type', 'application/xml');
    res.header('Content-Encoding', 'gzip');

    if (sitemap) {
        res.send(sitemap);
        return;
    }

    try {
      const smStream = new SitemapStream({ hostname: 'https://www.keypassguard.app/' });
      const pipeline = smStream.pipe(createGzip());

      smStream.write({ url: '/'});
      smStream.write({ url: '/agreements/termsofuse'});
      smStream.write({ url: '/agreements/privacypolicy'});

      // cache the response
      streamToPromise(pipeline).then(sm => sitemap = sm);
      
      smStream.end();

      // Show errors and response
      pipeline.pipe(res).on('error', (e) => {throw e});
    } catch (e) {
        console.log(e);
    }
});

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT || 3001, () => {
        console.log('Serving on port 3001...');
    });
});

function authToken(req, res, next) {
    const token = req.cookies['auth-token'];
    if (!token) return res.status(401).json({message: 'No authentication provided! Redirecting to login...'});
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({message: 'Error logging in. Incorrect information provided.'})
        req.userId = user.userId;
        next();
    });
}