const express = require("express");
const compression = require("compression");
const routes = require("./routes/routes");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
let userName;
let users = [];

const config = {
  port: process.env.PORT || 3000,
};

// const http = require("http").createServer(app);

// app.get("/", function (req, res) {
//   // Send a plain string using res.send();
//   res.redirect("/home");
// });

app.get("/", function (req, res) {
  res.render("home", {
    title: "Home",
  });
});

app.get("/chat", function (req, res) {
  userName = req.query.name
  console.log("user name", userName)
  users.push(req.query.name)
  console.log("users", users)
  res.render("chat", {
    title: "Chat",
    name: req.query.name,
  });
});

// http.listen(4000, function () {
//   console.log("listening on *:4000");
// });

app
  // .enable("etag") // use strong etags
  // .set("etag", "strong") // same
  .set("view engine", "ejs")
  .set("views", "views")

  .use(compression())
  // .use((req, res, next) => {
  //   res.header("Cache-Control", "max-age=2592000000");
  //   next();
  // })
  .use(express.static("static"))
// .use("/home", routes);

// .listen(config.port, function () {
//   console.log(`Application started on port: ${config.port}`);
// });

io.on("connection", function (socket) {
  socket.userName = userName
  var myVal;

  socket.on("chat message", function (msg, ranColor) {
    let userMessage = new String(msg)
    let userMessageWordsArray = userMessage.split(" ")
    console.log("message: " + msg, );
    io.emit("chat message", `${socket.userName}: ${msg}`, ranColor);
    if (userMessageWordsArray[0] == "loop") {
      var filterMessage = userMessageWordsArray.filter(item => {
        return item != "loop"
      })
      var messageToSend = filterMessage.join(" ")
      myVal = setInterval(() => {
        io.emit("loop message", `${socket.userName}: ${messageToSend}`, ranColor);
      }, 1000);
    } else if (userMessageWordsArray[0] == "stop") {
      clearInterval(myVal)
    }
  });

  socket.emit("server message", "Server: you are connceted");
  socket.broadcast.emit("server message", `Server: ${socket.userName} is connceted`);
  console.log("a user is connceted");

  socket.on("disconnect", function () {
    console.log("user disconnected");
    io.emit("server message", `Server: ${socket.userName} is disconnected`);
  });
});

http.listen(4000, function () {
  console.log("listening on *:4000");
});