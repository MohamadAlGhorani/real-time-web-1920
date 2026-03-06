/* ===== STATE ===== */
var randomColor = ("000000" + Math.floor(Math.random() * 16777215).toString(16)).slice(-6);
var socket = io();
var form = document.querySelector("#form");
var rightsChecked = false;
var isHost = false;
var isDj = false;
var shuffleState = false;
var repeatState = "off";
var mediaRecorder = null;
var audioChunks = [];
var currentTrackId = null;
var progressInterval = null;
var searchTimeout = null;
var partyQueue = [];
var isPlayEnding = false;
var currentArtistId = null;
var currentArtistName = null;

/* ===== ELEMENTS ===== */
var volume = document.getElementById("volume");
var playPauseBtn = document.getElementById("play-pause-btn");
var skipBtn = document.getElementById("skip-btn");
var shuffleBtn = document.getElementById("shuffle-btn");
var repeatBtn = document.getElementById("repeat-btn");
var announceBtn = document.getElementById("announce-btn");
var djBar = document.getElementById("dj-bar");
var nowPlaying = document.getElementById("now-playing");
var searchInput = document.getElementById("search-input");
var searchResults = document.getElementById("search-results");
var recsResults = document.getElementById("recs-results");
var refreshRecsBtn = document.getElementById("refresh-recs");
var usersListEl = document.getElementById("users-list");
var usersCountEl = document.getElementById("users-count");
var hostHintEl = document.getElementById("host-hint");
var mobileUsersListEl = document.getElementById("mobile-users-list");
var mobileHostHintEl = document.getElementById("mobile-host-hint");
var mobileSearchInput = document.querySelector(".mobile-search-input");
var mobileSearchResults = document.getElementById("mobile-search-results");
var mobileRecsResults = document.getElementById("mobile-recs-results");
var mobileRefreshRecsBtn = document.querySelector(".mobile-refresh-recs");
var upNextToggle = document.getElementById("up-next-toggle");
var upNextList = document.getElementById("up-next-list");
var upNextPreview = document.getElementById("up-next-preview");
var upNextEmpty = document.getElementById("up-next-empty");

/* ===== HELPERS ===== */
var isRefreshing = false;
var refreshPromise = null;

function getToken() {
    var cookie = document.cookie.split(";").find(function (item) {
        return item.includes("accessToken");
    });
    if (!cookie) return null;
    return cookie.split("=")[1].trim();
}

function refreshToken() {
    if (isRefreshing) return refreshPromise;
    isRefreshing = true;
    refreshPromise = fetch("/refresh")
        .then(function (res) {
            isRefreshing = false;
            if (!res.ok) {
                window.location.href = "/";
                return null;
            }
            return getToken();
        })
        .catch(function () {
            isRefreshing = false;
            return null;
        });
    return refreshPromise;
}

function spotifyFetch(url, options) {
    var token = getToken();
    if (!options) options = {};
    if (!options.headers) options.headers = {};

    if (!token) {
        return refreshToken().then(function (newToken) {
            if (!newToken) return null;
            options.headers["Authorization"] = "Bearer " + newToken;
            return fetch(url, options);
        });
    }

    options.headers["Authorization"] = "Bearer " + token;
    return fetch(url, options).then(function (res) {
        if (res.status === 401) {
            return refreshToken().then(function (newToken) {
                if (!newToken) return null;
                options.headers["Authorization"] = "Bearer " + newToken;
                return fetch(url, options);
            });
        }
        return res;
    });
}

function formatTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
}

function createChatBubble(msg, color, avatar) {
    var li = document.createElement("li");
    li.classList.add("chat-bubble");
    if (avatar) {
        var img = document.createElement("img");
        img.src = avatar;
        img.alt = "";
        img.className = "chat-avatar";
        img.referrerPolicy = "no-referrer";
        li.appendChild(img);
    } else {
        var initial = document.createElement("div");
        initial.className = "chat-avatar-placeholder";
        var colonIdx = msg.indexOf(":");
        initial.textContent = colonIdx > 0 ? msg.charAt(0).toUpperCase() : "?";
        li.appendChild(initial);
    }
    var text = document.createElement("span");
    text.className = "chat-text";
    text.textContent = msg;
    text.style.color = color;
    li.style.backgroundColor = "rgba(255,255,255,0.08)";
    li.appendChild(text);
    return li;
}

