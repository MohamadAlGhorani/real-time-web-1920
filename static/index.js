const closeBtn = document.querySelector(".close")
const List = document.querySelector(".userList")
let number = document.querySelector(".users-number")
const ChatForm = document.querySelector("#form")
const chatAria = document.querySelector(".chat-container")
if (closeBtn) {
    closeBtn.addEventListener("click", closeList)
}

function closeList() {
    if (closeBtn.textContent == "Guests") {
        closeBtn.textContent = "Close"
    } else if (closeBtn.textContent == "Close") {
        closeBtn.textContent = "Guests"
    }
    chatAria.classList.toggle("change-size")
    ChatForm.classList.toggle("change-size")
    List.classList.toggle("closed")
    closeBtn.classList.toggle("pik")
    number.classList.toggle("n-users")
}

const closePlaylistBtn = document.querySelector(".playlist-btn")
const playHeader = document.querySelector(".playlist-head")
const playfooter = document.querySelector(".playlist-footer")
const playlistContainer = document.querySelector(".tracks-container")

if (closePlaylistBtn) {
    closePlaylistBtn.addEventListener("click", closePlay)
}

function closePlay() {
    if (closePlaylistBtn.textContent == "Playlist") {
        closePlaylistBtn.textContent = "Close"
    } else if (closePlaylistBtn.textContent == "Close") {
        closePlaylistBtn.textContent = "Playlist"
    }
    playHeader.classList.toggle("playlist-mobile-header")
    playfooter.classList.toggle("playlist-mobile-footer")
    playlistContainer.classList.toggle("playlist-mobile-container")
}

let vh = window.innerHeight * 0.01;
// Then we set the value in the --vh custom property to the root of the document
document.documentElement.style.setProperty('--vh', `${vh}px`);

window.addEventListener('resize', () => {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});
const copyBtn = document.querySelector(".copy")


function copyCode() {
    /* Get the text field */
    const copyText = document.querySelector(".id");

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /*For mobile devices*/

    /* Copy the text inside the text field */
    document.execCommand("copy");
}
if (copyBtn) {
    copyBtn.addEventListener("click", copyCode)
}
/*  
  warning ugly code, still needs some cleaning ...

*/
var box = document.getElementById('lights');
if (box) {
    box.setAttribute('style', 'box-shadow: 0px 0px 0px 50px #6C6E47, 105px  0px 0px 50px #686B42, 210px  0px 0px 50px #6E7146, 315px  0px 0px 50px #6F7244, 420px  0px 0px 50px #67683A');

    var timer = setInterval(function () {
        chChange()
    }, 80);

    function chChange() {
        box.setAttribute('style', 'box-shadow: 0px 0px ' + getBlur() + 'px 50px ' + get_color() + ', 105px  0px ' + getBlur() + 'px 50px ' + get_color() + ', 210px  0px ' + getBlur() + 'px 50px ' + get_color() + ', 315px  0px ' + getBlur() + 'px 50px ' + get_color() + ', 420px  0px ' + getBlur() + 'px 50px ' + get_color());
    };

    function get_color() {
        pc = wheel(getBlur());
        var rgbColor = 'rgba(' + pc[0] + ',' + pc[1] + ',' + pc[2] + ',1)';
        return rgbColor;
    };
    var blur = 71,
        countUp = true;

    function getBlur() {
        if (70 >= blur || blur >= 250) {
            countUp = !countUp;
        }
        blur += (countUp) ? 1 : -1;
        return blur;
    };

    function wheel(WheelPos) {
        if (WheelPos < 85) {
            return [Math.round(WheelPos * 3), Math.round(255 - WheelPos * 3), 0];
        } else if (WheelPos < 170) {
            WheelPos -= 85;
            return [Math.round(255 - WheelPos * 3), 0, Math.round(WheelPos * 3)];
        } else {
            WheelPos -= 170;
            return [0, Math.round(WheelPos * 3), Math.round(255 - WheelPos * 3)];
        }
    }
}
/*  
  warning end of ugly code

*/
var randomColor = Math.floor(Math.random() * 16777215).toString(16);
const btns = document.querySelectorAll(".play-btn");
const volume = document.getElementById("volume")
const volumeLabel = document.querySelector("label.dj-volume")



var socket = io();
var form = document.querySelector("#form");

if (volume) {
    volume.addEventListener("change", function () {
        const accessToken = document.cookie.split(";").find(item => {
            return item.includes("accessToken")
        }).split("=")[1].trim()
        let value = volume.value;
        socket.emit("set volume", value, accessToken)
    })
}

for (btn of btns) {
    btn.addEventListener("click", playSong)
}

