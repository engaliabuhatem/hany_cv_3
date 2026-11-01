(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var root = document.documentElement;

    /* Mobile menu */
    var toggle = document.querySelector(".nav__toggle");
    var links = document.getElementById("nav-links");
    function closeMenu() {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

    /* Navbar hides on scroll down, shows on scroll up */
    var nav = document.getElementById("nav");
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
        var y = window.scrollY;
        var hide = y > lastY && y > 200 && !links.classList.contains("is-open");
        nav.classList.toggle("is-hidden", hide);
        lastY = y;
    }, { passive: true });

    if (!("IntersectionObserver" in window)) return;

    /* Active section in the nav */
    var navLinks = {};
    links.querySelectorAll('a[href^="#"]').forEach(function (a) { navLinks[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            Object.keys(navLinks).forEach(function (id) { navLinks[id].classList.toggle("is-active", id === entry.target.id); });
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { spy.observe(s); });

    /* Reveal on scroll */
    root.classList.add("reveal-ready");
    var revealTargets = document.querySelectorAll(".reveal, .country");
    var revealer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
            el.style.transitionDelay = reduceMotion ? "0ms" : Math.min(siblings, 6) * 70 + "ms";
            el.classList.add("is-in");
            revealer.unobserve(el);
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealTargets.forEach(function (el) { revealer.observe(el); });

    /* Animated counters (once, when 40% visible) */
    function format(n) { return Math.round(n).toLocaleString("en-US"); }
    var counter = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            counter.unobserve(el);
            var target = parseFloat(el.getAttribute("data-count"));
            var prefix = el.getAttribute("data-prefix") || "";
            var suffix = el.getAttribute("data-suffix") || "";
            if (reduceMotion) { el.textContent = prefix + format(target) + suffix; return; }
            var start = performance.now();
            var duration = 1600;
            (function tick(now) {
                var t = Math.min((now - start) / duration, 1);
                var eased = 1 - Math.pow(1 - t, 3);
                el.textContent = prefix + format(target * eased) + suffix;
                if (t < 1) requestAnimationFrame(tick);
            })(start);
        });
    }, { threshold: 0.4 });
    document.querySelectorAll("[data-count]").forEach(function (el) { counter.observe(el); });

    /* Project filters */
    var chips = document.querySelectorAll(".chip");
    var projects = document.querySelectorAll(".project");
    chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            var filter = chip.getAttribute("data-filter");
            chips.forEach(function (c) {
                var on = c === chip;
                c.classList.toggle("is-active", on);
                c.setAttribute("aria-pressed", String(on));
            });
            projects.forEach(function (p) {
                var show = filter === "all" || p.getAttribute("data-cat") === filter;
                p.classList.toggle("is-hidden", !show);
                if (show) p.classList.add("is-in");
            });
        });
    });

    /* Subtle tilt on the portrait (pointer devices only) */
    var frame = document.querySelector(".frame");
    if (frame && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
        frame.addEventListener("pointermove", function (e) {
            var r = frame.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width - 0.5;
            var y = (e.clientY - r.top) / r.height - 0.5;
            frame.style.transform = "perspective(900px) rotateY(" + (x * 8).toFixed(2) + "deg) rotateX(" + (-y * 8).toFixed(2) + "deg)";
        });
        frame.addEventListener("pointerleave", function () { frame.style.transform = ""; });
    }
})();
