const closeBtn = document.querySelector(".close")
const List = document.querySelector(".userList")
let number = document.querySelector(".users-number")
const ChatForm = document.querySelector("#form")
const chatAria = document.querySelector(".chat-container")
if (closeBtn) {
    closeBtn.addEventListener("click", closeList)
}

function closeList() {
    if (closeBtn.textContent == "Close") {
        closeBtn.textContent = "Geusts"
    } else if (closeBtn.textContent == "Geusts") {
        closeBtn.textContent = "Close"
    }
    chatAria.classList.toggle("change-size")
    ChatForm.classList.toggle("change-size")
    List.classList.toggle("closed")
    closeBtn.classList.toggle("pik")
    number.classList.toggle("n-users")
}