const {
    ObjectId,
    Schema,
    model
} = require("mongoose");

const partySchema = new Schema({
    _id: ObjectId,
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
        type: String,
        default: ''
    }
})

module.exports = model("Party", partySchema)