function addServerMessage(msg) {
    var ul = document.querySelector("#messages");
    if (!ul) return;
    var li = document.createElement("li");
    li.textContent = msg;
    li.classList.add("server-message");
    ul.appendChild(li);
    li.scrollIntoView();
}

function showDjControls() {
    if (djBar) djBar.classList.add("visible");
    var djOnlyEls = document.querySelectorAll(".dj-only");
    for (var i = 0; i < djOnlyEls.length; i++) {
        djOnlyEls[i].classList.add("visible");
    }
}

function hideDjControls() {
    if (djBar) djBar.classList.remove("visible");
    var djOnlyEls = document.querySelectorAll(".dj-only");
    for (var i = 0; i < djOnlyEls.length; i++) {
        djOnlyEls[i].classList.remove("visible");
    }
}

function getInitials(name) {
    if (!name) return "?";
    var parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

/* ===== NOW PLAYING & PROGRESS ===== */
function updateNowPlaying(data) {
    if (!data || !data.item) return;
    currentTrackId = data.item.id;
    currentArtistId = data.item.artists[0] ? data.item.artists[0].id : null;
    currentArtistName = data.item.artists[0] ? data.item.artists[0].name : null;
    var artists = data.item.artists.map(function (a) { return a.name; }).join(", ");
    var albumArt = data.item.album.images[0] ? data.item.album.images[0].url : "";
    var duration = data.item.duration_ms || 0;
    var progress = data.progress_ms || 0;

    nowPlaying.classList.remove("empty");
    nowPlaying.innerHTML =
        '<img class="now-playing-art" src="' + albumArt + '" alt="">' +
        '<div class="now-playing-info">' +
            '<div class="now-playing-title">' + escapeHtml(data.item.name) + '</div>' +
            '<div class="now-playing-artist">' + escapeHtml(artists) + '</div>' +
        '</div>' +
        '<div class="progress-container">' +
            '<span class="progress-time" id="progress-current">' + formatTime(progress) + '</span>' +
            '<div class="progress-bar" id="progress-bar">' +
                '<div class="progress-bar-fill" id="progress-fill" style="width:' + (duration ? (progress / duration * 100) : 0) + '%"></div>' +
            '</div>' +
            '<span class="progress-time">' + formatTime(duration) + '</span>' +
        '</div>';

    startProgressPolling(progress, duration);
    setupSeekBar(duration);
}

function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function startProgressPolling(startProgress, duration) {
    if (progressInterval) clearInterval(progressInterval);
    var current = startProgress;
    progressInterval = setInterval(function () {
        current += 1000;
        if (current > duration) current = duration;
        var fill = document.getElementById("progress-fill");
        var timeEl = document.getElementById("progress-current");
        if (fill) fill.style.width = (duration ? (current / duration * 100) : 0) + "%";
        if (timeEl) timeEl.textContent = formatTime(current);
    }, 1000);
}

var currentDuration = 0;
function setupSeekBar(duration) {
    currentDuration = duration;
    var bar = document.getElementById("progress-bar");
    if (!bar || bar.dataset.seekBound) return;
    bar.dataset.seekBound = "1";
    bar.addEventListener("click", function (e) {
        if (!isDj && !isHost) return;
        var rect = bar.getBoundingClientRect();
        var pct = (e.clientX - rect.left) / rect.width;
        var posMs = Math.floor(pct * currentDuration);
        socket.emit("seek track", room, posMs);
    });
}

/* ===== VOLUME ===== */
if (volume) {
    volume.addEventListener("change", function () {
        socket.emit("set volume", volume.value, room);
    });
}

socket.on("change volume", function (volumeLevel) {
    spotifyFetch("https://api.spotify.com/v1/me/player/volume?volume_percent=" + volumeLevel, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
    }).then(function (res) {
        if (res && res.status === 404) addServerMessage("No active device found. Open Spotify first.");
    }).catch(function () {});
});

