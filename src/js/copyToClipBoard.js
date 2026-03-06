var copyBtn = document.querySelector(".copy-btn");

function copyCode() {
    var copyText = document.querySelector(".id");
    if (!copyText) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(copyText.value);
    } else {
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        document.execCommand("copy");
    }
    var icon = copyBtn.querySelector('.material-symbols-outlined');
    if (icon) {
        icon.textContent = 'check';
        setTimeout(function () { icon.textContent = 'content_copy'; }, 1500);
    }
}

if (copyBtn) {
    copyBtn.addEventListener("click", copyCode);
}
