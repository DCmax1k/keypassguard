const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
async function getAppleSigningKey(kid) {
    const response = await fetch('https://appleid.apple.com/auth/keys');
    const data = await response.json();
    const appleKey = data.keys.find(k => k.kid === kid);
    
    if (!appleKey) {
        throw new Error('Apple public key not found');
    }

    return jwkToPem(appleKey);
}

const {sendWelcomeEmail} = require('./util/sendEmail');
const User = require('../models/User');
const accessTokenExpireTime = require('../server');

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
function validatePass(pass) {
    return pass.length >= 8;
}
function validateUsername(username) {
    return username.length >= 1;
}


const createAccount = async ({partyType, thirdPartyId, username, email, password}) => {
    username = username.trim();
    email = email.trim();
    password = password.trim();
    const preUser={};
    let hashedPassword = "";
    if (!partyType) {
        // ORDER: Check username and email, validate username and email, hash password, set preuser
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });
        if (existingUser) {
            if (existingUser.username === username) {
                return { status: 'error', message: 'Username already taken' };
            }
            if (existingUser.email === email) {
                return { status: 'error', message: 'Email already taken' };
            }
        }
        if (!validateUsername(username)) return {status: 'error', message: vUsername};
        if (!validateEmail(email)) return {status: 'error', message: 'Please enter a valid email'};
        if (!validatePass(password)) return {status: 'error', message: 'Password must be at least 8 characters long'};
        hashedPassword = await bcrypt.hash(password, 10);
    } else if (partyType === 'google') {
        // ORDER:Check if google id exists [already verified], set preuser
        if (!email) return {status: "error", message: "error fetching email" }; 
        const checkId = await User.findOne({googleId: thirdPartyId});
        if (checkId) return { status: 'error', message: 'err: tried creating an account with google id that exists already' };
        preUser.googleId = thirdPartyId;
    } else if (partyType === 'apple') {
        // ORDER: Check if apple id exists [already verified], set preuser
        if (!email) return {status: "error", message: "error fetching email" }; 
        const checkId = await User.findOne({appleId: thirdPartyId});
        if (checkId) return { status: 'error', message: 'err: tried creating an account with apple id that exists already' };
        preUser.appleId = thirdPartyId;
    } else {
        return {status: "error", message: "error fetching partytype" }; 
    }

    // Create user
    const verifyEmailCode = `${Math.floor(Math.random() * 900000) + 100000}`;
    const user = new User({
        email,
        username: username ?? "",
        password: hashedPassword,
        settings: {
            verifyEmailCode,
        },
        ...preUser,
    });
    await user.save();

    
    const modifiedUser = JSON.parse(JSON.stringify(user));
    modifiedUser.password = "";
    // return user
    return modifiedUser;

}


router.post('/createaccount', async (req, res) => {
    try {
        let { partyType, username, email, password } = req.body;
        username = username.trim();
        email = email.trim();
        password = password.trim();
        const user = await createAccount({ username, email, password});
        if (user.status === 'error') return res.json({status: 'error', message: user.message});

        /* // The following was moved to the create user function
        const checkUser = await User.findOne({ username });
        if (checkUser) {
            return res.json({status: 'error', message: 'Username already taken'});
        }
        if (!validateUsername(username)) return res.json({status: 'error', message: 'Username must include at least 1 character'});
        if (!validateEmail(email)) return res.json({status: 'error', message: 'Please enter a valid email'});
        if (!validatePass(password)) return res.json({status: 'error', message: 'Password must be at least 8 characters long'});

        const hashedPassword = await bcrypt.hash(password, 10);
        const verifyEmailCode = Math.floor(Math.random() * 900000) + 100000;

        const user = new User({
            username,
            email,
            password: hashedPassword,
            settings: {
                verifyEmailCode,
            }
        });
        await user.save();
        */
        const dbId = JSON.parse(JSON.stringify(user._id));

        sendWelcomeEmail(email, username, `https://www.keypassguard.com/login/verifyemail/${user._id}/${verifyEmailCode}`);

        // User Info is the data that will be overwritten on local each request
        const userInfo = {
            // recentActivity,
            _id: dbId,
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
            sites: user.sites,
        }

        const jwt_token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {expiresIn: accessTokenExpireTime}); // Access token - for all pings
        let refresh_token = null;
        if (req.body.hardwareLogin)
            refresh_token = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, {expiresIn: "30d"}); // Refresh token - for face id auth
        res.cookie('auth-token', jwt_token, { httpOnly: true, expires: new Date(Date.now() + 12 * 60 * 60 * 1000) });
        res.json({
            status: 'success', 
            jsonWebToken: jwt_token,
            userInfo,
            refresh_token,
        });

    } catch(err) {
        console.error(err);
    }
});

