/* Countries — interactive 3D globe with arcs from Abu Dhabi.
   Lazy: nothing loads until the section is near the viewport. */
import * as THREE from "three";

const HS = window.HS || { motion: false };
const section = document.getElementById("countries");
const host = document.querySelector(".globe__canvas");
const tip = document.querySelector(".globe__tip");
const buttons = Array.from(document.querySelectorAll(".clist button"));

const PLACES = {
    ae: { name: "Abu Dhabi, UAE", lat: 24.45, lon: 54.38 },
    ye: { name: "Yemen", lat: 15.37, lon: 44.19 },
    so: { name: "Somaliland", lat: 10.44, lon: 45.01 },
    jo: { name: "Jordan", lat: 31.95, lon: 35.93 },
    km: { name: "Comoros", lat: -11.7, lon: 43.26 },
    et: { name: "Ethiopia", lat: 9.03, lon: 38.74 },
    ca: { name: "Canada", lat: 45.42, lon: -75.7 },
    dj: { name: "Djibouti", lat: 11.59, lon: 43.15 },
};
const R = 5;
const ACCENT = 0xe0703a, LINE = 0xede9e2, BG = 0x0b0d10;

function vec(lat, lon, r = R) {
    const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lon);
    return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
}

function loadScript(src) {
    return new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = src; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
    });
}

