const closeBtn = document.querySelector(".close")
const List = document.querySelector(".userList")

closeBtn.addEventListener("click", closeList)

function closeList() {
    if (closeBtn.textContent == "Close") {
        closeBtn.textContent = "Geusts"
    } else if (closeBtn.textContent == "Geusts") {
        closeBtn.textContent = "Close"
    }
    List.classList.toggle("closed")
    closeBtn.classList.toggle("pik")
}
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

copyBtn.addEventListener("click", copyCode)
/*  
  warning ugly code, still needs some cleaning ...

*/
var box = document.getElementById('lights');
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
/*  
  warning end of ugly code

*/
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