router.post("/createusername", authToken, async (req, res) => {
    try {
        const {username} = req.body;
        const existingUser = await User.findOne({username});
        if (existingUser) return req.json({ status: 'error', message: 'Username already taken' });
        const vUsername = validateUsername(username);
        if (vUsername !== 'success') return res.json({status: 'error', message: vUsername});

        const user = await User.findById(req.userId);
        user.username = username;
        await user.save();
        
        if (!user) return res.json({status: "error", message: "User not found"});
        const userInfo = getUserInfo(user);
        return res.json({status: "success", userInfo});

    } catch(err) {
        console.error(err);
    }
});

// handles only when click thrid party button
router.post("/newloginthirdparty", async (req, res) => {
    const { partyType, idToken, email, } = req.body;

    // Verify idToken, check if user exists, if doesnt create account,
    // if user, return with user and session token,
    // else just push session token to create username

    let user = null;
    if (!partyType) {
        console.log("Err: Party type not google or apple");
    } else if (partyType === "google") {
        // Verify google session idToken
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { sub } = ticket.getPayload();
        user = await User.findOne({googleId: sub});
        if (!user) {
            user = await createAccount({partyType, thirdPartyId: sub, email });
            if (user.status === 'error') return res.json({status: "error", message: user.message});
        }
    } else if (partyType === "apple") {
        try {
            const decodedToken = await new Promise((resolve, reject) => {
                jwt.verify(
                    idToken,
                    getAppleSigningKey,
                    {
                        algorithms: ['RS256'],
                        issuer: 'https://appleid.apple.com',
                        audience: 'com.caldwell.keypassguard' 
                    },
                    (err, decoded) => {
                        if (err) return reject(err);
                        resolve(decoded);
                    }
                );
            });

            // The 'sub' is the permanent unique Apple User ID
            const sub = decodedToken.sub;
            user = await User.findOne({appleId: sub});
            if (!user) {
                user = await createAccount({partyType, thirdPartyId: sub, email });
                if (user.status === 'error') return res.json({status: "error", message: user.message});
            }
            
        } catch (error) {
            console.error("Apple Token Verification Error:", error);
            return res.json({ status: 'error', message: "Invalid Apple Token" });
        }
    } else {
        console.log("Err: Party type not google or apple");
    }

    // Session token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    return res.json({
            status: 'success',
            message: 'User logged in successfully!',
            jsonWebToken: token,
        });
})

router.post('/', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user;
        if (username.includes("@")) {
            user = await User.findOne({email: username});
        } else {
            user = await User.findOne({username});
        }
        if (!user) {
            return res.json({
                status: 'error',
                message: 'No user with that username/email!',
            });
        }
        const checkPass = await bcrypt.compare(password, user.password);
        if (!checkPass) {
            return res.json({
                status: 'error',
                message: 'Incorrect password!',
            });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {expiresIn: accessTokenExpireTime});
        let refresh_token = null;
        if (req.body.hardwareLogin)
            refresh_token = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, {expiresIn: "30d"}); // Refresh token - for face id auth
        res.cookie('auth-token', token, { httpOnly: true, expires: new Date(Date.now() + 12 * 60 * 60 * 1000)});

        return res.json({
            status: 'success',
            message: 'User logged in successfully!',
            jsonWebToken: token,
            refresh_token
        });
    } catch(err) {
        console.error(err);
    }
});

router.get('/verifyemail/:userid/:verifycode', async (req, res) => {
    try {
        const user = await User.findById(req.params.userid);
        console.log(req.params.verifycode);
        console.log(user.settings.verifyEmailCode);
        if (req.params.verifycode == user.settings.verifyEmailCode) {
            user.settings.emailVerified = true;
            await user.save();
            res.redirect('/verifyemail/verifyemailsuccess')
            //res.send('Email successfully verfied!');
        } else {
            res.redirect('/verifyemail/verifyemailerror')
            //res.send('Error verifiying email.');
        }
        
    } catch(err) {  
        console.error(err);
    }
});

router.post('/logout', authToken, async (req, res) => {
    try {
        res.cookie('auth-token', '', { expires: new Date(0) }).json({ status: 'success' });
    } catch(err) {
        console.error(err);
    }
});

router.post('/changepassword', authToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const { newValue, password } = req.body;

        const checkPass = await bcrypt.compare(password, user.password);
        if (!checkPass) {
            return res.json({
                status: 'error',
                message: 'Incorrect password!',
            });
        }

        if (!validatePass(newValue)) return res.json({status: 'error', message: 'Password must be at least 8 characters long'});

        const hashedPassword = await bcrypt.hash(newValue, 10);

        user.password = hashedPassword;
        await user.save();

        res.json({
            status: 'success',
        });

    } catch(err) {
        console.error('Decryption Error:', err);
    }
});

function authToken(req, res, next) {
    const token = req.body?.jsonWebToken || req.cookies['auth-token'];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.userId;
        res.cookie('auth-token', token, { httpOnly: true, expires: new Date(Date.now() + 12 * 60 * 60 * 1000)});
        next();
    });
}

module.exports = router;