/* ===== PLAY SONG (from playlist) ===== */
function attachPlayButtons() {
    var playBtns = document.querySelectorAll(".track-play-btn");
    for (var i = 0; i < playBtns.length; i++) {
        playBtns[i].addEventListener("click", function () {
            var songId = this.getAttribute("data-id");
            if (songId) socket.emit("getSong", songId, room);
        });
    }
}
attachPlayButtons();

/* ===== QUEUE TRACK ===== */
function getTrackInfoFromButton(btn) {
    var item = btn.closest(".track-item");
    if (!item) return null;
    var nameEl = item.querySelector(".track-name");
    var artistEl = item.querySelector(".track-artist");
    var artEl = item.querySelector(".track-art");
    return {
        id: btn.getAttribute("data-id") || btn.getAttribute("data-uri").replace("spotify:track:", ""),
        name: nameEl ? nameEl.textContent : "",
        artists: artistEl ? artistEl.textContent : "",
        art: artEl ? artEl.src : ""
    };
}

function attachQueueButtons() {
    var queueBtns = document.querySelectorAll(".track-queue-btn");
    for (var i = 0; i < queueBtns.length; i++) {
        queueBtns[i].addEventListener("click", function () {
            var uri = this.getAttribute("data-uri");
            var trackInfo = getTrackInfoFromButton(this);
            if (uri) socket.emit("queue track", room, uri, trackInfo);
        });
    }
}
attachQueueButtons();

/* Initial Up Next render */
if (typeof renderUpNext === "function") {
    setTimeout(renderUpNext, 100);
}

/* ===== CHAT ===== */
if (form) {
    socket.emit("join party", room, name, userAvatar);
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = document.querySelector("#m");
        var inputValue = input.value;
        if (!inputValue.trim()) return;

        var ul = document.querySelector("#messages");
        var li = createChatBubble("You: " + inputValue, "#" + randomColor, userAvatar);
        ul.appendChild(li);
        li.scrollIntoView();

        socket.emit("chat message", inputValue, randomColor, room, userAvatar);
        input.value = "";
    });

    socket.on("server message", function (msg) {
        addServerMessage(msg);
    });

    socket.on("get users", function () {
        socket.emit("users list", room);
    });
}

socket.on("chat message", function (msg, ranColor, avatar) {
    var ul = document.querySelector("#messages");
    if (!ul) return;
    var li = createChatBubble(msg, "#" + ranColor, avatar);
    ul.appendChild(li);
    li.scrollIntoView();
});

/* ===== POSITION SYNC ===== */
socket.on("getPosition", function () {
    var token = getToken();
    if (!token) {
        refreshToken().then(function (t) {
            if (t) socket.emit("setPosition", room, t);
        });
        return;
    }
    socket.emit("setPosition", room, token);
});

socket.on("getTokens", function (id) {
    var token = getToken();
    if (!token) {
        refreshToken().then(function (t) {
            if (t) socket.emit("playSong", { id: id, accessToken: t, room: room });
        });
        return;
    }
    socket.emit("playSong", { id: id, accessToken: token, room: room });
});

/* ===== ROLES ===== */
socket.on("host", function (id) {
    isHost = true;
    isDj = true;
    showDjControls();
    if (hostHintEl) hostHintEl.classList.add("visible");
    if (mobileHostHintEl) mobileHostHintEl.classList.add("visible");
    markUserRole(id, "host");
});

socket.on("set host icon", function (id) { markUserRole(id, "host"); });
socket.on("who host", function (id) { markUserRole(id, "host"); });
socket.on("who dj", function (id) { markUserRole(id, "dj"); });

socket.on("set dj", function () {
    isDj = true;
    showDjControls();
});

socket.on("get dj", function () {
    /* Host can now assign DJs */
});

socket.on("delete dj", function () {
    if (isHost) return;
    isDj = false;
    hideDjControls();
});

/* ===== USERS LIST ===== */
socket.on("online users", function (users, usersNumber) {
    renderUserList(usersListEl, users);
    renderUserList(mobileUsersListEl, users);
    if (usersCountEl) usersCountEl.textContent = usersNumber;

    var inlineCount = document.querySelector(".users-count-inline");
    if (inlineCount) inlineCount.textContent = usersNumber;
    var mobileCount = document.querySelector(".mobile-user-count");
    if (mobileCount) mobileCount.textContent = usersNumber;

    if (!rightsChecked) {
        rightsChecked = true;
        var token = getToken();
        if (token) {
            socket.emit("rights", room, token);
        } else {
            refreshToken().then(function (t) {
                if (t) socket.emit("rights", room, t);
            });
        }
    }
});

