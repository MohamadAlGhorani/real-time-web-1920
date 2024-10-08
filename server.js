const express = require("express");
const compression = require("compression");
const fetch = require("node-fetch");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const spotifyCallback = require("./routes/oAuth/callback");
const spotifyLogin = require("./routes/oAuth/login");

const landingPageRoute = require("./routes/landingPage");
const homeRoute = require("./routes/home");
const joinRoute = require("./routes/join");
const setupRoute = require("./routes/setup");

const partyServices = require("./database/services/party");
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("connecetion successfull");
  })
  .catch((error) => {
    console.error(error);
  });

const rooms = {};
let userName;

const config = {
  PORT: process.env.PORT || 8080,
  HOST: "0.0.0.0",
};

app
  .set("view engine", "ejs")
  .set("views", "views")

  .use(compression())
  .use(express.static("static"))
  .use(cookieParser())

  .get("/login", spotifyLogin)
  .get("/callback", spotifyCallback)

  .get("/", landingPageRoute)
  .get("/home", homeRoute)
  .get("/setup", setupRoute)
  .get("/join", joinRoute)
  .get("/party-:id", function (req, res) {
    partyServices.getIfExists(req.params.id).catch(function () {
      partyServices.create(req.params.id);
    });

    rooms[req.params.id] = {
      users: {},
    };

    const token = req.cookies.accessToken;

    Promise.all([
      fetch(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks?limit=50`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json()),
      fetch("https://api.spotify.com/v1/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json()),
    ])
      .then(([tracksData, data]) => {
        console.log('party tracks', tracksData);
        console.log('user info', data);
        userName = data.display_name;
        res.render("party", {
          title: "Party",
          tracksData: tracksData,
          name: userName,
          id: req.params.id,
        });
      })
      .catch((error) => {
        console.error(error);
      });
  });

io.on("connection", function (socket) {
  socket.userName = userName;

  socket.emit(
    "server message",
    "Server: you are connceted open your spotify app to listen to the party music"
  );

  socket.on("join party", function (id, name) {
    partyServices.addUser(id, socket.id, name).then(function () {
      rooms[id].users[socket.id] = name;
      socket.roomId = id;
      socket.join(id);
      socket
        .to(id)
        .broadcast.emit(
          "server message",
          `Server: ${socket.userName} is connceted`
        );
      const hostID = partyServices.getHostId(id);
      hostID.then(function (results) {
        socket.to(results).emit("getPosition");
      });
      socket.emit("get users");
    });
  });

  socket.on("users list", function (room, token) {
    let clients = io.in(room).clients((error, clients) => {
      let guests = clients.map((client) => {
        return {
          userName: io.sockets.connected[client].userName,
          id: io.sockets.connected[client].id,
        };
      });
      let guestsInRoom = clients.length;
      io.to(room).emit("online users", guests, guestsInRoom);
    });
  });

  socket.on("rights", function (room, token) {
    fetch("https://api.spotify.com/v1/me", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then(async (response) => {
      const data = await response.json();
      fetch(`https://api.spotify.com/v1/users/${data.id}/playlists`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then(async (response) => {
        const playlistsData = await response.json();
        playlistsData.items.forEach((item) => {
          if (item.id == room) {
            partyServices.setHostId(room, socket.id).then(function () {
              socket.to(room).broadcast.emit("set host icon", socket.id);
              socket.broadcast.to(socket.id).emit("host", socket.id);
              io.to(socket.id).emit("host", socket.id); //sending to individual socketid
              socket.broadcast.to(socket.id).emit("get dj");
              io.to(socket.id).emit("get dj"); //sending to individual socketid
            });
          } else {
            const hostID = partyServices.getHostId(room);
            hostID.then(function (results) {
              socket.emit("who host", results);
            });
            const djId = partyServices.getDjId(room);
            djId.then(function (results) {
              socket.emit("who dj", results);
            });
            const currentTrack = partyServices.getCurrentTrack(room);
            currentTrack
              .then(function (current) {
                const trackPosition = partyServices.getTrackPosition(room);
                trackPosition.then(function (position) {
                  fetch(`https://api.spotify.com/v1/me/player/play`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      uris: [`spotify:track:${current}`],
                      position_ms: position,
                    }),
                  }).then(async (response) => {});
                });
              })
              .then(function () {
                fetch(
                  `https://api.spotify.com/v1/me/player/currently-playing`,
                  {
                    method: "GET",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                  }
                )
                  .then(async (response) => {
                    try {
                      const text = await response.text(); // Get the response as text
                      const tracksData = JSON.parse(text); // Try to parse the text as JSON
                      if (tracksData) {
                        socket.emit("current playing", tracksData);
                      }
                    } catch (err) {
                      console.error(
                        `Invalid JSON response body at ${response.url} reason: ${err.message}`
                      );
                    }
                  })
                  .catch((error) => {
                    console.error(error);
                  });
              });
          }
        });
      });
    });
  });

  socket.on("dj", function (userId, room, userName) {
    partyServices.setDjId(room, userId).then(function () {
      socket.to(room).broadcast.emit("update dj", userId);
      socket.emit("update dj", userId);

      socket
        .to(room)
        .emit("server message", `Server: ${userName} is the new DJ`);
      socket.emit("server message", `Server: ${userName} is the new DJ`);

      socket.to(room).broadcast.emit("delete dj");

      socket.broadcast.to(userId).emit("set dj");

      socket.broadcast
        .to(userId)
        .emit("server message", "Server: You are the DJ now enjoy");
    });
  });

  socket.on("chat message", function (msg, ranColor, room) {
    socket
      .to(room)
      .broadcast.emit("chat message", `${socket.userName}: ${msg}`, ranColor);
  });

  socket.on("getSong", function (id, room) {
    socket.emit("getTokens", id);
    socket.to(room).emit("getTokens", id);
  });

  socket.on("set volume", function (volume, token) {
    fetch(
      `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    ).then(async (response) => {
      console.info(response);
    });
  });

  socket.on("setPosition", function (room, token) {
    fetch(`https://api.spotify.com/v1/me/player/currently-playing`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        try {
          const text = await response.text(); // Get the response as text
          const positionData = JSON.parse(text);
          if (positionData) {
            partyServices.setTrackPosition(room, positionData.progress_ms);
          }
        } catch (err) {
          console.error(
            `Invalid JSON response body at ${response.url} reason: ${err.message}`
          );
        }
      })
      .catch((error) => {
        console.error("Fetch error:", error);
      });
  });

  socket.on("playSong", function (myObject) {
    fetch(`https://api.spotify.com/v1/me/player/repeat?state=track`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${myObject.accessToken}`,
      },
    })
      .then(async (response) => {
        console.info(response);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
      });
    fetch(`https://api.spotify.com/v1/me/player/play`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${myObject.accessToken}`,
      },
      body: JSON.stringify({
        uris: [`spotify:track:${myObject.id}`],
      }),
    })
      .then(async (response) => {
        if (response.status == 403) {
          socket.emit(
            "server message",
            "Server: You don't have a spotify premium account. You can chat with people but you can't listen to the party music."
          );
        }
        if (response.status == 404) {
          socket.emit(
            "server message",
            "Server: We can't find an active device please open your spotify application on your own device and start a random track to activate the session."
          );
        }
        await fetch(`https://api.spotify.com/v1/me/player/currently-playing`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${myObject.accessToken}`,
          },
        })
          .then(async (response) => {
            try {
              const text = await response.text(); // Get the response as text
              const tracksData = JSON.parse(text); // Try to parse the text as JSON
              if (tracksData) {
                partyServices
                  .setCurrentTrack(myObject.room, tracksData.item.id)
                  .then(function () {
                    socket.emit("current playing", tracksData);
                    socket
                      .to(myObject.room)
                      .broadcast.emit("current playing", tracksData);
                  });
              }
            } catch (err) {
              console.error(
                `Invalid JSON response body at ${response.url} reason: ${err.message}`
              );
            }
          })
          .catch((error) => {
            console.error(error);
          });
      })
      .catch((error) => {
        console.error(error);
      });
  });

  socket.on("disconnect", function () {
    getUserRooms(socket).forEach((room) => {
      const hostID = partyServices.getHostId(room);
      hostID.then(function (results) {
        socket.to(results).emit("getPosition");
      });
      partyServices.removeUser(room, socket.id).then(function () {
        socket
          .to(room)
          .broadcast.emit(
            "server message",
            `Server: ${rooms[room].users[socket.id]} is disconnected`
          );
        let clients = io.in(room).clients((error, clients) => {
          let guests = clients.map((client) => {
            return {
              userName: io.sockets.connected[client].userName,
              id: io.sockets.connected[client].id,
              rights: "guest",
            };
          });
          let leftUsers = guests.filter((item) => {
            return item.id != socket.id;
          });
          if (leftUsers[0]) {
            leftUsers[0].rights = "host";
          }
          let leftUsersNumber = leftUsers.length;
          socket.to(room).emit("online users", leftUsers, leftUsersNumber);
        });
        delete rooms[room].users[socket.id];
      });
    });
  });
});

http.listen(config.PORT, config.HOST, function () {
  console.log(`http://${config.HOST}:${config.PORT}`);
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}
