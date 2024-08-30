const fetch = require("node-fetch");
const queryString = require("query-string");
require("dotenv").config();
const {
    SPOTIFY_REDIRECT_URI,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_CLIENT_ID,
} = process.env;

module.exports = async (request, response, next) => {
    const code = request.query.code;
    const queryObject = {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
    };
    const fetchOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${encodeToBase64(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        )}`,
        },
    };
    const query = queryString.stringify(queryObject);
    const url = `https://accounts.spotify.com/api/token?${query}`;

    try {
        const spotifyResponse = await fetch(url, fetchOptions);
        const data = await spotifyResponse.json();

        response.cookie("accessToken", data.access_token);
        response.cookie("refreshToken", data.refresh_token);

        response.redirect(`/home`);
    } catch (error) {
        console.error("Error!!!", error);
        response.send(error);
    }
};

function encodeToBase64(text) {
    return new Buffer.from(text).toString("base64");
}