function renderUserList(container, users) {
    if (!container) return;
    container.innerHTML = "";
    users.forEach(function (user) {
        var li = document.createElement("li");
        li.setAttribute("data-id", user.id);

        var avatar;
        if (user.avatar) {
            avatar = document.createElement("img");
            avatar.src = user.avatar;
            avatar.alt = "";
            avatar.className = "user-avatar user-avatar-img";
            avatar.referrerPolicy = "no-referrer";
        } else {
            avatar = document.createElement("div");
            avatar.className = "user-avatar";
            avatar.textContent = getInitials(user.userName);
        }

        var nameSpan = document.createElement("span");
        nameSpan.className = "user-name-text";
        nameSpan.textContent = user.userName;

        li.appendChild(avatar);
        li.appendChild(nameSpan);

        if (isHost) {
            li.classList.add("clickable");
            li.addEventListener("click", function () {
                var userId = this.getAttribute("data-id");
                var uName = nameSpan.textContent;
                socket.emit("dj", userId, room, uName);
            });
        }

        container.appendChild(li);
    });
}

socket.on("update dj", function (id) {
    var allUsers = document.querySelectorAll(".users-list li");
    for (var i = 0; i < allUsers.length; i++) {
        allUsers[i].classList.remove("dj");
        var oldBadge = allUsers[i].querySelector(".badge-dj");
        if (oldBadge) oldBadge.remove();
    }
    markUserRole(id, "dj");
});

function markUserRole(id, role) {
    var els = document.querySelectorAll('[data-id="' + id + '"]');
    for (var i = 0; i < els.length; i++) {
        els[i].classList.add(role);
        if (!els[i].querySelector(".badge-" + role)) {
            var badge = document.createElement("span");
            badge.className = "user-badge badge-" + role;
            badge.textContent = role;
            els[i].appendChild(badge);
        }
    }
}

/* ===== NOW PLAYING EVENT ===== */
socket.on("current playing", function (data) {
    updateNowPlaying(data);
});

/* ===== DJ CONTROLS: PLAY/PAUSE ===== */
if (playPauseBtn) {
    playPauseBtn.addEventListener("click", function () {
        spotifyFetch("https://api.spotify.com/v1/me/player", {
            headers: {}
        }).then(function (res) {
            if (!res || res.status === 204 || !res.ok) return null;
            return res.json();
        }).then(function (data) {
            if (!data) return;
            var action = data.is_playing ? "pause" : "play";
            socket.emit("play pause", room, action);
        }).catch(function () {});
    });
}

socket.on("toggle playback", function (action) {
    var endpoint = action === "pause"
        ? "https://api.spotify.com/v1/me/player/pause"
        : "https://api.spotify.com/v1/me/player/play";
    spotifyFetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
    }).catch(function () {});

    var icon = playPauseBtn ? playPauseBtn.querySelector(".material-symbols-outlined") : null;
    if (icon) icon.textContent = action === "pause" ? "play_arrow" : "pause";
});

/* ===== DJ CONTROLS: SKIP ===== */
if (skipBtn) {
    skipBtn.addEventListener("click", function () {
        socket.emit("skip track", room);
    });
}

socket.on("next track", function () {
    spotifyFetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }).then(function () {
        setTimeout(function () { pollCurrentlyPlaying(); }, 1500);
    }).catch(function () {});
});

/* ===== DJ CONTROLS: SHUFFLE ===== */
if (shuffleBtn) {
    shuffleBtn.addEventListener("click", function () {
        shuffleState = !shuffleState;
        if (shuffleState) {
            shuffleBtn.classList.add("active");
        } else {
            shuffleBtn.classList.remove("active");
        }
        shuffleBtn.setAttribute("aria-pressed", String(shuffleState));
        socket.emit("shuffle toggle", room, shuffleState);
    });
}

socket.on("set shuffle", function (state) {
    spotifyFetch("https://api.spotify.com/v1/me/player/shuffle?state=" + state, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
    }).catch(function () {});
});

