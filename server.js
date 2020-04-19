const express = require("express");
const compression = require("compression");
// const routes = require("./routes/routes");
const fetch = require("node-fetch");
const queryString = require("query-string");
const cookieParser = require("cookie-parser");
require("dotenv").config();
var SpotifyWebApi = require("spotify-web-api-node");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const {
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_CLIENT_ID,
} = process.env;

let userName;
var partyId;
var idToJoin;
let users = [];
let loops = [];
var loop = {};

const config = {
  port: process.env.PORT || 3000,
};

app.get("/login", function (req, res) {
  var scopes = "user-read-private user-read-email";
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

    // response.send(data);
    partyId = genraterandomId(10)
    response.redirect(`/chat-${partyId}`);
  } catch (error) {
    console.log("Error!!!", error);

    response.send(error);
  }
});

function encodeToBase64(text) {
  return new Buffer.from(text).toString("base64");
}

app.get("/", function (req, res) {
  res.render("home", {
    title: "Home",
  });
});

app.get("/chat-:id", function (req, res) {
  // userName = req.query.name;
  // console.log("user name", userName);
  // users.push(req.query.name);
  // console.log("users", users);
  res.render("chat", {
    title: "Chat",
    // name: req.query.name,
    name: "blabla",
    id: req.params.id
  });
});

app.get("/join", function (req, res) {
  const party_id = req.query.party_id;
  idToJoin = req.query.party_id
  res.redirect(`/chat-${party_id}`);
  // userName = req.query.name;
  // console.log("user name", userName);
  // users.push(req.query.name);
  // console.log("users", users);
  // res.render("chat", {
  //   title: "Chat",
  //   name: req.query.name,
  // });
});

app
  .set("view engine", "ejs")
  .set("views", "views")

  .use(compression())
  .use(express.static("static"))
  .use(cookieParser());
// .use("/home", routes);

// .listen(config.port, function () {
//   console.log(`Application started on port: ${config.port}`);
// });
io.on("connection", function (socket) {
  // socket.userName = userName;
  socket.on("join party", function (id) {
    socket.roomId = id
    socket.join(socket.roomId);
  });

  socket.on("chat message", function (msg, ranColor) {
    io.to(socket.roomId).emit("chat message", `${msg}`, ranColor);
  });

  socket.emit("server message", "Server: you are connceted");
  socket.broadcast.emit(
    "server message",
    // `Server: ${socket.userName} is connceted`
    `Server:  is connceted`
  );
  console.log("a user is connceted");

  socket.on("disconnect", function () {
    console.log("user disconnected");
    // io.emit("server message", `Server: ${socket.userName} is disconnected`);
    io.to(socket.roomId).emit("server message", `Server: is disconnected`);
  });
});

http.listen(config, function () {
  console.log("listening on *:3000");
});

// this helper function is from Kris Kuiper
function genraterandomId(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let index = 0; index < length; index++) {
    const randomInteger = Math.floor(Math.random() * possible.length);
    const randomLetter = possible[randomInteger];

    randomString += randomLetter;
  }

  return randomString;
}