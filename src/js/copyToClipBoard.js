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
if (copyBtn) {
    copyBtn.addEventListener("click", copyCode)
}