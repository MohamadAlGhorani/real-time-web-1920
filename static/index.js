var randomColor = Math.floor(Math.random() * 16777215).toString(16);
(function () {
    var socket = io();
    var form = document.querySelector("#form");
    var id = document.querySelector(".id")
    if (id) {
        var idValue = id.textContent;
        socket.emit("join party", idValue);
        console.log(idValue)
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
})();