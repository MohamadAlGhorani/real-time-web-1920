const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
require("dotenv").config();

router.get("/", function (req, res, next) {
  res.render("home", {
    title: "Home",
  });
});

router.get("/chat", function (req, res, next) {
  res.render("chat", {
    title: "Chat",
    name: req.query.name,
  });
});

module.exports = router;
