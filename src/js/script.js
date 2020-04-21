var randomColor = Math.floor(Math.random() * 16777215).toString(16);
const btns = document.querySelectorAll(".play-btn");
const copyBtn = document.querySelector(".copy")


function copyCode() {
    /* Get the text field */
    const copyText = document.querySelector(".id");

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /*For mobile devices*/

    /* Copy the text inside the text field */
    document.execCommand("copy");

    /* Alert the copied text */
    alert("Copied the party code: " + copyText.value);
}

copyBtn.addEventListener("click", copyCode)

var socket = io();
var form = document.querySelector("#form");
var id = document.querySelector(".id")
if (id) {
    var idValue = id.value;
    socket.emit("join party", idValue);
    console.log(idValue)
}

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