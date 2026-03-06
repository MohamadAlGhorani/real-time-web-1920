module.exports = function (req, res) {
    const party_id = req.query.party_id;
    if (!party_id || typeof party_id !== "string" || !/^[a-zA-Z0-9]{1,64}$/.test(party_id)) {
        return res.status(400).send("Invalid party code.");
    }
    res.redirect(`/party-${party_id}`);
}
