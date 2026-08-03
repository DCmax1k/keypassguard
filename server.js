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

// VERSION
const VSN = 1; 
const accessTokenExpireTime = '12h';
module.exports = accessTokenExpireTime;

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

        // Clear sites passwords
        const clearedSites = user.sites.map(s => {
            s.password = "";
            return s;
        })

        // User Info is the data that will be overwritten on local each request
        const userInfo = {
            // recentActivity,
            _id: req.userId,
            pushTokens: user.pushTokens,
            username: user.username,
            email: user.email,
            rank: user.rank,
            plus: user.premium,
            // friendRequests: user.friendRequests,
            // friendsAdded: user.friendsAdded,
            // friends: user.friends,
            subscriptions: user.subscriptions,
            // profileImg: user.profileImg,
            // trouble: user.trouble,
            googleId: user.googleId,
            appleId: user.appleId,
            facebookId: user.facebookId,
            // usernameDecoration: user.usernameDecoration,
            extraDetails: user.extraDetails,
            // premiumSubscription: user.premiumSubscription,
            sites: clearedSites,
        }

        res.json({
            status: 'success',
            userInfo,
            user: {...user.toObject(), _id: req.userId, sites: clearedSites},
            vsn: VSN,
        });
    } catch(err) {
        console.error(err);
    }
    
});


const refreshLongToken = async (req, res, refreshToken) => {
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required' });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const userId = decoded.userId;
    // const user = await db.findUserById(userId);
    // if (!user) return res.status(403).json({ error: 'User no longer exists' });

    const newAccessToken = jwt.sign(
      { userId: userId }, 
      process.env.JWT_SECRET, 
      { expiresIn: accessTokenExpireTime }
    );
    return res.json({ status: "success", accessToken: newAccessToken });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};


app.post('/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    await refreshLongToken(req, res, refreshToken);
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
    const token = req.body?.jsonWebToken || req.cookies['auth-token'];
    console.log("Token received");
    console.log(token);
    if (!token) return res.status(401).json({message: 'No authentication provided! Redirecting to login...'});
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({message: 'Error logging in. Incorrect information provided.'})
        req.userId = user.userId;
        res.cookie('auth-token', token, { httpOnly: true, expires: new Date(Date.now() + 12 * 60 * 60 * 1000)});
        next();
    });
}