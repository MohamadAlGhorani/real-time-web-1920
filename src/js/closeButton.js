const closeBtn = document.querySelector(".close")
const List = document.querySelector(".userList")
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
}