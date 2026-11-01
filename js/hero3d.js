/* Hero — "From drawing to building".
   A hospital campus (7 buildings, like the Sana'a University teaching hospital)
   inside a city grid. Intro: footprints are drawn, wireframes rise.
   Scroll: design review scan → construction (volumes fill in) → delivery. */
import * as THREE from "./vendor/three.module.min.js";

const HS = window.HS || { hero: { progress: 1, intro: 1 }, motion: false };
const host = document.querySelector(".hero__canvas");
const section = document.querySelector(".hero");

const COLORS = {
    bg: 0x0a1322,
    line: 0xf2eee6,
    accent: 0xc9a45c,
    solid: 0x7d889a,
    solidHospital: 0xf4efe6,
    ink: 0x1b2433,
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const range = (v, a, b) => clamp((v - a) / (b - a));

function rng(seed) {
    return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function start() {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (e) {
        return; // keep the SVG fallback
    }
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || matchMedia("(max-width: 700px)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 1.75));
    renderer.setClearColor(COLORS.bg, 1);
    renderer.shadowMap.enabled = !lowPower;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(COLORS.bg, 24, 52);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

    /* Lights */
    scene.add(new THREE.HemisphereLight(0xf3f1ec, 0x0f1a2b, 1.1));
    const sun = new THREE.DirectionalLight(0xfff0d6, 1.6);
    sun.position.set(-8, 14, 6);
    sun.castShadow = !lowPower;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 });
    sun.shadow.bias = -0.0008;
    sun.shadow.radius = 4;
    scene.add(sun);
    const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: 0x000000, opacity: 0 }));
    shadowFloor.receiveShadow = true;
    scene.add(shadowFloor);

    /* Ground: drafting grid + site boundary */
    const grid = new THREE.Group();
    scene.add(grid);
    {
        const pts = [];
        const S = 30, step = 0.6;
        for (let i = -S; i <= S + 1e-6; i += step) { pts.push(-S, 0, i, S, 0, i, i, 0, -S, i, 0, S); }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        grid.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: COLORS.line, transparent: true, opacity: 0.045 })));

        const major = [];
        for (let i = -30; i <= 30; i += 6) { major.push(-30, 0, i, 30, 0, i, i, 0, -30, i, 0, 30); }
        const g2 = new THREE.BufferGeometry();
        g2.setAttribute("position", new THREE.Float32BufferAttribute(major, 3));
        grid.add(new THREE.LineSegments(g2, new THREE.LineBasicMaterial({ color: COLORS.line, transparent: true, opacity: 0.09 })));
    }
    const siteGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-5, 0.01, -4.6), new THREE.Vector3(5.2, 0.01, -4.6),
        new THREE.Vector3(5.2, 0.01, 3.8), new THREE.Vector3(-5, 0.01, 3.8), new THREE.Vector3(-5, 0.01, -4.6),
    ]);
    const site = new THREE.Line(siteGeo, new THREE.LineDashedMaterial({ color: COLORS.accent, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.9 }));
    site.computeLineDistances();
    scene.add(site);

    /* Buildings */
    const campus = [
        { x: -2.3, z: 0.2, w: 3.0, d: 1.8, h: 0.9, name: "Outpatient" },
        { x: 1.3, z: 1.9, w: 2.4, d: 1.3, h: 0.7, name: "Emergency" },
        { x: 0.9, z: -0.7, w: 1.6, d: 1.6, h: 3.8, name: "Nursing tower" },
        { x: -2.6, z: -2.6, w: 2.0, d: 1.5, h: 1.7, name: "Research" },
        { x: 3.6, z: -0.6, w: 1.3, d: 2.6, h: 1.1, name: "Support" },
        { x: 0.6, z: -3.4, w: 2.8, d: 1.0, h: 2.0, name: "Housing" },
        { x: 3.8, z: 2.4, w: 1.0, d: 1.0, h: 0.6, name: "Mosque" },
    ].map((b) => ({ ...b, hospital: true }));

    const city = [];
    const rand = rng(1997);
    const step = 2.5;
    const N = lowPower ? 6 : 8;
    for (let ix = -N; ix <= N; ix++) {
        for (let iz = -N; iz <= N; iz++) {
            if (ix % 4 === 0 || iz % 3 === 0) continue;          // streets
            const x = ix * step + (rand() - 0.5) * 0.3, z = iz * step + (rand() - 0.5) * 0.3;
            if (Math.abs(x) < 6.6 && Math.abs(z) < 5.8) continue; // campus site
            const dist = Math.hypot(x, z);
            if (dist > 19) continue;
            const tall = rand() < 0.08;
            const h = tall ? 2.4 + rand() * 2.6 : 0.35 + rand() * rand() * 1.8;
            city.push({ x, z, w: 1.2 + rand() * 0.8, d: 1.2 + rand() * 0.8, h, hospital: false });
        }
    }

    const all = city.concat(campus);
    const maxDist = Math.max(...all.map((b) => Math.hypot(b.x, b.z)));
    const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const unitEdges = new THREE.EdgesGeometry(unitBox);

    const buildings = all.map((b, i) => {
        const group = new THREE.Group();
        group.position.set(b.x, 0, b.z);
        group.scale.set(b.w, 0.001, b.d);

        const solidMat = new THREE.MeshStandardMaterial({
            color: b.hospital ? COLORS.solidHospital : COLORS.solid,
            roughness: 0.92, metalness: 0, transparent: true, opacity: 0,
        });
        const mesh = new THREE.Mesh(unitBox, solidMat);
        mesh.visible = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        const lineMat = new THREE.LineBasicMaterial({ color: b.hospital ? COLORS.accent : COLORS.line, transparent: true, opacity: b.hospital ? 1 : 0.5 });
        group.add(new THREE.LineSegments(unitEdges, lineMat));

        /* floor lines */
        const floors = Math.max(1, Math.round(b.h / 0.34));
        const fp = [];
        for (let f = 1; f < floors; f++) {
            const y = f / floors;
            fp.push(-0.5, y, -0.5, 0.5, y, -0.5, 0.5, y, -0.5, 0.5, y, 0.5, 0.5, y, 0.5, -0.5, y, 0.5, -0.5, y, 0.5, -0.5, y, -0.5);
        }
        let floorMat = null;
        if (fp.length) {
            const fg = new THREE.BufferGeometry();
            fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
            floorMat = new THREE.LineBasicMaterial({ color: b.hospital ? COLORS.accent : COLORS.line, transparent: true, opacity: b.hospital ? 0.45 : 0.16 });
            group.add(new THREE.LineSegments(fg, floorMat));
        }
        scene.add(group);

        const dist = Math.hypot(b.x, b.z) / maxDist;
        return {
            b, group, mesh, solidMat, lineMat, floorMat,
            baseLine: lineMat.opacity, baseFloor: floorMat ? floorMat.opacity : 0,
            lineFrom: new THREE.Color(b.hospital ? COLORS.accent : COLORS.line), lineTo: new THREE.Color(b.hospital ? COLORS.accent : COLORS.ink),
            riseDelay: b.hospital ? 0.5 + i * 0.002 + campus.indexOf(b) * 0.05 : (1 - dist) * 0.05 + dist * 0.45 + rand() * 0.08,
            buildDelay: b.hospital ? campus.indexOf(b) * 0.02 : 0.12 + dist * 0.7 + rand() * 0.1,
        };
    });

    /* Design-review scan plane: a horizontal section line sweeping up through the campus */
    const scanGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-5.6, 0, -5.2), new THREE.Vector3(5.8, 0, -5.2),
        new THREE.Vector3(5.8, 0, 4.4), new THREE.Vector3(-5.6, 0, 4.4), new THREE.Vector3(-5.6, 0, -5.2),
    ]);
    const scanMat = new THREE.LineBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0 });
    const scan = new THREE.Line(scanGeo, scanMat);
    scene.add(scan);
    const scanFill = new THREE.Mesh(
        new THREE.PlaneGeometry(11.4, 9.6).rotateX(-Math.PI / 2).translate(0.1, 0, -0.4),
        new THREE.MeshBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    );
    scene.add(scanFill);

    /* Pointer parallax */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    if (HS.motion && matchMedia("(hover: hover)").matches) {
        window.addEventListener("pointermove", (e) => {
            pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
            pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
        }, { passive: true });
    }

    /* Resize */
    function resize() {
        const w = host.clientWidth, h = host.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w / h < 0.8 ? 46 : 32;
        camera.updateProjectionMatrix();
    }
    new ResizeObserver(() => { resize(); if (!running) draw(0); }).observe(host);
    resize();

    /* Frame */
    let t0 = performance.now();
    function draw(time) {
        const intro = HS.motion ? HS.hero.intro : 1;
        const p = HS.motion ? HS.hero.progress : 0.78;
        const t = (time - t0) / 1000;

        pointer.x += (pointer.tx - pointer.x) * 0.04;
        pointer.y += (pointer.ty - pointer.y) * 0.04;

        /* Camera path */
        const narrow = camera.aspect < 0.8;
        const theta = -0.75 + smooth(p) * 1.6 + Math.sin(t * 0.08) * 0.04 + pointer.x * 0.08;
        const elev = THREE.MathUtils.lerp(0.8, 0.46, smooth(range(p, 0, 0.72))) + smooth(range(p, 0.8, 1)) * 0.5 - pointer.y * 0.04;
        const dist = (narrow ? 34 : 27) - smooth(range(p, 0.1, 0.7)) * 5 + smooth(range(p, 0.8, 1)) * 6 + (1 - intro) * 4;
        camera.position.set(Math.sin(theta) * Math.cos(elev) * dist, Math.sin(elev) * dist, Math.cos(theta) * Math.cos(elev) * dist);
        camera.lookAt(0, 0.8 + p * 0.4, -0.4);

        /* Stage weights */
        const review = range(p, 0.22, 0.5);          // scan sweeps
        const build = range(p, 0.48, 0.82);          // volumes fill
        const deliver = range(p, 0.8, 1);

        site.material.opacity = 0.9 * (1 - build * 0.5);
        shadowFloor.material.opacity = build * 0.42;
        grid.children[0].material.opacity = 0.045 * (1 - deliver * 0.5);

        for (const k of buildings) {
            const rise = smooth(range(intro * 1.5 - k.riseDelay, 0, 0.55));
            k.group.scale.y = Math.max(0.001, k.b.h * rise);

            const fill = smooth(range(build * 1.15 - k.buildDelay, 0, 0.25));
            k.mesh.visible = fill > 0.001;
            k.solidMat.opacity = fill;
            k.solidMat.depthWrite = fill > 0.98;
            k.lineMat.color.copy(k.lineFrom).lerp(k.lineTo, fill);
            k.lineMat.opacity = THREE.MathUtils.lerp(k.baseLine, k.b.hospital ? 0.9 : 0.55, fill);
            if (k.floorMat) { k.floorMat.color.copy(k.lineMat.color); k.floorMat.opacity = THREE.MathUtils.lerp(k.baseFloor, k.b.hospital ? 0.35 : 0.22, fill); }
        }

        /* review scan: rises through the campus during the review stage */
        const scanOn = Math.sin(review * Math.PI);
        const scanY = review * 4.2;
        scan.position.y = scanY; scanFill.position.y = scanY;
        scanMat.opacity = scanOn * 0.95;
        scanFill.material.opacity = scanOn * 0.07;

        sun.intensity = 1.2 + deliver * 0.8;
        sun.position.set(-8 + deliver * 4, 14, 6 - deliver * 3);

        renderer.render(scene, camera);
    }

    /* Run only when visible */
    let running = false, raf = 0, inView = true;
    function loop(time) { draw(time); raf = requestAnimationFrame(loop); }
    function update() {
        const should = HS.motion && inView && !document.hidden;
        if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
        if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    new IntersectionObserver((e) => { inView = e[0].isIntersecting; update(); }).observe(section);
    document.addEventListener("visibilitychange", update);

    draw(performance.now());
    host.classList.add("is-ready");
    update();
}

if (host) {
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
}