function playSong(event) {
    const songId = event.target.dataset.id;
    socket.emit("getSong", songId, room)
}
if (form) {
    socket.emit("join party", room, name);
    form.addEventListener("submit", function (e) {
        e.preventDefault(); // prevents page reloading
        var input = document.querySelector("#m");
        var inputValue = input.value;

        var ul = document.querySelector("#messages");
        var li = document.createElement("li");
        li.textContent = `You: ${inputValue}`;
        li.style.color = "#" + randomColor;
        li.style.backgroundColor = "#1A" + randomColor;
        ul.appendChild(li);
        li.scrollIntoView();

        socket.emit("chat message", inputValue, randomColor, room);
        input.value = "";
        return false;
    });

    socket.on("server message", function (msg) {
        var ul = document.querySelector("#messages");
        var li = document.createElement("li");
        li.textContent = msg;
        li.classList.add("server-message");
        ul.appendChild(li);
        li.scrollIntoView();
    });
    socket.on("get users", function () {
        const accessToken = document.cookie.split(";").find(item => {
            return item.includes("accessToken")
        }).split("=")[1].trim()
        socket.emit("users list", room, accessToken);
    });
}
socket.on("chat message", function (msg, ranColor) {
    var ul = document.querySelector("#messages");
    var li = document.createElement("li");
    li.textContent = msg;
    li.style.color = "#" + ranColor;
    li.style.backgroundColor = "#1A" + ranColor;
    ul.appendChild(li);
    li.scrollIntoView();
});

socket.on("getPosition", function () {
    const accessToken = document.cookie.split(";").find(item => {
        return item.includes("accessToken")
    }).split("=")[1].trim()
    socket.emit("setPosition", room, accessToken)
})

socket.on("getTokens", function (id) {
    const accessToken = document.cookie.split(";").find(item => {
        return item.includes("accessToken")
    }).split("=")[1].trim()
    socket.emit("playSong", {
        id,
        accessToken,
        room
    })
})

socket.on("host", function (id) {
    localStorage.setItem("rights", "host");
    for (btn of btns) {
        btn.classList.add("play-active")
    }
    volume.classList.add("play-active")
    volumeLabel.classList.add("play-active")
    const HostList = document.querySelector(".list-host");
    HostList.textContent = "Choose the DJ from the list by clicking on a user name."
    const usersInList = document.querySelectorAll(".userList ul li");
    for (user of usersInList) {
        user.classList.add("li-host")
    }
    const userList = document.querySelector(".users-container")
    userList.classList.add("users-container-host")
    let hostElement = document.querySelector(`[data-id='${id}']`)
    hostElement.classList.add('host')
})

socket.on("set host icon", function (id) {
    let hostElement = document.querySelector(`[data-id='${id}']`)
    hostElement.classList.add('host')
})

socket.on("who host", function (id) {
    let hostElement = document.querySelector(`[data-id='${id}']`)
    if (hostElement) {
        hostElement.classList.add('host')
    }
})

socket.on("who dj", function (id) {
    let djElement = document.querySelector(`[data-id='${id}']`)
    if (djElement) {
        djElement.classList.add('dj')
    }
})

socket.on("set dj", function () {
    for (btn of btns) {
        btn.classList.add("play-active")
    }
    volume.classList.add("play-active")
    volumeLabel.classList.add("play-active")
})

socket.on("get dj", function () {
    const usersInList = document.querySelectorAll(".userList ul li");
    for (user of usersInList) {
        user.addEventListener("click", setDj)
    }
})

socket.on("delete dj", function () {
    for (btn of btns) {
        btn.classList.remove("play-active")
    }
})

socket.on("online users", function (users, usersNumber) {
    var userList = document.querySelector(".userList ul")
    var NumOfUsers = document.querySelector(".users-number")
    NumOfUsers.textContent = usersNumber
    Array.from(userList.children).map(item => {
        item.remove()
    })
    users.map(user => {
        var li = document.createElement("li")
        li.textContent = user.userName
        li.setAttribute('data-id', user.id)
        userList.appendChild(li)
    })
    const accessToken = document.cookie.split(";").find(item => {
        return item.includes("accessToken")
    }).split("=")[1].trim()
    socket.emit("rights", room, accessToken)
})

socket.on("update dj", function (id) {
    const usersInList = document.querySelectorAll(".userList ul li");
    for (user of usersInList) {
        user.classList.remove("dj")
    }
    let djelement = document.querySelector(`[data-id='${id}']`)
    djelement.classList.add("dj")
})

socket.on("current playing", function (data) {
    const container = document.querySelector(".playlist-footer")
    Array.from(container.children).map(item => {
        item.remove();
    });
    const title = document.createElement("h4")
    title.textContent = "Current playing"
    const div = document.createElement("div")
    const img = document.createElement("img")
    img.src = data.item.album.images[0].url
    const p = document.createElement('p')
    p.textContent = data.item.name
    div.appendChild(img)
    div.appendChild(p)
    container.appendChild(title)
    container.appendChild(div)
})

function setDj(event) {
    const userId = event.target.dataset.id;
    const userName = event.target.textContent;
    socket.emit("dj", userId, room, userName)
}