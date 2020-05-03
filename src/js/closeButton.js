const closeBtn = document.querySelector(".close")
const List = document.querySelector(".userList")
let number = document.querySelector(".users-number")
const ChatForm = document.querySelector("#form")
const chatAria = document.querySelector(".chat-container")
if (closeBtn) {
    closeBtn.addEventListener("click", closeList)
}

function closeList() {
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