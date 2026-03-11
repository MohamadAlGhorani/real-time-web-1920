const fetch = require("node-fetch");
const queryString = require("query-string");
require("dotenv").config();
const {
    SPOTIFY_REDIRECT_URI,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_CLIENT_ID,
} = process.env;

const isProduction = process.env.NODE_ENV === "production";

module.exports = async (request, response) => {
    // Verify OAuth state to prevent CSRF
    const state = request.query.state;
    const storedState = request.cookies.oauth_state;
    if (!state || !storedState || state !== storedState) {
        return response.status(403).send("State mismatch. Please try logging in again.");
    }
    // Clear the state cookie
    response.clearCookie("oauth_state");

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

        if (data.error) {
            console.error("Spotify auth error:", data.error, data.error_description);
            return response.status(403).render("error", {
                title: "Access Denied",
                heading: "Account not authorized",
                message: "Your Spotify account is not on the allowlist for this app. Ask the party host to add your Spotify email in the Spotify Developer Dashboard.",
            });
        }

        if (!data.access_token) {
            return response.status(500).render("error", {
                title: "Login Failed",
                heading: "Login failed",
                message: "Could not get an access token from Spotify. Please try logging in again.",
            });
        }

        response.cookie("accessToken", data.access_token, {
            sameSite: "lax",
            secure: isProduction,
        });
        response.cookie("refreshToken", data.refresh_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: isProduction,
        });

        response.redirect(`/home`);
    } catch (error) {
        console.error("Error:", error);
        response.status(500).render("error", {
            title: "Login Failed",
            heading: "Something went wrong",
            message: "Authentication failed. Please try logging in again.",
        });
    }
};

function encodeToBase64(text) {
    return Buffer.from(text).toString("base64");
}
