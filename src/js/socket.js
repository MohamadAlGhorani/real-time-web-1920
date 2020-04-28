var randomColor = Math.floor(Math.random() * 16777215).toString(16);
const btns = document.querySelectorAll(".play-btn");




var socket = io();
var form = document.querySelector("#form");

// console.log(room, name)

for (btn of btns) {
    btn.addEventListener("click", playSong)
}

function playSong(event) {
    // console.log(event.target)
    const songId = event.target.dataset.id;
    // console.log(songId)
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
        socket.emit("users list", room);
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

socket.on("host", function () {
    localStorage.setItem("rights", "host");
    for (btn of btns) {
        btn.classList.add("play-active")
    }
    const HostList = document.querySelector(".list-host");
    HostList.textContent = "Choose the DJ from the list by clicking on a user name."
    const usersInList = document.querySelectorAll(".userList ul li");
    for (user of usersInList) {
        user.classList.add("li-host")
    }
})

socket.on("set dj", function () {
    for (btn of btns) {
        btn.classList.add("play-active")
    }
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
    console.log("hiii", users)
    console.log(usersNumber)
    var userList = document.querySelector(".userList ul")
    var NumOfUsers = document.querySelector(".users-number")
    NumOfUsers.textContent = usersNumber
    console.dir(userList)
    Array.from(userList.children).map(item => {
        item.remove()
    })
    users.map(user => {
        console.log(user)
        var li = document.createElement("li")
        li.textContent = user.userName
        li.setAttribute('data-id', user.id)
        userList.appendChild(li)
    })
    // const usersInList = document.querySelectorAll(".userList ul li");
    // if (usersInList && localStorage.getItem("rights")) {
    //     for (user of usersInList) {
    //         user.addEventListener("click", function () {
    //             user.classList.remove("dj")
    //             this.classList.add("dj")
    //             socket.emit("setDj")
    //         })
    //     }
    // }
})

socket.on("update dj", function (id) {
    const usersInList = document.querySelectorAll(".userList ul li");
    for (user of usersInList) {
        user.classList.remove("dj")
    }
    let djelement = document.querySelector(`[data-id='${id}']`)
    djelement.classList.add("dj")
})

function setDj(event) {
    console.log(event.target)
    const userId = event.target.dataset.id;
    console.log(userId)
    socket.emit("dj", userId, room)
}