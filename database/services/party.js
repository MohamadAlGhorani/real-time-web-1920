const mongoose = require('mongoose');
const Party = require('../models/party');

exports.getIfExists = async (partyId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            return party;
        }

        throw `Party with id ${partyId} not found.`;
    } catch (error) {
        throw new Error(error);
    }
}

exports.create = async (partyId) => {
    try {
        const newParty = new Party({
            _id: new mongoose.Types.ObjectId(),
            partyId: partyId
        });

        Party.create(newParty)
        await newParty.save();

        return 'Successfully created party';
    } catch (error) {
        console.error(error);
        throw new Error(error)
    }
}

exports.remove = async (partyId) => {
    try {
        await Party.deleteOne({
            partyId
        })

        return 'Successfully removed party'
    } catch (error) {
        throw new Error(error);
    }
}

exports.addUser = async (partyId, userId, userName) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            party.users = [
                ...party.users,
                {
                    userId,
                    userName
                }
            ]

            await party.save();

            return `Successfully added user to party ${partyId}`;
        }

        throw new Error(`Party with id ${partyId} does not exist.`);
    } catch (error) {
        throw new Error(error);
    }
}

exports.removeUser = async (partyId, userId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            party.users = party.users.filter(user => user.userId !== userId);

            await party.save();

            if (party.users.length === 0) {
                await this.remove(partyId);
            }

            return 'Successfully removed user from party';
        }

        throw new Error(`Party with id ${partyId} does not exist.`)
    } catch (error) {
        console.error(error);
    }
}

exports.findUser = async (partyId, userId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            const user = party.users.find(user => {
                return user.userId === userId
            });

            return user;
        }
    } catch (error) {
        return null
    }
}

exports.setHostId = async (partyId, hostId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            party.hostId = hostId
        }

        await party.save();
    } catch (error) {
        return null
    }
}


exports.setDjId = async (partyId, djId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            party.djId = djId
        }

        await party.save();

    } catch (error) {
        return null
    }
}

exports.setCurrentTrack = async (partyId, currentTrack) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            party.currentTrack = currentTrack
        }

        await party.save();
    } catch (error) {
        return null
    }
}

exports.getHostId = async (partyId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            const hostId = party.hostId
            return hostId;
        }
    } catch (error) {
        return null
    }
}


exports.getDjId = async (partyId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            const djId = party.djId
            return djId;
        }
    } catch (error) {
        return null
    }
}

exports.getCurrentTrack = async (partyId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            const currentTrack = party.currentTrack
            return currentTrack;
        }
    } catch (error) {
        return null
    }
}

exports.getTrackPosition = async (partyId) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            const trackPosition = party.trackPosition
            return trackPosition;
        }
    } catch (error) {
        return null
    }
}


exports.setTrackPosition = async (partyId, trackPosition) => {
    try {
        const party = await Party.findOne({
            partyId
        });

        if (party) {
            party.trackPosition = trackPosition
        }

        await party.save();
    } catch (error) {
        return null
    }
}