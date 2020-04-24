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
    const token = req.cookies.accessToken;
    console.log(token);
    Promise.all([
      fetch(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then((response) => response.json()),
      fetch("https://api.spotify.com/v1/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then((response) => response.json()),
    ]).then(([tracksData, data]) => {
      userName = data.display_name;
      res.render("party", {
        title: "Party",
        tracksData: tracksData,
        name: userName,
        id: req.params.id,
      });
    });
  });

io.on("connection", function (socket) {
  socket.userName = userName;

  const user = {
    userName: socket.userName,
    id: socket.id,
  };
  allUsers.push(user);

  socket.on("join party", function (id) {
    socket.roomId = id;
    socket.join(socket.roomId);
  });

  let clients = io.sockets.clients(socket.roomId);
  let clientsArr = Object.keys(clients.connected).map(function (key) {
    return clients.connected[key];
  });
  let geusts = clientsArr.map((user) => {
    return {
      userName: user.userName,
      id: user.id
    };
  });
  console.log("users", geusts);
  let geustsInRoom = geusts.length

  socket.emit("online users", geusts, geustsInRoom);

  socket.on("chat message", function (msg, ranColor) {
    io.to(socket.roomId).emit("chat message", `${userName}: ${msg}`, ranColor);
  });

  socket.emit(
    "server message",
    "Server: you are connceted open your spotify app to listen to the party music"
  );
  socket.broadcast.emit(
    "server message",
    `Server: ${socket.userName} is connceted`
  );
  console.log("a user is connceted");

  socket.on("disconnect", function () {
    console.log("user disconnected");
    io.emit("server message", `Server: ${socket.userName} is disconnected`);
    io.emit("online users", geusts);
  });

  socket.on("getSong", function (id) {
    socket.to(socket.roomId).emit("getTokens", id);
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
    }).then(async (response) => {
      const tracksData = await response.json();
      console.log(tracksData);
      // if(response.status = 404){alert("no device found")} no device found;
      // if(response.status = 403){alert("no premium account")}  no premuim account;
    });
  });
});

http.listen(config, function () {
  console.log("listening on *:3000");
});