/* ===== DJ CONTROLS: REPEAT ===== */
if (repeatBtn) {
    repeatBtn.addEventListener("click", function () {
        if (repeatState === "off") repeatState = "track";
        else if (repeatState === "track") repeatState = "context";
        else repeatState = "off";

        if (repeatState !== "off") {
            repeatBtn.classList.add("active");
        } else {
            repeatBtn.classList.remove("active");
        }
        repeatBtn.setAttribute("aria-pressed", String(repeatState !== "off"));
        repeatBtn.setAttribute("aria-label", "Repeat mode: " + repeatState);
        socket.emit("repeat toggle", room, repeatState);
    });
}

socket.on("set repeat", function (state) {
    spotifyFetch("https://api.spotify.com/v1/me/player/repeat?state=" + state, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
    }).catch(function () {});
});

/* ===== DJ CONTROLS: SEEK ===== */
socket.on("seek playback", function (posMs) {
    spotifyFetch("https://api.spotify.com/v1/me/player/seek?position_ms=" + posMs, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
    }).catch(function () {});
});

/* ===== QUEUE ===== */
socket.on("queue add", function (uri) {
    spotifyFetch("https://api.spotify.com/v1/me/player/queue?uri=" + encodeURIComponent(uri), {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }).catch(function () {});
});

/* ===== SEARCH ===== */
function doSearch(query, resultsContainer) {
    if (!query.trim()) return;
    spotifyFetch("https://api.spotify.com/v1/search?q=" + encodeURIComponent(query) + "&type=track&limit=15", {
        headers: {}
    }).then(function (res) { if (!res) return { tracks: null }; return res.json(); })
    .then(function (data) {
        if (!data.tracks || !data.tracks.items) return;
        resultsContainer.innerHTML = "";
        data.tracks.items.forEach(function (track) {
            var artists = track.artists.map(function (a) { return a.name; }).join(", ");
            var img = track.album.images.length ? track.album.images[track.album.images.length > 1 ? 1 : 0].url : "";
            var div = document.createElement("div");
            div.className = "track-item";
            div.innerHTML =
                '<img class="track-art" src="' + img + '" alt="">' +
                '<div class="track-info">' +
                    '<div class="track-name">' + escapeHtml(track.name) + '</div>' +
                    '<div class="track-artist">' + escapeHtml(artists) + '</div>' +
                '</div>' +
                '<div class="track-actions' + ((isDj || isHost) ? '' : ' dj-only') + '">' +
                    '<button class="track-queue-btn" data-uri="spotify:track:' + track.id + '" title="Add to queue">' +
                        '<span class="material-symbols-outlined" style="font-size:18px;">playlist_add</span>' +
                    '</button>' +
                    '<button class="track-play-btn" data-id="' + track.id + '" title="Play now">' +
                        '<span class="material-symbols-outlined" style="font-size:18px;">play_arrow</span>' +
                    '</button>' +
                '</div>';
            resultsContainer.appendChild(div);
        });
        attachSearchResultActions(resultsContainer);
    }).catch(function () {});
}

function attachSearchResultActions(container) {
    var playBtns = container.querySelectorAll(".track-play-btn");
    for (var i = 0; i < playBtns.length; i++) {
        playBtns[i].addEventListener("click", function () {
            var id = this.getAttribute("data-id");
            if (id) socket.emit("getSong", id, room);
        });
    }
    var queueBtns = container.querySelectorAll(".track-queue-btn");
    for (var j = 0; j < queueBtns.length; j++) {
        queueBtns[j].addEventListener("click", function () {
            var uri = this.getAttribute("data-uri");
            var trackInfo = getTrackInfoFromButton(this);
            if (uri) socket.emit("queue track", room, uri, trackInfo);
        });
    }
}

if (searchInput) {
    searchInput.addEventListener("input", function () {
        clearTimeout(searchTimeout);
        var q = searchInput.value;
        searchTimeout = setTimeout(function () { doSearch(q, searchResults); }, 400);
    });
}

if (mobileSearchInput) {
    mobileSearchInput.addEventListener("input", function () {
        clearTimeout(searchTimeout);
        var q = mobileSearchInput.value;
        searchTimeout = setTimeout(function () { doSearch(q, mobileSearchResults); }, 400);
    });
}

