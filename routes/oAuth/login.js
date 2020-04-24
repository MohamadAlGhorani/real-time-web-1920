require("dotenv").config();

const {
    SPOTIFY_REDIRECT_URI,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_CLIENT_ID,
} = process.env;

module.exports = function (req, res) {
    var scopes = 'streaming user-read-private user-read-email user-read-playback-state user-modify-playback-state user-top-read';
    const {
        SPOTIFY_CLIENT_ID,
        SPOTIFY_REDIRECT_URI
    } = process.env;
    res.redirect(
        "https://accounts.spotify.com/authorize" +
        "?response_type=code" +
        "&client_id=" +
        SPOTIFY_CLIENT_ID +
        (scopes ? "&scope=" + encodeURIComponent(scopes) : "") +
        "&redirect_uri=" +
        encodeURIComponent(SPOTIFY_REDIRECT_URI)
    );
};