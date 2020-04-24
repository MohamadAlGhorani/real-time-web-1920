module.exports = function (req, res) {
    const party_id = req.query.party_id;
    res.redirect(`/party-${party_id}`);
}