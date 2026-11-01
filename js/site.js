(function () {
    "use strict";

    /* Mobile menu */
    var btn = document.querySelector(".menu-btn");
    var menu = document.getElementById("menu");
    function setMenu(open) {
        menu.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        btn.textContent = open ? "Close" : "Menu";
    }
    btn.addEventListener("click", function () { setMenu(!menu.classList.contains("is-open")); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

    /* Mark the current section in the menu */
    if ("IntersectionObserver" in window) {
        var links = {};
        menu.querySelectorAll("a").forEach(function (a) { links[a.hash.slice(1)] = a; });
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                Object.keys(links).forEach(function (id) {
                    if (id === en.target.id) links[id].setAttribute("aria-current", "true");
                    else links[id].removeAttribute("aria-current");
                });
            });
        }, { rootMargin: "-40% 0px -55% 0px" });
        document.querySelectorAll("main .sec[id]").forEach(function (s) { spy.observe(s); });
    }

    /* Project filter */
    var buttons = document.querySelectorAll(".filter button");
    var projects = document.querySelectorAll(".proj");
    buttons.forEach(function (b) {
        b.addEventListener("click", function () {
            var f = b.getAttribute("data-filter");
            buttons.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
            projects.forEach(function (p) { p.hidden = !(f === "all" || p.getAttribute("data-cat") === f); });
        });
    });
})();