async function landLines() {
    await loadScript("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js");
    const topo = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then((r) => r.json());
    const borders = window.topojson.mesh(topo, topo.objects.countries);
    const pts = [];
    for (const line of borders.coordinates) {
        for (let i = 0; i < line.length - 1; i++) {
            const a = vec(line[i][1], line[i][0], R * 1.002), b = vec(line[i + 1][1], line[i + 1][0], R * 1.002);
            pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
    }
    return pts;
}

async function start() {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(BG, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 21);

    const globe = new THREE.Group();
    scene.add(globe);

    /* Occluding sphere so back-side lines are hidden */
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x0f1217 })));

    /* Rim glow (fresnel) */
    const rim = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.04, 64, 48),
        new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, side: THREE.BackSide,
            uniforms: { c: { value: new THREE.Color(ACCENT) } },
            vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
            fragmentShader: "uniform vec3 c; varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(c, clamp(i,0.0,1.0)*0.55); }",
        })
    );
    scene.add(rim);

    /* Graticule */
    {
        const pts = [];
        for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 4) { const a = vec(lat, lon, R * 1.001), b = vec(lat, lon + 4, R * 1.001); pts.push(a.x, a.y, a.z, b.x, b.y, b.z); }
        for (let lon = -180; lon < 180; lon += 30) for (let lat = -88; lat < 88; lat += 4) { const a = vec(lat, lon, R * 1.001), b = vec(lat + 4, lon, R * 1.001); pts.push(a.x, a.y, a.z, b.x, b.y, b.z); }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        globe.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.07 })));
    }

    /* Country borders (real data) */
    landLines().then((pts) => {
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        globe.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.42 })));
        if (!running) draw();
    }).catch(() => {});

    /* Pins + arcs */
    const pins = {};
    const pinGeo = new THREE.SphereGeometry(0.075, 16, 12);
    const ringGeo = new THREE.RingGeometry(0.12, 0.16, 40);
    const hitGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const hits = [];
    const origin = vec(PLACES.ae.lat, PLACES.ae.lon);
    const arcs = [];
    for (const [id, p] of Object.entries(PLACES)) {
        const pos = vec(p.lat, p.lon, R * 1.004);
        const pin = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: id === "ae" ? LINE : ACCENT }));
        pin.position.copy(pos);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
        ring.position.copy(pos); ring.lookAt(pos.clone().multiplyScalar(2));
        const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.copy(pos); hit.userData.id = id;
        globe.add(pin, ring, hit);
        hits.push(hit);
        pins[id] = { pin, ring, pos, phase: Math.random() * Math.PI * 2 };

        if (id === "ae") continue;
        const end = vec(p.lat, p.lon);
        const angle = origin.angleTo(end);
        const pts = [];
        const n = 64;
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const v = new THREE.Vector3().copy(origin).normalize().lerp(end.clone().normalize(), t).normalize();
            v.multiplyScalar(R * (1.005 + Math.sin(Math.PI * t) * (0.06 + angle * 0.32)));
            pts.push(v);
        }
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        g.setDrawRange(0, 0);
        const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 }));
        globe.add(line);
        arcs.push({ line, n: n + 1, id });
    }

    /* Orientation */
    const rot = { x: 0, y: 0 };
    let auto = HS.motion, idleUntil = 0, active = null;
    function faceRotation(id) {
        const p = PLACES[id];
        let ty = -THREE.MathUtils.degToRad(p.lon);
        const tx = THREE.MathUtils.degToRad(p.lat) * 0.85;
        while (ty - rot.y > Math.PI) ty -= Math.PI * 2;
        while (ty - rot.y < -Math.PI) ty += Math.PI * 2;
        return { x: tx, y: ty };
    }
    function focus(id, fromList) {
        active = id;
        buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.country === id));
        const target = faceRotation(id);
        idleUntil = performance.now() + 5000;
        if (HS.motion && window.gsap) gsap.to(rot, { x: target.x, y: target.y, duration: 1.4, ease: "expo.out", onUpdate: () => { if (!running) draw(); } });
        else { rot.x = target.x; rot.y = target.y; draw(); }
        tip.textContent = PLACES[id].name;
    }
    buttons.forEach((b) => {
        const id = b.dataset.country;
        b.addEventListener("click", () => focus(id, true));
        b.addEventListener("focus", () => focus(id, true));
        if (matchMedia("(hover: hover)").matches) b.addEventListener("pointerenter", () => focus(id, true));
    });

    /* Drag to rotate, hover pins */
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let drag = null;
    const el = renderer.domElement;
    el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y }; el.setPointerCapture(e.pointerId); if (window.gsap) gsap.killTweensOf(rot); });
    el.addEventListener("pointermove", (e) => {
        if (drag) {
            rot.y = drag.ry + (e.clientX - drag.x) * 0.006;
            rot.x = THREE.MathUtils.clamp(drag.rx + (e.clientY - drag.y) * 0.004, -1, 1);
            idleUntil = performance.now() + 4000;
            if (!running) draw();
            return;
        }
        const r = el.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(hits)[0];
        if (hit && hit.object.userData.id !== active) focus(hit.object.userData.id);
    });
    el.addEventListener("pointerup", () => { drag = null; });

    /* Size */
    function resize() {
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    new ResizeObserver(() => { resize(); if (!running) draw(); }).observe(host);
    resize();

    /* Arcs draw in once */
    const arcState = { t: HS.motion ? 0 : 1 };
    if (HS.motion && window.gsap) gsap.to(arcState, { t: 1, duration: 2.4, ease: "power2.inOut", delay: 0.3 });

    const tmp = new THREE.Vector3();
    let last = performance.now();
    function draw(now = performance.now()) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (auto && !drag && now > idleUntil) rot.y += dt * 0.12;
        globe.rotation.set(rot.x, rot.y, 0);

        arcs.forEach((a, i) => {
            const local = THREE.MathUtils.clamp(arcState.t * 1.6 - i * 0.08, 0, 1);
            a.line.geometry.setDrawRange(0, Math.floor(local * a.n));
            a.line.material.opacity = active && a.id === active ? 1 : 0.55;
        });
        for (const [id, p] of Object.entries(pins)) {
            const s = 1 + ((Math.sin(now / 600 + p.phase) + 1) / 2) * (id === active ? 1.6 : 0.6);
            p.ring.scale.setScalar(HS.motion ? s : 1);
            p.ring.material.opacity = id === active ? 0.95 : 0.45;
        }

        /* tooltip follows the active pin, hidden when it is behind the globe */
        if (active) {
            tmp.copy(pins[active].pos).applyMatrix4(globe.matrixWorld);
            const facing = tmp.clone().normalize().dot(camera.position.clone().normalize()) > 0.15;
            tmp.project(camera);
            tip.style.left = ((tmp.x + 1) / 2) * host.clientWidth + "px";
            tip.style.top = ((1 - tmp.y) / 2) * host.clientHeight + "px";
            tip.classList.toggle("is-on", facing);
        }
        renderer.render(scene, camera);
    }

    let running = false, raf = 0, inView = false;
    function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
    function update() {
        const should = HS.motion && inView && !document.hidden;
        if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
        if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    new IntersectionObserver((e) => { inView = e[0].isIntersecting; update(); }).observe(host);
    document.addEventListener("visibilitychange", update);

    focus("ae");
    rot.x = faceRotation("ae").x; rot.y = faceRotation("ae").y - 0.6;
    draw();
}

if (section && host) {
    const io = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { io.disconnect(); start(); }
    }, { rootMargin: "600px 0px" });
    io.observe(section);
}
