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

const logger = (req, res, next) => {
    const date = new Date();
    const time = `[ ${date.getHours()}:${date.getMinutes()} ]`;
    res.on('finish', () => {
        console.log(time, req.method, req.url, res.statusCode);
        console.log('');
    });
    next();
}

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + '/client/build'));
app.use(cookieParser());
app.use(logger);


// Main route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/build/index.html');
});
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/client/build/index.html');
});
app.get('/forgotpassword', (req, res) => {
    res.sendFile(__dirname + '/client/build/index.html');
});
app.get('/export', (req, res) => {
    res.sendFile(__dirname + '/client/build/index.html');
});
app.get("/verifyemail/verifyemailsuccess", (req, res) => {
    res.sendFile(__dirname + '/client/build/index.html');
});
app.get("/verifyemail/verifyemailerror", (req, res) => {
    res.sendFile(__dirname + '/client/build/index.html');
});
app.get('/login', (req, res) => {
    res.redirect('/');
});
app.get('/signup', (req, res) => {
    res.redirect('/');
});

// DB models
const User = require('./models/User');

// Routes
const loginRoute = require('./routes/login');
app.use('/login', loginRoute);

const dashboardRoute = require('./routes/dashboard');
app.use('/dashboard', dashboardRoute);


app.post('/auth', authToken, async (req, res) => {

    try {
        const user = await User.findOne({_id: req.userId});
        if (!user) {
            return res.json({status: 'error', message: 'Bad authentication! Redirecting...'})
        };

        // Hide crucial information to not send client
        user.password = '';
        user.settings.verifyEmailCode = 0;

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
      const smStream = new SitemapStream({ hostname: 'https://www.keypassguard.com/' });
      const pipeline = smStream.pipe(createGzip());

      smStream.write({ url: '/'});
      //smStream.write({ url: '/agreements/termsofuse'});
      //smStream.write({ url: '/agreements/privacypolicy'});
      smStream.write({ url: '/login'});
      smStream.write({ url: '/signup'});

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
        res.cookie('auth-token', token, { httpOnly: true, expires: new Date(Date.now() + 12 * 60 * 60 * 1000)});
        next();
    });
}