/* ===== RECOMMENDATIONS (via artist top tracks + search for similar) ===== */
function loadRecommendations() {
    if (!currentArtistId) return;
    var allTracks = [];
    var seenIds = {};

    function addUnique(track) {
        if (track.id !== currentTrackId && !seenIds[track.id]) {
            seenIds[track.id] = true;
            allTracks.push(track);
        }
    }

    function shuffleAndRender() {
        for (var i = allTracks.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = allTracks[i];
            allTracks[i] = allTracks[j];
            allTracks[j] = tmp;
        }
        renderRecommendations(recsResults, allTracks.slice(0, 15));
        renderRecommendations(mobileRecsResults, allTracks.slice(0, 15));
    }

    /* Fetch current artist's top tracks */
    spotifyFetch("https://api.spotify.com/v1/artists/" + currentArtistId + "/top-tracks?market=from_token", {
        headers: {}
    }).then(function (res) {
        if (!res || !res.ok) return { tracks: [] };
        return res.json();
    }).then(function (data) {
        if (data.tracks) {
            data.tracks.forEach(addUnique);
        }
        /* Search for similar tracks using the artist name as a query */
        if (!currentArtistName) {
            shuffleAndRender();
            return;
        }
        return spotifyFetch("https://api.spotify.com/v1/search?q=" + encodeURIComponent(currentArtistName) + "&type=track&limit=20", {
            headers: {}
        });
    }).then(function (res) {
        if (!res || !res.ok) return null;
        return res.json();
    }).then(function (data) {
        if (data && data.tracks && data.tracks.items) {
            data.tracks.items.forEach(addUnique);
        }
        shuffleAndRender();
    }).catch(function () {
        /* If anything fails, render what we have */
        shuffleAndRender();
    });
}

function renderRecommendations(container, tracks) {
    if (!container) return;
    container.innerHTML = "";
    if (!tracks.length) {
        container.innerHTML = '<div class="recs-empty">No recommendations available</div>';
        return;
    }
    tracks.forEach(function (track) {
        var artists = track.artists.map(function (a) { return a.name; }).join(", ");
        var img = track.album.images.length ? track.album.images[track.album.images.length > 1 ? 1 : 0].url : "";
        var div = document.createElement("div");
        div.className = "track-item";
        div.innerHTML =
            '<img class="track-art" src="' + img + '" alt="">' +
            '<div class="track-info">' +
                '<div class="track-name">' + escapeHtml(track.name) + '</div>' +
                '<div class="track-artist">' + escapeHtml(artists) + '</div>' +
            '</div>' +
            '<div class="track-actions' + ((isDj || isHost) ? '' : ' dj-only') + '">' +
                '<button class="track-queue-btn" data-uri="spotify:track:' + track.id + '" title="Add to queue">' +
                    '<span class="material-symbols-outlined" style="font-size:18px;">playlist_add</span>' +
                '</button>' +
                '<button class="track-play-btn" data-id="' + track.id + '" title="Play now">' +
                    '<span class="material-symbols-outlined" style="font-size:18px;">play_arrow</span>' +
                '</button>' +
            '</div>';
        container.appendChild(div);
    });
    attachSearchResultActions(container);
}

if (refreshRecsBtn) {
    refreshRecsBtn.addEventListener("click", loadRecommendations);
}
if (mobileRefreshRecsBtn) {
    mobileRefreshRecsBtn.addEventListener("click", loadRecommendations);
}

/* ===== UP NEXT QUEUE ===== */
if (upNextToggle) {
    upNextToggle.addEventListener("click", function () {
        var expanded = upNextToggle.getAttribute("aria-expanded") === "true";
        upNextToggle.setAttribute("aria-expanded", String(!expanded));
        upNextList.classList.toggle("open");
    });
}

function addToPartyQueue(track) {
    partyQueue.push(track);
    renderUpNext();
}

function removeFromPartyQueue(index) {
    partyQueue.splice(index, 1);
    renderUpNext();
}

var playlistIndex = -1;

