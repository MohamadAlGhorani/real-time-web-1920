const express = require("express");
const compression = require("compression");
const fetch = require("node-fetch");
const cookieParser = require("cookie-parser");
// const SpotifyWebApi = require("spotify-web-api-node");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const spotifyCallback = require("./routes/oAuth/callback");
const spotifyLogin = require("./routes/oAuth/login");

const landingPageRoute = require("./routes/landingPage");
const homeRoute = require("./routes/home");
const joinRoute = require("./routes/join");
const partyRoute = require("./routes/party");
const setupRoute = require("./routes/setup");
require("dotenv").config();

// var spotifyApi = new SpotifyWebApi({
//   clientId: process.env.SPOTIFY_CLIENT_ID,
//   clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
//   redirectUri: process.env.SPOTIFY_REDIRECT_URI
// });

let allUsers = [];
const rooms = {}
let userName;

const config = {
  port: process.env.PORT || 3000,
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
    rooms[req.params.id] = {
      users: {}
    }
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
  });

io.on("connection", function (socket) {
  socket.userName = userName

  socket.emit(
    "server message",
    "Server: you are connceted open your spotify app to listen to the party music"
  );

  socket.on("join party", function (id, name) {
    rooms[id].users[socket.id] = name
    socket.roomId = id;
    socket.join(id);
    socket.to(id).broadcast.emit(
      "server message",
      `Server: ${socket.userName} is connceted`
    );
  });

  socket.emit("get users");

  socket.on("users list", function (room) {
    let clients = io.in(room).clients((error, clients) => {
      let geusts = clients.map(client => {
        return {
          userName: io.sockets.connected[client].userName,
          id: io.sockets.connected[client].id
        }
      })
      console.log(geusts)
      let guestsInRoom = clients.length
      io.to(room).emit("online users", geusts, guestsInRoom);
    })
  });

  socket.on("chat message", function (msg, ranColor, room) {
    socket.to(room).broadcast.emit("chat message", `${socket.userName}: ${msg}`, ranColor);
  });

  socket.on("getSong", function (id, room) {
    socket.emit("getTokens", id);
  });

  socket.on("playSong", function (myObject) {
    console.log("my object is:", myObject);
    // const query = queryString.stringify({
    //   uris: ['spotify:track:${myObject.id}']
    // })
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
      .then((response) => {
        // const tracksData = await response.json();
        console.log("My response is:", response, response.status);
        // if(response.status = 404){alert("no device found")} no device found;
        // if(response.status = 403){alert("no premium account")}  no premuim account;
      }).catch((error) => {
        console.log(error)
      });
  });

  socket.on("disconnect", function () {
    getUserRooms(socket).forEach(room => {
      socket.to(room).broadcast.emit('server message', `Server: ${rooms[room].users[socket.id]} is disconnected`)
      let clients = io.in(room).clients((error, clients) => {
        let geusts = clients.map(client => {
          return {
            userName: io.sockets.connected[client].userName,
            id: io.sockets.connected[client].id
          }
        })
        let leftUsers = geusts.filter(item => {
          return item.id != socket.id
        })
        let leftUsersNumber = leftUsers.length
        socket.to(room).emit("online users", leftUsers, leftUsersNumber);
      })
      delete rooms[room].users[socket.id]
    })
  });

});

http.listen(config, function () {
  console.log("listening on *:3000");
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}