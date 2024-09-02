const fetch = require("node-fetch");

module.exports = function (req, res) {
    const token = req.cookies.accessToken;
    fetch("https://api.spotify.com/v1/me", {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Accept-Encoding': 'gzip, deflate, br' // Ensure the server knows we accept compressed responses
        }
    }).then(async response => {
        let data;
        try {
            const text = await response.text(); // Get the response as text
            console.log('Response body:', text); // Log the response body
            data = JSON.parse(text); // Try to parse the text as JSON
        } catch (error) {
            console.error(`Invalid JSON response body at ${response.url} reason: ${error.message}`);
            throw new Error(`Invalid JSON response: ${error.message}`);
        }
        fetch(`https://api.spotify.com/v1/users/${data.id}/playlists`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'Accept-Encoding': 'gzip, deflate, br' // Ensure the server knows we accept compressed responses
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