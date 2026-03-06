/* === Viewport height fix for mobile === */
var vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', vh + 'px');
window.addEventListener('resize', function () {
    vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
});

/* === Sidebar Tabs (desktop) === */
var sidebarTabs = document.querySelectorAll('.sidebar-tab');
var sidebarPanels = document.querySelectorAll('.sidebar-panel');

for (var i = 0; i < sidebarTabs.length; i++) {
    sidebarTabs[i].addEventListener('click', function () {
        var panelId = this.getAttribute('data-panel');
        for (var j = 0; j < sidebarTabs.length; j++) {
            sidebarTabs[j].classList.remove('active');
            sidebarTabs[j].setAttribute('aria-selected', 'false');
        }
        for (var k = 0; k < sidebarPanels.length; k++) {
            sidebarPanels[k].classList.remove('active');
        }
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');
        var panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');
    });
}

/* === Mobile Navigation === */
var mobileNavItems = document.querySelectorAll('.mobile-nav-item');
var mobilePanels = document.querySelectorAll('.mobile-panel');
var mainContent = document.querySelector('.main-content');

for (var m = 0; m < mobileNavItems.length; m++) {
    mobileNavItems[m].addEventListener('click', function () {
        var view = this.getAttribute('data-view');

        for (var n = 0; n < mobileNavItems.length; n++) {
            mobileNavItems[n].classList.remove('active');
            mobileNavItems[n].setAttribute('aria-selected', 'false');
        }
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');

        for (var p = 0; p < mobilePanels.length; p++) {
            mobilePanels[p].classList.remove('active');
        }

        if (view === 'chat') {
            if (mainContent) mainContent.style.display = 'flex';
        } else {
            if (mainContent) mainContent.style.display = 'none';
            var mobilePanel = document.getElementById('mobile-' + view);
            if (mobilePanel) mobilePanel.classList.add('active');
        }
    });
}

/* === Mobile Panel Close Buttons === */
var mobileCloseButtons = document.querySelectorAll('.mobile-close');
for (var c = 0; c < mobileCloseButtons.length; c++) {
    mobileCloseButtons[c].addEventListener('click', function () {
        var panelId = this.getAttribute('data-close');
        var panel = document.getElementById(panelId);
        if (panel) panel.classList.remove('active');
        if (mainContent) mainContent.style.display = 'flex';
        for (var n = 0; n < mobileNavItems.length; n++) {
            mobileNavItems[n].classList.remove('active');
            mobileNavItems[n].setAttribute('aria-selected', 'false');
        }
        var chatNav = document.querySelector('.mobile-nav-item[data-view="chat"]');
        if (chatNav) {
            chatNav.classList.add('active');
            chatNav.setAttribute('aria-selected', 'true');
        }
    });
}
