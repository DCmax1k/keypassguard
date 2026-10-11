
const getUserInfo = (user, friend=false) => {
    const dbId = JSON.parse(JSON.stringify(user._id));
    // User Info is the data that will be overwritten on local each request
    const clearedSites = user.sites.map(s => {
        s.password = "";
        return s;
    });
    const obj = {
        // recentActivity,
        _id: dbId,
        //pushTokens: user.pushTokens,
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
        // Added things below
        settings: user.settings,
    }
    return obj;
}

module.exports = getUserInfo;