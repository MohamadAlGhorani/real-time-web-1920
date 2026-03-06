const crypto = require("crypto");
require("dotenv").config();

module.exports = function (req, res) {
    var scopes = 'streaming user-read-private user-read-email user-read-playback-state user-modify-playback-state user-top-read';
    const {
        SPOTIFY_CLIENT_ID,
        SPOTIFY_REDIRECT_URI
    } = process.env;

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    res.cookie("oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 600000, // 10 minutes
    });

    res.redirect(
        "https://accounts.spotify.com/authorize" +
        "?response_type=code" +
        "&client_id=" +
        SPOTIFY_CLIENT_ID +
        (scopes ? "&scope=" + encodeURIComponent(scopes) : "") +
        "&redirect_uri=" +
        encodeURIComponent(SPOTIFY_REDIRECT_URI) +
        "&state=" +
        encodeURIComponent(state)
    );
};