function getNextPlaylistTrack() {
    if (!window.playlistTracks || !playlistTracks.length) return null;

    // Try to find current track in playlist to stay in sync
    if (currentTrackId) {
        for (var i = 0; i < playlistTracks.length; i++) {
            if (playlistTracks[i].id === currentTrackId) {
                playlistIndex = i;
                break;
            }
        }
    }

    // Move to the next track
    if (shuffleState) {
        var rand = Math.floor(Math.random() * playlistTracks.length);
        playlistIndex = rand;
    } else {
        playlistIndex = playlistIndex + 1;
        if (playlistIndex >= playlistTracks.length) {
            playlistIndex = 0; // loop back to start
        }
    }

    return playlistTracks[playlistIndex];
}

function renderUpNext() {
    if (!upNextList || !upNextPreview) return;

    /* Clear old items but keep the empty placeholder */
    var oldItems = upNextList.querySelectorAll(".up-next-item");
    for (var i = 0; i < oldItems.length; i++) oldItems[i].remove();

    var items = [];

    /* Manually queued tracks first */
    for (var q = 0; q < partyQueue.length; q++) {
        items.push({ track: partyQueue[q], source: "queue", queueIndex: q });
    }

    /* Then next from playlist as a fallback preview */
    var nextPlaylist = getNextPlaylistTrack();
    if (nextPlaylist) {
        items.push({ track: nextPlaylist, source: "playlist", queueIndex: -1 });
    }

    if (items.length === 0) {
        if (upNextEmpty) upNextEmpty.style.display = "block";
        upNextPreview.textContent = "No tracks queued";
        return;
    }

    if (upNextEmpty) upNextEmpty.style.display = "none";

    /* Preview text */
    upNextPreview.textContent = items[0].track.name + " — " + items[0].track.artists;

    for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var div = document.createElement("div");
        div.className = "up-next-item";
        div.setAttribute("role", "listitem");

        var art = item.track.art ? '<img class="track-art" src="' + escapeHtml(item.track.art) + '" alt="">' : '';
        var sourceTag = item.source === "queue"
            ? '<span class="up-next-source queue-source">Queued</span>'
            : '<span class="up-next-source playlist-source">From playlist</span>';

        div.innerHTML = art +
            '<div class="track-info">' +
                '<div class="track-name">' + escapeHtml(item.track.name) + '</div>' +
                '<div class="track-artist">' + escapeHtml(item.track.artists) + '</div>' +
            '</div>' +
            sourceTag +
            (item.source === "queue" && (isDj || isHost) ?
                '<button class="up-next-remove" data-queue-idx="' + item.queueIndex + '" title="Remove from queue" aria-label="Remove ' + escapeHtml(item.track.name) + ' from queue">' +
                    '<span class="material-symbols-outlined" style="font-size:16px;" aria-hidden="true">close</span>' +
                '</button>' : '');
        upNextList.appendChild(div);
    }

    /* Bind remove buttons */
    var removeBtns = upNextList.querySelectorAll(".up-next-remove");
    for (var r = 0; r < removeBtns.length; r++) {
        removeBtns[r].addEventListener("click", function (e) {
            e.stopPropagation();
            var idx = parseInt(this.getAttribute("data-queue-idx"), 10);
            socket.emit("queue remove", room, idx);
        });
    }
}

/* When a track is queued, add to local queue for display */
socket.on("queue added", function (trackInfo) {
    addToPartyQueue(trackInfo);
});

socket.on("queue removed", function (idx) {
    removeFromPartyQueue(idx);
});

socket.on("queue sync", function (queue) {
    partyQueue = queue;
    renderUpNext();
});

/* Auto-play next track when current one ends */
function checkTrackEnd() {
    if (!(isDj || isHost)) return;
    spotifyFetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {}
    }).then(function (res) {
        if (!res) return null;
        if (res.status === 204) {
            /* Nothing playing — auto-play next */
            if (!isPlayEnding) {
                isPlayEnding = true;
                playNextInQueue();
            }
            return null;
        }
        if (!res.ok) return null;
        return res.json();
    }).then(function (data) {
        if (!data) return;
        /* Track about to end (within 3 seconds) and not paused */
        if (data.item && data.is_playing) {
            var remaining = data.item.duration_ms - data.progress_ms;
            if (remaining < 3000 && !isPlayEnding) {
                isPlayEnding = true;
                setTimeout(function () { playNextInQueue(); }, remaining + 500);
            } else if (remaining >= 3000) {
                isPlayEnding = false;
            }
        }
    }).catch(function () {});
}

