const fetch = require("node-fetch");

module.exports = function (req, res) {
    const token = req.cookies.accessToken;
    fetch("https://api.spotify.com/v1/me", {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        }
    }).then(async response => {
        console.log('setup', response);
        const data = await response.json();
        fetch(`https://api.spotify.com/v1/users/${data.id}/playlists`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            }
        }).then(async response => {
            const playlistsData = await response.json();
            res.render("setup", {
                title: "Setup",
                playlistsData: playlistsData,
            });
        }).catch(error => {
            console.error(error);
            res.status(500).send('Internal Server Error' + error);
        });
    }).catch(error => {
        console.error(error);
        res.status(500).send('Internal Server Error' + error);
    });
}