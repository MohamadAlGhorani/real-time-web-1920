const {
    Schema,
    model
} = require("mongoose");

const partySchema = new Schema({
    partyId: {
        type: String,
        required: true
    },
    users: {
        type: Array,
        default: []
    },
    hostId: {
        type: String,
        default: ''
    },
    djId: {
        type: String,
        default: ''
    },
    currentTrack: {
        type: String,
        default: ''
    },
    trackPosition: {
        type: Number,
        default: 0
    }
})

module.exports = model("Party", partySchema)