function playNextInQueue() {
    if (partyQueue.length > 0) {
        /* Play first from manual queue */
        var next = partyQueue[0];
        socket.emit("getSong", next.id, room);
        socket.emit("queue remove", room, 0);
    } else {
        /* Fall back to next playlist track */
        var nextPlaylist = getNextPlaylistTrack();
        if (nextPlaylist) {
            console.log("Auto-playing from playlist:", nextPlaylist.name);
            socket.emit("getSong", nextPlaylist.id, room);
        }
    }
    setTimeout(function () { isPlayEnding = false; }, 3000);
}

/* Check every 5 seconds for track ending */
setInterval(checkTrackEnd, 5000);

/* Re-render Up Next when track changes */
function onTrackChanged() {
    renderUpNext();
}

/* ===== POLL CURRENTLY PLAYING (for progress updates after skip etc.) ===== */
function pollCurrentlyPlaying() {
    spotifyFetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {}
    }).then(function (res) {
        if (!res || res.status === 204 || !res.ok) return null;
        return res.json();
    }).then(function (data) {
        if (data && data.item) {
            var prevTrackId = currentTrackId;
            updateNowPlaying(data);
            if (data.item.id !== prevTrackId) {
                loadRecommendations();
                onTrackChanged();
            }
        }
    }).catch(function () {});
}

/* Poll every 30s for progress sync */
setInterval(pollCurrentlyPlaying, 30000);

/* ===== ANNOUNCE (push-to-talk) ===== */
if (announceBtn) {
    announceBtn.addEventListener("mousedown", startRecording);
    announceBtn.addEventListener("mouseup", stopRecording);
    announceBtn.addEventListener("mouseleave", stopRecording);
    announceBtn.addEventListener("touchstart", function (e) {
        e.preventDefault();
        startRecording();
    });
    announceBtn.addEventListener("touchend", function (e) {
        e.preventDefault();
        stopRecording();
    });
}

function startRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") return;
    audioChunks = [];
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener("dataavailable", function (e) {
            audioChunks.push(e.data);
        });
        mediaRecorder.addEventListener("stop", function () {
            stream.getTracks().forEach(function (track) { track.stop(); });
            var audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            var reader = new FileReader();
            reader.onload = function () {
                socket.emit("announcement", room, reader.result, name);
                showAnnouncement(reader.result, "You");
            };
            reader.readAsArrayBuffer(audioBlob);
        });
        mediaRecorder.start();
        announceBtn.classList.add("recording");
        var micIcon = announceBtn.querySelector(".material-symbols-outlined");
        if (micIcon) micIcon.textContent = "radio_button_checked";
        var announceText = announceBtn.querySelector(".announce-text");
        if (announceText) announceText.textContent = "Recording...";
    }).catch(function () {
        addServerMessage("Microphone access denied.");
    });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
    if (announceBtn) {
        announceBtn.classList.remove("recording");
        var micIcon = announceBtn.querySelector(".material-symbols-outlined");
        if (micIcon) micIcon.textContent = "mic";
        var announceText = announceBtn.querySelector(".announce-text");
        if (announceText) announceText.textContent = "Announce";
    }
}

socket.on("play announcement", function (audioData, senderName) {
    showAnnouncement(audioData, senderName);
});

function showAnnouncement(audioData, senderName) {
    var ul = document.querySelector("#messages");
    if (!ul) return;
    var li = document.createElement("li");
    li.classList.add("announcement");

    var label = document.createElement("span");
    label.textContent = senderName + " announced:";
    li.appendChild(label);

    var audioBlob = new Blob([audioData], { type: "audio/webm" });
    var audioUrl = URL.createObjectURL(audioBlob);
    var audio = document.createElement("audio");
    audio.controls = true;
    audio.src = audioUrl;
    li.appendChild(audio);

    ul.appendChild(li);
    li.scrollIntoView();

    if (senderName !== "You") {
        audio.play().catch(function () {});
    }
}
