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
const refreshAccessToken = require("./routes/oAuth/refreshToken");

const landingPageRoute = require("./routes/landingPage");
const homeRoute = require("./routes/home");
const joinRoute = require("./routes/join");
const setupRoute = require("./routes/setup");

const partyServices = require("./database/services/party");
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("connection successful");
  })
  .catch((error) => {
    console.error(error);
  });

const rooms = {};
const roomQueues = {};

const config = {
  PORT: process.env.PORT || 8080,
  HOST: "0.0.0.0",
};

/* ===== INPUT VALIDATION ===== */
function isValidRoomId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9]{1,64}$/.test(id);
}

function isValidUserName(name) {
  return typeof name === "string" && name.length > 0 && name.length <= 100;
}

function isValidUrl(url) {
  if (!url) return true; // empty is ok
  if (typeof url !== "string") return false;
  try {
    var parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (e) {
    return false;
  }
}

function sanitizeString(str, maxLen) {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLen);
}

/* ===== RATE LIMITING ===== */
const socketRateLimits = new Map();

function rateLimit(socketId, event, maxPerWindow, windowMs) {
  var key = socketId + ":" + event;
  var now = Date.now();
  var entry = socketRateLimits.get(key);
  if (!entry || now - entry.start > windowMs) {
    socketRateLimits.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  if (entry.count > maxPerWindow) {
    return false;
  }
  return true;
}

// Clean up rate limit entries periodically
setInterval(function () {
  var now = Date.now();
  socketRateLimits.forEach(function (value, key) {
    if (now - value.start > 60000) socketRateLimits.delete(key);
  });
}, 60000);

/* ===== ROOM CLEANUP ===== */
function cleanupRoom(roomId) {
  if (rooms[roomId]) {
    var userCount = Object.keys(rooms[roomId].users).length;
    if (userCount === 0) {
      delete rooms[roomId];
      delete roomQueues[roomId];
    }
  }
}

/* ===== ROLE CHECK HELPER ===== */
async function isHostOrDj(room, socketId) {
  var hostId = await partyServices.getHostId(room);
  if (hostId === socketId) return true;
  var djId = await partyServices.getDjId(room);
  if (djId === socketId) return true;
  return false;
}

app
  .set("view engine", "ejs")
  .set("views", "views")

  .use(compression())
  .use(function (req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' https://i.scdn.co https://*.spotifycdn.com https://platform-lookaside.fbsbx.com https://*.googleusercontent.com data:; " +
      "connect-src 'self' https://api.spotify.com wss: ws:; " +
      "media-src 'self' blob:; " +
      "object-src 'none'; " +
      "base-uri 'self'"
    );
    next();
  })
  .use(express.static("static", { maxAge: "1d" }))
  .use(cookieParser())

  .get("/login", spotifyLogin)
  .get("/callback", spotifyCallback)

  .get("/refresh", async function (req, res) {
    const newToken = await refreshAccessToken(req, res);
    if (!newToken) {
      return res.status(401).json({ error: "Refresh failed" });
    }
    res.json({ success: true });
  })

  .get("/", landingPageRoute)
  .get("/home", homeRoute)
  .get("/setup", setupRoute)
  .get("/join", joinRoute)
  .get("/party-:id", async function (req, res) {
    var token = req.cookies.accessToken;
    if (!token) {
      // Try refreshing before redirecting
      token = await refreshAccessToken(req, res);
      if (!token) return res.redirect("/");
    }

    if (!isValidRoomId(req.params.id)) {
      return res.status(400).send("Invalid party ID.");
    }

    if (!rooms[req.params.id]) {
      rooms[req.params.id] = {
        users: {},
      };
    }

    async function loadParty(accessToken) {
      const [tracksRes, meRes] = await Promise.all([
        fetch(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks?limit=50`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch("https://api.spotify.com/v1/me", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);

      // If either returns 401, try refreshing
      if (tracksRes.status === 401 || meRes.status === 401) {
        return null;
      }

      const [tracksData, data] = await Promise.all([
        tracksRes.json(),
        meRes.json(),
      ]);
      return { tracksData, data };
    }

    try {
      var result = await loadParty(token);

      // Token expired — refresh and retry once
      if (!result) {
        token = await refreshAccessToken(req, res);
        if (!token) return res.redirect("/");
        result = await loadParty(token);
      }

      if (!result) {
        return res.redirect("/");
      }

      res.render("party", {
        title: "Party",
        tracksData: result.tracksData,
        name: result.data.display_name,
        avatar: result.data.images && result.data.images.length > 0 ? result.data.images[result.data.images.length - 1].url : "",
        id: req.params.id,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Failed to load party. Please try logging in again.");
    }
  });

app.use(function (req, res) {
  res.status(404).render("404", { title: "Page Not Found" });
});

io.on("connection", function (socket) {
  socket.emit(
    "server message",
    "Server: you are connected, open your Spotify app to listen to the party music"
  );

  socket.on("join party", async function (id, name, avatar) {
    if (!isValidRoomId(id)) return;
    if (!isValidUserName(name)) return;
    if (!isValidUrl(avatar)) avatar = "";

    socket.userName = sanitizeString(name, 100);
    socket.userAvatar = sanitizeString(avatar || "", 500);
    if (!rooms[id]) {
      rooms[id] = { users: {} };
    }
    try {
      await partyServices.getIfExists(id).catch(function () {
        return partyServices.create(id);
      });
    } catch (err) {
      console.error("Failed to ensure party exists:", err);
    }
    partyServices.addUser(id, socket.id, name).then(function () {
      rooms[id].users[socket.id] = name;
      socket.roomId = id;
      socket.join(id);
      socket
        .to(id)
        .emit(
          "server message",
          `Server: ${socket.userName} is connected`
        );
      partyServices.getHostId(id).then(function (results) {
        if (results) socket.to(results).emit("getPosition");
      });
      socket.emit("get users");
      if (roomQueues[id]) {
        socket.emit("queue sync", roomQueues[id]);
      }
    }).catch(function (err) {
      console.error("Failed to add user to party:", err.message);
    });
  });

  socket.on("users list", async function (room) {
    if (!isValidRoomId(room)) return;
    const sockets = await io.in(room).fetchSockets();
    const guests = sockets.map((s) => ({
      userName: s.userName,
      id: s.id,
      avatar: s.userAvatar || "",
    }));
    io.to(room).emit("online users", guests, guests.length);
  });

  socket.on("rights", async function (room, token) {
    if (!isValidRoomId(room)) return;
    if (typeof token !== "string" || token.length > 500) return;
    try {
      const meResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await meResponse.json();

      const playlistsResponse = await fetch(`https://api.spotify.com/v1/users/${encodeURIComponent(data.id)}/playlists`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const playlistsData = await playlistsResponse.json();
      if (!playlistsData.items) return;

      const isOwner = playlistsData.items.some((item) => item.id === room);

      if (isOwner) {
        await partyServices.setHostId(room, socket.id);
        socket.to(room).emit("set host icon", socket.id);
        io.to(socket.id).emit("host", socket.id);
        io.to(socket.id).emit("get dj");
      } else {
        const hostId = await partyServices.getHostId(room);
        socket.emit("who host", hostId);

        const djId = await partyServices.getDjId(room);
        socket.emit("who dj", djId);

        const current = await partyServices.getCurrentTrack(room);
        if (current) {
          const position = await partyServices.getTrackPosition(room);
          const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              uris: [`spotify:track:${current}`],
              position_ms: position,
            }),
          });

          if (playResponse.ok) {
            const currentResponse = await fetch(
              `https://api.spotify.com/v1/me/player/currently-playing`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const text = await currentResponse.text();
            if (text) {
              const tracksData = JSON.parse(text);
              if (tracksData) {
                socket.emit("current playing", tracksData);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Rights error:", error);
    }
  });

  socket.on("dj", async function (userId, room, userName) {
    if (!isValidRoomId(room)) return;
    if (typeof userId !== "string") return;
    if (!isValidUserName(userName)) return;

    // Only the host can assign DJs
    var hostId = await partyServices.getHostId(room);
    if (hostId !== socket.id) return;

    const oldDjId = await partyServices.getDjId(room);
    partyServices.setDjId(room, userId).then(function () {
      // Update DJ icon for everyone
      io.to(room).emit("update dj", userId);

      // Notify everyone except the new DJ
      socket.to(room).emit("server message", `Server: ${userName} is the new DJ`);
      // Host also gets the message (socket.emit sends to the emitting socket)
      if (socket.id !== userId) {
        socket.emit("server message", `Server: ${userName} is the new DJ`);
      }

      // Remove play controls from old DJ only
      if (oldDjId && oldDjId !== userId) {
        io.to(oldDjId).emit("delete dj");
      }

      // Give play controls and personal message to new DJ
      io.to(userId).emit("set dj");
      io.to(userId).emit("server message", "Server: You are the DJ now enjoy");
    });
  });

  socket.on("chat message", function (msg, ranColor, room) {
    if (!isValidRoomId(room)) return;
    if (typeof msg !== "string" || msg.length === 0) return;
    if (!rateLimit(socket.id, "chat", 15, 10000)) return; // 15 messages per 10 seconds

    var safeMsg = sanitizeString(msg, 500);
    var safeColor = sanitizeString(ranColor, 6);

    socket
      .to(room)
      .emit("chat message", `${socket.userName}: ${safeMsg}`, safeColor, socket.userAvatar || "");
  });

  socket.on("getSong", async function (id, room) {
    if (!isValidRoomId(room)) return;
    if (typeof id !== "string" || !/^[a-zA-Z0-9]{1,64}$/.test(id)) return;

    // Only host or DJ can play songs
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    socket.emit("getTokens", id);
    socket.to(room).emit("getTokens", id);
  });

  socket.on("set volume", async function (volume, room) {
    if (!isValidRoomId(room)) return;
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    const volumeInt = Math.round(Number(volume));
    if (isNaN(volumeInt) || volumeInt < 0 || volumeInt > 100) return;
    io.to(room).emit("change volume", volumeInt);
  });

  socket.on("play pause", async function (room, action) {
    if (!isValidRoomId(room)) return;
    if (action !== "play" && action !== "pause") return;
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    io.to(room).emit("toggle playback", action);
  });

  socket.on("skip track", async function (room) {
    if (!isValidRoomId(room)) return;
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    io.to(room).emit("next track");
  });

  socket.on("shuffle toggle", async function (room, state) {
    if (!isValidRoomId(room)) return;
    if (typeof state !== "boolean") return;
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    io.to(room).emit("set shuffle", state);
  });

  socket.on("repeat toggle", async function (room, state) {
    if (!isValidRoomId(room)) return;
    if (state !== "off" && state !== "track" && state !== "context") return;
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    io.to(room).emit("set repeat", state);
  });

  socket.on("seek track", async function (room, positionMs) {
    if (!isValidRoomId(room)) return;
    if (typeof positionMs !== "number" || positionMs < 0 || positionMs > 600000) return;
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    io.to(room).emit("seek playback", positionMs);
  });

  socket.on("queue track", async function (room, uri, trackInfo) {
    if (!isValidRoomId(room)) return;
    if (typeof uri !== "string" || !/^spotify:track:[a-zA-Z0-9]{1,64}$/.test(uri)) return;
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    io.to(room).emit("queue add", uri);
    if (trackInfo && typeof trackInfo === "object") {
      var safeTrackInfo = {
        id: sanitizeString(trackInfo.id || "", 64),
        name: sanitizeString(trackInfo.name || "", 200),
        artists: sanitizeString(trackInfo.artists || "", 200),
        art: isValidUrl(trackInfo.art) ? trackInfo.art : "",
      };
      if (!roomQueues[room]) roomQueues[room] = [];
      roomQueues[room].push(safeTrackInfo);
      io.to(room).emit("queue added", safeTrackInfo);
      io.to(room).emit(
        "server message",
        "Server: " + safeTrackInfo.name + " was added to the queue"
      );
    } else {
      io.to(room).emit(
        "server message",
        "Server: A track was added to the queue"
      );
    }
  });

  socket.on("queue remove", async function (room, idx) {
    if (!isValidRoomId(room)) return;
    if (typeof idx !== "number" || idx < 0) return;
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    if (roomQueues[room] && roomQueues[room][idx] !== undefined) {
      roomQueues[room].splice(idx, 1);
    }
    io.to(room).emit("queue removed", idx);
  });

  socket.on("announcement", async function (room, audioData) {
    if (!isValidRoomId(room)) return;
    if (!rateLimit(socket.id, "announce", 3, 30000)) return; // 3 announcements per 30 seconds
    var allowed = await isHostOrDj(room, socket.id);
    if (!allowed) return;

    // Limit audio data size to 1MB
    if (audioData && audioData.byteLength && audioData.byteLength > 1048576) return;

    socket.to(room).emit("play announcement", audioData, socket.userName);
  });

  socket.on("setPosition", function (room, token) {
    if (!isValidRoomId(room)) return;
    if (typeof token !== "string" || token.length > 500) return;

    fetch(`https://api.spotify.com/v1/me/player/currently-playing`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        try {
          const text = await response.text();
          if (!text) return;
          const positionData = JSON.parse(text);
          if (positionData) {
            partyServices.setTrackPosition(room, positionData.progress_ms);
          }
        } catch (err) {
          console.error(
            `Invalid JSON response: ${err.message}`
          );
        }
      })
      .catch((error) => {
        console.error("Fetch error:", error);
      });
  });

  socket.on("playSong", function (myObject) {
    if (!myObject || typeof myObject !== "object") return;
    if (typeof myObject.accessToken !== "string" || myObject.accessToken.length > 500) return;
    if (typeof myObject.id !== "string" || !/^[a-zA-Z0-9]{1,64}$/.test(myObject.id)) return;
    if (!isValidRoomId(myObject.room)) return;

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
        if (response.status === 403) {
          socket.emit(
            "server message",
            "Server: You don't have a spotify premium account. You can chat with people but you can't listen to the party music."
          );
          return;
        }
        if (response.status === 404) {
          socket.emit(
            "server message",
            "Server: We can't find an active device please open your spotify application on your own device and start a random track to activate the session."
          );
          return;
        }
        if (!response.ok) return;
        const currentResponse = await fetch(`https://api.spotify.com/v1/me/player/currently-playing`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${myObject.accessToken}`,
          },
        });
        try {
          const text = await currentResponse.text();
          if (!text) return;
          const tracksData = JSON.parse(text);
          if (tracksData && tracksData.item) {
            await partyServices.setCurrentTrack(myObject.room, tracksData.item.id);
            socket.emit("current playing", tracksData);
            socket.to(myObject.room).emit("current playing", tracksData);
          }
        } catch (err) {
          console.error(`Invalid JSON response: ${err.message}`);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });

  socket.on("disconnect", async function () {
    const userRooms = getUserRooms(socket);
    for (const room of userRooms) {
      const hostId = await partyServices.getHostId(room);
      if (hostId && hostId !== socket.id) {
        socket.to(hostId).emit("getPosition");
      }

      const userName = rooms[room] && rooms[room].users[socket.id];
      await partyServices.removeUser(room, socket.id);

      socket
        .to(room)
        .emit(
          "server message",
          `Server: ${userName || "A user"} is disconnected`
        );

      const sockets = await io.in(room).fetchSockets();
      const remainingUsers = sockets
        .filter((s) => s.id !== socket.id);

      // If the host left, reassign host to the next user
      if (hostId === socket.id && remainingUsers.length > 0) {
        const newHostId = remainingUsers[0].id;
        await partyServices.setHostId(room, newHostId);
        io.to(newHostId).emit("host", newHostId);
        io.to(newHostId).emit("get dj");
        io.to(room).emit("set host icon", newHostId);
        io.to(room).emit(
          "server message",
          `Server: ${remainingUsers[0].userName || "A user"} is the new host`
        );
      }

      const leftUsers = remainingUsers.map((s, index) => ({
        userName: s.userName,
        id: s.id,
        avatar: s.userAvatar || "",
        rights: index === 0 ? "host" : "guest",
      }));
      socket.to(room).emit("online users", leftUsers, leftUsers.length);

      if (rooms[room]) {
        delete rooms[room].users[socket.id];
      }

      // Clean up empty rooms
      cleanupRoom(room);
    }

    // Clean up rate limit entries for this socket
    socketRateLimits.forEach(function (value, key) {
      if (key.startsWith(socket.id + ":")) socketRateLimits.delete(key);
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
