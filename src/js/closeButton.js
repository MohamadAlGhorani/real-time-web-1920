const closeBtn = document.querySelector(".close")
const List = document.querySelector(".userList")
let number = document.querySelector(".users-number")
if (closeBtn) {
    closeBtn.addEventListener("click", closeList)
}

function closeList() {
    if (closeBtn.textContent == "Close") {
        closeBtn.textContent = "Geusts"
    } else if (closeBtn.textContent == "Geusts") {
        closeBtn.textContent = "Close"
    }
    List.classList.toggle("closed")
    closeBtn.classList.toggle("pik")
    number.classList.toggle("n-users")
}