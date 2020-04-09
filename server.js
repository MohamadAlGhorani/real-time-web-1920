const express = require("express");
const compression = require("compression");
const routes = require("./routes/routes");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
let userName;
let users = [];
let loops = [];
var loop = {};

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
      var dateOfMessage = new Date()
      var dateTodeleteLoop = new Date(dateOfMessage.getTime() + 1 * 60000);
      loop = {
        id: socket.id,
        time: dateOfMessage,
        timeToStop: dateTodeleteLoop,
        message: messageToSend
      }
      loops.push(loop)
      console.log(loops)
      myVal = setInterval(() => {
        io.emit("loop message", `${socket.userName}: ${messageToSend}`, ranColor);
        const now = new Date()
        if (now >= dateTodeleteLoop) {
          clearInterval(myVal)
          dateTodeleteLoop = ""
        }
      }, 1000);
    } else if (userMessageWordsArray[0] == "stop") {
      clearInterval(myVal)
      loops = loops.filter(item => {
        return item.id != socket.id
      })
    }
    // loops.map(item => {
    //   setInterval(() => {
    //     const now = new Date()
    //     console.log("now", now)
    //     console.log("stop", item.timeToStop)
    //     if (now >= item.timeToStop) {
    //       io.to(item.id).emit(clearInterval(myVal))
    //     }
    //   }, 1000);
    // })
  });

  socket.emit("server message", "Server: you are connceted");
  socket.broadcast.emit("server message", `Server: ${socket.userName} is connceted`);
  console.log("a user is connceted");

  socket.on("disconnect", function () {
    console.log("user disconnected");
    io.emit("server message", `Server: ${socket.userName} is disconnected`);
  });
});

http.listen(config, function () {
  console.log("listening on *:3000");
});