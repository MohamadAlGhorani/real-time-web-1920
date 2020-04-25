var randomColor = Math.floor(Math.random() * 16777215).toString(16);
const btns = document.querySelectorAll(".play-btn");

var socket = io();
var form = document.querySelector("#form");
var id = document.querySelector(".id")

if (id) {
    var idValue = id.value;
    socket.emit("join party", idValue);
    console.log(idValue)
}

// socket.on("getUserName", function () {
//     // const token = document.cookie.split(";").find(item => {
//     //     return item.includes("accessToken")
//     // }).split("=")[1].trim()
//     const userName = document.querySelector(".user-name").textContent
//     console.log(userName)
//     socket.emit("userName", userName)
// })

for (btn of btns) {
    btn.addEventListener("click", playSong)
}

function playSong(event) {
    console.log(event.target)
    const songId = event.target.dataset.id;
    console.log(songId)
    socket.emit("getSong", songId)
}
if (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault(); // prevents page reloading
        var input = document.querySelector("#m");
        var inputValue = input.value;
        socket.emit("chat message", inputValue, randomColor);
        input.value = "";
        return false;
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
socket.on("server message", function (msg) {
    var ul = document.querySelector("#messages");
    var li = document.createElement("li");
    li.textContent = msg;
    li.classList.add("server-message");
    ul.appendChild(li);
    li.scrollIntoView();
});

socket.on("getTokens", function (id) {
    const accessToken = document.cookie.split(";").find(item => {
        return item.includes("accessToken")
    }).split("=")[1].trim()
    socket.emit("playSong", {
        id,
        accessToken
    })
})

socket.on("online users", function (users, usersNumber) {
    console.log(users)
    console.log(usersNumber)
    var userList = document.querySelector(".userList ul")
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
})