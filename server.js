const express = require("express");
const compression = require("compression");
const fetch = require("node-fetch");
const queryString = require("query-string");
const cookieParser = require("cookie-parser");
const SpotifyWebApi = require("spotify-web-api-node");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
// const routes = require("./routes/routes");
require("dotenv").config();

const {
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_CLIENT_ID,
} = process.env;

var spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

let users = [];
let userName

const config = {
  port: process.env.PORT || 5000,
};

app
  .set("view engine", "ejs")
  .set("views", "views")

  .use(compression())
  .use(express.static("static"))
  .use(cookieParser());
// .use("/", routes);

app.get("/login", function (req, res) {
  var scopes = 'streaming user-read-private user-read-email user-read-playback-state user-modify-playback-state user-top-read';
  const {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_REDIRECT_URI
  } = process.env;
  res.redirect(
    "https://accounts.spotify.com/authorize" +
    "?response_type=code" +
    "&client_id=" +
    SPOTIFY_CLIENT_ID +
    (scopes ? "&scope=" + encodeURIComponent(scopes) : "") +
    "&redirect_uri=" +
    encodeURIComponent(SPOTIFY_REDIRECT_URI)
  );
});

app.get("/callback", async (request, response, next) => {
  const code = request.query.code;
  const queryObject = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  };
  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${encodeToBase64(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      )}`,
    },
  };
  const query = queryString.stringify(queryObject);
  const url = `https://accounts.spotify.com/api/token?${query}`;

  try {
    const spotifyResponse = await fetch(url, fetchOptions);
    const data = await spotifyResponse.json();

    response.cookie("accessToken", data.access_token);
    response.cookie("refreshToken", data.refresh_token);

    response.redirect(`/home`);
  } catch (error) {
    console.log("Error!!!", error);

    response.send(error);
  }
});

function encodeToBase64(text) {
  return new Buffer.from(text).toString("base64");
}

app.get("/", function (req, res) {
  res.render("login", {
    title: "Login with your premium spotify account",
  });
});

app.get("/home", function (req, res) {
  res.render("home", {
    title: "Home",
  });
});

app.get("/setup", function (req, res) {
  const token = req.cookies.accessToken;
  console.log(token);
  fetch("https://api.spotify.com/v1/me", {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }).then(async response => {
    const data = await response.json();
    fetch(`https://api.spotify.com/v1/users/${data.id}/playlists`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    }).then(async response => {
      const playlistsData = await response.json();
      console.log(playlistsData)
      res.render("setup", {
        title: "Setup",
        playlistsData: playlistsData,
      });
    });
  })
});

app.get("/party-:id", function (req, res) {
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

app.get("/join", function (req, res) {
  const party_id = req.query.party_id;
  idToJoin = req.query.party_id
  res.redirect(`/party-${party_id}`);
});



io.on("connection", function (socket) {
  socket.userName = userName;
  socket.on("join party", function (id) {
    socket.roomId = id
    socket.join(socket.roomId);
  });

  socket.on("chat message", function (msg, ranColor) {
    io.to(socket.roomId).emit("chat message", `${userName}: ${msg}`, ranColor);
  });

  socket.emit("server message", "Server: you are connceted open your spotify app to listen to the party music");
  socket.broadcast.emit(
    "server message",
    `Server: ${socket.userName} is connceted`
  );
  console.log("a user is connceted");

  socket.on("disconnect", function () {
    console.log("user disconnected");
    io.emit("server message", `Server: ${socket.userName} is disconnected`);
  });

  socket.on("getSong", function (id) {
    socket.to(socket.roomId).emit('getTokens', id)
  });
  socket.on("playSong", function (myObject) {
    console.log("my object is:", myObject);
    // const query = queryString.stringify({
    //   uris: ['spotify:track:${myObject.id}']
    // })
    fetch(`https://api.spotify.com/v1/me/player/play`, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${myObject.accessToken}`,
      },
      body: JSON.stringify({
        uris: [`spotify:track:${myObject.id}`]
      })
    }).then(async response => {
      const tracksData = await response.json();
      console.log(tracksData);
      // response.status = 404 no device found;
      // response. status = 403 no premuim account;
    });
  });
});

http.listen(config, function () {
  console.log("listening on *:5000");
});