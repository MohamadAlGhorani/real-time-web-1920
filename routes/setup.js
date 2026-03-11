const fetch = require("node-fetch");
const refreshAccessToken = require("./oAuth/refreshToken");

module.exports = async function (req, res) {
    var token = req.cookies.accessToken;
    if (!token) {
        token = await refreshAccessToken(req, res);
        if (!token) return res.redirect("/");
    }

    async function loadPlaylists(accessToken) {
        const meRes = await fetch("https://api.spotify.com/v1/me", {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            }
        });
        if (meRes.status === 401) return null;
        const data = await meRes.json();

        const playlistsRes = await fetch(`https://api.spotify.com/v1/users/${encodeURIComponent(data.id)}/playlists`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            }
        });
        if (playlistsRes.status === 401) return null;
        const playlistsData = await playlistsRes.json();
        return playlistsData;
    }

    try {
        var result = await loadPlaylists(token);

        // Token expired — refresh and retry once
        if (!result) {
            token = await refreshAccessToken(req, res);
            if (!token) return res.redirect("/");
            result = await loadPlaylists(token);
        }

        if (!result) {
            return res.redirect("/");
        }

        res.render("setup", {
            title: "Setup",
            playlistsData: result,
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("error", {
            title: "Error",
            heading: "Could not load playlists",
            message: "Failed to fetch your Spotify playlists. Your account may not be authorized for this app. Ask the party host to add your Spotify email in the Spotify Developer Dashboard.",
        });
    }
}
