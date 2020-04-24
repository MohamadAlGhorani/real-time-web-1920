const fetch = require("node-fetch");
let userName

module.exports = function (req, res) {
    const token = req.cookies.accessToken;
    console.log(token);
    Promise.all([
        fetch(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            }
        }).then(response => response.json()),
        fetch("https://api.spotify.com/v1/me", {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            }
        }).then(response => response.json())
    ]).then(([tracksData, data]) => {
        userName = data.display_name
        res.render("party", {
            title: "Party",
            tracksData: tracksData,
            name: userName,
            id: req.params.id
        });
    });
}