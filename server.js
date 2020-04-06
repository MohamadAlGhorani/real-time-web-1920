const express = require("express");
const compression = require("compression");
const routes = require("./routes/routes");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const config = {
  port: process.env.PORT || 3000,
};

// const http = require("http").createServer(app);

app.get("/", function (req, res) {
  // Send a plain string using res.send();
  res.redirect("/home");
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
  .use("/home", routes);

// .listen(config.port, function () {
//   console.log(`Application started on port: ${config.port}`);
// });

io.on("connection", function (socket) {
  socket.on("chat message", function (msg) {
    console.log("message: " + msg);
    io.emit("chat message", msg);
  });
  console.log("a user is connceted");
  socket.on("disconnect", function () {
    console.log("user disconnected");
  });
});

http.listen(4000, function () {
  console.log("listening on *:4000");
});
