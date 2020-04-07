const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
require("dotenv").config();
let userName;
let users = [];

router.get("/", function (req, res, next) {
  res.render("home", {
    title: "Home",
  });
});

router.get("/chat", function (req, res, next) {
  userName = req.query.name
  console.log("user name", userName)
  users.push(req.query.name)
  console.log("users", users)
  res.render("chat", {
    title: "Chat",
    name: req.query.name,
  });
});

module.exports = router;