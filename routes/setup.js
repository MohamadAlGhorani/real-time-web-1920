const fetch = require("node-fetch");

module.exports = function (req, res) {
    const token = req.cookies.accessToken;
    // console.log(token);
    fetch("https://api.spotify.com/v1/me", {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        }
    }).then(async response => {
        const data = await response.json();
        fetch(`https://api.spotify.com/v1/users/${data.id}/playlists`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            }
        }).then(async response => {
            const playlistsData = await response.json();
            // console.log(playlistsData)
            res.render("setup", {
                title: "Setup",
                playlistsData: playlistsData,
            });
        });
    })
}