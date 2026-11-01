/* Motion + interaction layer. 3D lives in hero3d.js and globe.js (ES modules). */
(function () {
    "use strict";

    var root = document.documentElement;
    var HS = (window.HS = window.HS || {});
    HS.hero = { progress: 0, intro: 0 };

    var hasGSAP = !!(window.gsap && window.ScrollTrigger);
    if (!hasGSAP && root.classList.contains("motion-on")) {
        /* CDN failed: fall back to a static page rather than hidden content */
        root.classList.replace("motion-on", "motion-off");
        root.classList.remove("is-loading");
    }
    var motion = root.classList.contains("motion-on");
    var lite = root.classList.contains("motion-lite");
    HS.motion = motion;
    HS.lite = lite;

    /* ---------- Motion toggle (persists, reloads to apply cleanly) ---------- */
    var toggle = document.querySelector(".motion-toggle");
    toggle.setAttribute("aria-pressed", String(motion));
    toggle.querySelector(".motion-toggle__label").textContent = motion ? "Motion on" : "Motion off";
    toggle.setAttribute("aria-label", motion ? "Turn motion off" : "Turn motion on");
    toggle.addEventListener("click", function () {
        try { localStorage.setItem("motion", motion ? "off" : "on"); } catch (e) {}
        location.reload();
    });

    /* ---------- Mobile menu ---------- */
    var menuBtn = document.querySelector(".menu-btn");
    var menu = document.getElementById("menu");
    function setMenu(open) {
        menu.classList.toggle("is-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.querySelector(".sr-only").textContent = open ? "Close menu" : "Open menu";
        if (HS.lenis) open ? HS.lenis.stop() : HS.lenis.start();
    }
    menuBtn.addEventListener("click", function () { setMenu(!menu.classList.contains("is-open")); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false); });

    /* ---------- Smooth anchor links ---------- */
    document.addEventListener("click", function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a || a.getAttribute("href").length < 2) return;
        var target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        if (HS.lenis) HS.lenis.scrollTo(target, { offset: 0, duration: 1.6 });
        else target.scrollIntoView({ behavior: motion ? "smooth" : "auto" });
        history.replaceState(null, "", a.getAttribute("href"));
    });

    /* ---------- Projects: filter, detail dialog ---------- */
    var projects = Array.prototype.slice.call(document.querySelectorAll(".p"));
    var filterBtns = document.querySelectorAll(".filter button");
    filterBtns.forEach(function (b) {
        b.addEventListener("click", function () {
            var f = b.dataset.filter;
            filterBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
            var shown = [];
            projects.forEach(function (p) {
                var on = f === "all" || p.dataset.cat === f;
                p.classList.toggle("is-hidden", !on);
                if (on) shown.push(p);
            });
            if (motion) gsap.fromTo(shown, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .6, stagger: .05, ease: "power3.out" });
            if (hasGSAP) ScrollTrigger.refresh();
        });
    });

    var dialog = document.querySelector(".detail");
    var tpl = document.getElementById("project-data").content;
    var current = null;
    function openProject(id) {
        var art = tpl.querySelector('article[data-id="' + id + '"]');
        if (!art) return;
        current = id;
        dialog.querySelector(".detail__fig img").src = "images/projects/" + art.dataset.img + ".svg";
        var body = dialog.querySelector(".detail__body");
        body.innerHTML = art.innerHTML;
        body.querySelector("h3").id = "detail-title";
        if (!dialog.open) {
            dialog.showModal();
            if (HS.lenis) HS.lenis.stop();
        }
        dialog.scrollTop = 0;
    }
    function step(dir) {
        var visible = projects.filter(function (p) { return !p.classList.contains("is-hidden"); });
        var i = visible.findIndex(function (p) { return p.dataset.id === current; });
        var next = visible[(i + dir + visible.length) % visible.length];
        openProject(next.dataset.id);
    }
    projects.forEach(function (p) { p.querySelector(".p__btn").addEventListener("click", function () { openProject(p.dataset.id); }); });
    dialog.querySelector(".detail__close").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector(".detail__prev").addEventListener("click", function () { step(-1); });
    dialog.querySelector(".detail__next").addEventListener("click", function () { step(1); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () {
        if (HS.lenis) HS.lenis.start();
        var btn = document.querySelector('.p[data-id="' + current + '"] .p__btn');
        if (btn) btn.focus();
    });

    /* ---------- Active section in nav ---------- */
    var links = {};
    menu.querySelectorAll("a").forEach(function (a) { links[a.hash.slice(1)] = a; });
    if ("IntersectionObserver" in window) {
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                Object.keys(links).forEach(function (id) {
                    if (id === en.target.id) links[id].setAttribute("aria-current", "true");
                    else links[id].removeAttribute("aria-current");
                });
            });
        }, { rootMargin: "-45% 0px -50% 0px" });
        document.querySelectorAll("main section[id]").forEach(function (s) { spy.observe(s); });
    }

    /* ---------- Nav: solid after hero top, hide on scroll down ---------- */
    var nav = document.querySelector(".nav");
    var lastY = 0;
    function onScroll(y) {
        nav.classList.toggle("is-solid", y > window.innerHeight * 0.6);
        var down = y > lastY && y > 300 && !menu.classList.contains("is-open");
        nav.classList.toggle("is-hidden", down);
        lastY = y;
    }

    if (!motion) {
        HS.hero.intro = 1;
        HS.hero.progress = 1;
        window.addEventListener("scroll", function () { onScroll(window.scrollY); }, { passive: true });
        return;
    }

    /* =================================================================
       Everything below runs only with motion on
       ================================================================= */
    gsap.registerPlugin(ScrollTrigger);
    var EASE = "expo.out";

    /* ---------- Lenis smooth scroll, driven by GSAP's ticker ---------- */
    if (window.Lenis && !lite) {
        var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
        HS.lenis = lenis;
        lenis.on("scroll", function (e) { ScrollTrigger.update(); onScroll(e.scroll); });
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
    } else {
        window.addEventListener("scroll", function () { onScroll(window.scrollY); }, { passive: true });
    }

    /* ---------- Split hero name into characters ---------- */
    document.querySelectorAll(".hero__name .split").forEach(function (line) {
        var text = line.textContent;
        line.textContent = "";
        text.split("").forEach(function (ch) {
            var s = document.createElement("span");
            s.className = "char";
            s.textContent = ch === " " ? " " : ch;
            line.appendChild(s);
        });
    });
    var chars = document.querySelectorAll(".hero__name .char");
    gsap.set(chars, { yPercent: 110 });
    gsap.set(".hero__role .mask > span", { yPercent: 110 });
    gsap.set([".hero__lead", ".hero__cue", ".hero__meta", ".stages"], { opacity: 0 });

    /* ---------- Intro sequence ---------- */
    function heroIn() {
        var tl = gsap.timeline({ defaults: { ease: EASE } });
        tl.to(HS.hero, { intro: 1, duration: 2.6, ease: "power2.inOut" }, 0)
          .to(chars, { yPercent: 0, duration: 1.4, stagger: 0.035 }, 0.15)
          .to(".hero__role .mask > span", { yPercent: 0, duration: 1.1 }, 0.35)
          .to([".hero__meta", ".stages"], { opacity: 1, duration: 1 }, 0.6)
          .to([".hero__lead", ".hero__cue"], { opacity: 1, duration: 1.2, stagger: 0.1 }, 0.7);
    }

    if (root.classList.contains("is-loading")) {
        if (HS.lenis) HS.lenis.stop();
        var count = { v: 0 };
        var countEl = document.querySelector(".loader__count");
        var paths = document.querySelectorAll(".loader__mark path");
        var lt = gsap.timeline({
            onComplete: function () {
                root.classList.remove("is-loading");
                try { sessionStorage.setItem("intro", "1"); } catch (e) {}
                if (HS.lenis) HS.lenis.start();
                ScrollTrigger.refresh();
            }
        });
        lt.to(paths, { strokeDashoffset: 0, duration: 1.1, stagger: 0.08, ease: "power2.inOut" }, 0)
          .to(count, { v: 100, duration: 1.3, ease: "power2.inOut", onUpdate: function () { countEl.textContent = Math.round(count.v); } }, 0)
          .to(".loader__mark", { fill: "#F2EEE6", duration: 0.35 }, 1.05)
          .to(".loader", { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, 1.45)
          .add(heroIn, 1.75);
    } else {
        heroIn();
    }

    /* ---------- Hero scroll: drawing → building ---------- */
    var stages = document.querySelectorAll(".stage");
    ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: function (self) {
            HS.hero.progress = self.progress;
            var idx = Math.min(stages.length - 1, Math.floor(self.progress * stages.length * 0.999));
            stages.forEach(function (s, i) { s.classList.toggle("is-active", i === idx); });
        }
    });
    gsap.to(".hero__content", {
        yPercent: -18, opacity: 0, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "22% top", scrub: true }
    });

    /* ---------- Numbers ---------- */
    document.querySelectorAll("[data-count]").forEach(function (el) {
        var end = parseInt(el.dataset.count, 10);
        var o = { v: 0 };
        el.textContent = "0";
        ScrollTrigger.create({
            trigger: el, start: "top 85%", once: true,
            onEnter: function () {
                gsap.to(o, { v: end, duration: 2, ease: "power3.out", onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString("en-US"); } });
            }
        });
    });
    gsap.from(".num", { y: 60, opacity: 0, duration: 1.2, stagger: 0.08, ease: EASE, scrollTrigger: { trigger: ".numbers", start: "top 85%" } });

    /* ---------- Profile statement: words light up as you read ---------- */
    var st = document.querySelector(".scrub-words");
    var words = st.textContent.trim().split(/\s+/);
    st.innerHTML = words.map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" ");
    gsap.to(".scrub-words .w", {
        opacity: 1, stagger: 0.1, ease: "none",
        scrollTrigger: { trigger: st, start: "top 85%", end: "bottom 55%", scrub: true }
    });

    /* ---------- Generic reveals ---------- */
    ScrollTrigger.batch(".reveal", {
        start: "top 88%",
        onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: EASE, overwrite: true }); }
    });
    gsap.from(".xp", { y: 30, opacity: 0, duration: 0.9, stagger: 0.05, ease: EASE, scrollTrigger: { trigger: ".expertise", start: "top 85%" } });
    gsap.from(".p", { y: 40, opacity: 0, duration: 1, stagger: 0.05, ease: EASE, scrollTrigger: { trigger: ".plist", start: "top 85%" } });
    gsap.from(".clist li", { x: 40, opacity: 0, duration: 1, stagger: 0.06, ease: EASE, scrollTrigger: { trigger: ".clist", start: "top 85%" } });
    gsap.from(".lang__bar i", { scaleX: 0, duration: 1.6, stagger: 0.15, ease: "power3.inOut", scrollTrigger: { trigger: ".creds", start: "top 75%" } });
    document.querySelectorAll(".sec__head").forEach(function (h) {
        gsap.from(h, { opacity: 0, y: 20, duration: 1, ease: EASE, scrollTrigger: { trigger: h, start: "top 90%" } });
    });

    /* Contact title: line masks */
    gsap.set(".contact__title .mask > span", { yPercent: 110 });
    gsap.to(".contact__title .mask > span", { yPercent: 0, duration: 1.3, stagger: 0.1, ease: EASE, scrollTrigger: { trigger: ".contact__title", start: "top 85%" } });

    /* ---------- Profile portrait: parallax + 3D tilt ---------- */
    gsap.fromTo(".profile__frame img", { yPercent: 8 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".profile__frame", start: "top bottom", end: "bottom top", scrub: true } });
    var frame = document.querySelector(".tilt");
    if (frame && matchMedia("(hover: hover)").matches) {
        gsap.set(frame, { transformPerspective: 900 });
        var rx = gsap.quickTo(frame, "rotationX", { duration: 0.6, ease: "power3.out" });
        var ry = gsap.quickTo(frame, "rotationY", { duration: 0.6, ease: "power3.out" });
        frame.addEventListener("pointermove", function (e) {
            var r = frame.getBoundingClientRect();
            ry(((e.clientX - r.left) / r.width - 0.5) * 16);
            rx(-((e.clientY - r.top) / r.height - 0.5) * 16);
        });
        frame.addEventListener("pointerleave", function () { rx(0); ry(0); });
    }

    /* ---------- Experience: horizontal scroll on desktop ---------- */
    document.querySelectorAll(".tl__item").forEach(function (it) {
        var m = it.querySelector(".tl__date").textContent.match(/\d{4}/);
        if (m) it.setAttribute("data-year", m[0]);
    });
    ScrollTrigger.matchMedia({
        "(min-width: 1024px)": function () {
            var track = document.querySelector(".tl");
            var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
            var tween = gsap.to(track, {
                x: function () { return -dist(); }, ease: "none",
                scrollTrigger: { trigger: ".experience__pin", start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true }
            });
            gsap.to(".experience__bar span", { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".experience__pin", start: "top top", end: function () { return "+=" + dist(); }, scrub: true } });
            gsap.from(".tl__item", { opacity: 0, y: 50, duration: 1.1, stagger: 0.07, ease: EASE, scrollTrigger: { trigger: ".experience", start: "top 70%" } });
        },
        "(max-width: 1023px)": function () {
            gsap.utils.toArray(".tl__item").forEach(function (item) {
                gsap.from(item, { opacity: 0, x: -30, duration: 1, ease: EASE, scrollTrigger: { trigger: item, start: "top 88%" } });
            });
        }
    });

    /* ---------- Project drawing that follows the cursor ---------- */
    var peek = document.querySelector(".peek");
    var peekImg = peek.querySelector("img");
    if (matchMedia("(hover: hover) and (min-width: 900px)").matches) {
        var px = gsap.quickTo(peek, "x", { duration: 0.7, ease: "power3.out" });
        var py = gsap.quickTo(peek, "y", { duration: 0.7, ease: "power3.out" });
        var prot = gsap.quickTo(peek, "rotation", { duration: 0.9, ease: "power3.out" });
        var lastX = 0;
        gsap.set(peek, { xPercent: -50, yPercent: -50 });
        var plist = document.querySelector(".plist");
        plist.addEventListener("pointermove", function (e) {
            px(e.clientX + 40); py(e.clientY); prot(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4)); lastX = e.clientX;
        });
        projects.forEach(function (p) {
            p.addEventListener("pointerenter", function () {
                var art = tpl.querySelector('article[data-id="' + p.dataset.id + '"]');
                peekImg.src = "images/projects/" + art.dataset.img + ".svg";
                peek.classList.add("is-on");
            });
        });
        plist.addEventListener("pointerleave", function () { peek.classList.remove("is-on"); });
    }

    /* ---------- Custom cursor ---------- */
    if (!lite && matchMedia("(hover: hover) and (pointer: fine)").matches) {
        var cur = document.querySelector(".cursor");
        var dot = cur.querySelector(".cursor__dot"), ring = cur.querySelector(".cursor__ring");
        var dx = gsap.quickTo(dot, "x", { duration: 0.1 }), dy = gsap.quickTo(dot, "y", { duration: 0.1 });
        var rxq = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" }), ryq = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });
        window.addEventListener("pointermove", function (e) { dx(e.clientX); dy(e.clientY); rxq(e.clientX); ryq(e.clientY); });
        document.addEventListener("pointerover", function (e) {
            var t = e.target.closest("a, button, [data-cursor]");
            cur.classList.toggle("is-hover", !!t && t.dataset.cursor !== "view");
            cur.classList.toggle("is-view", !!t && t.dataset.cursor === "view");
        });
        document.addEventListener("pointerleave", function () { gsap.to(cur, { opacity: 0, duration: 0.2 }); });
        document.addEventListener("pointerenter", function () { gsap.to(cur, { opacity: 1, duration: 0.2 }); });
    }

    /* Re-measure after fonts and images settle */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
