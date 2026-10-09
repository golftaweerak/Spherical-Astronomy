/**
 * แบบจำลองวันดาราคติและวันสุริยคติ (Sidereal vs. Solar Day Simulation)
 * สอวน. ดาราศาสตร์ ค่าย 1
 */

import * as THREE from "three";
import { D2R } from "./astro-math.js";

// รัศมีวงโคจรของโลกในฉาก
const R_ORBIT = 130;
const R_EARTH = 12;

// ---------------- DOM Elements ----------------
const dom = {
  solarHours: document.getElementById("solarHours"),
  valSolarHours: document.getElementById("valSolarHours"),
  elapsedDays: document.getElementById("elapsedDays"),
  valElapsedDays: document.getElementById("valElapsedDays"),

  chipStage0: document.getElementById("chipStage0"),
  chipStageSidereal: document.getElementById("chipStageSidereal"),
  chipStageSolar: document.getElementById("chipStageSolar"),
  chipStageMonth: document.getElementById("chipStageMonth"),

  btnPlayTime: document.getElementById("btnPlayTime"),
  playTimeIcon: document.getElementById("playTimeIcon"),

  chkShowSunRay: document.getElementById("chkShowSunRay"),
  chkShowStarRay: document.getElementById("chkShowStarRay"),
  chkShowObserver: document.getElementById("chkShowObserver"),
  chkShowOrbit: document.getElementById("chkShowOrbit"),
  chkShowAngles: document.getElementById("chkShowAngles"),

  resAccumSidereal: document.getElementById("resAccumSidereal"),
  resDriftTime: document.getElementById("resDriftTime"),

  btnResetView: document.getElementById("btnResetView"),
  btnResetViewDesktop: document.getElementById("btnResetViewDesktop"),
  btnViewEarthFollow: document.getElementById("btnViewEarthFollow"),
  btnViewPerspective: document.getElementById("btnViewPerspective"),

  btnToggleLayersMenu: document.getElementById("btnToggleLayersMenu"),
  btnToggleLegendMenu: document.getElementById("btnToggleLegendMenu"),
  stageToolbarLayers: document.getElementById("stageToolbarLayers"),
  stageLegend: document.getElementById("stageLegend"),

  menuToggle: document.getElementById("menuToggle"),
  sideDrawer: document.getElementById("sideDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerClose: document.getElementById("drawerClose")
};

// ---------------- สถานะแบบจำลอง ----------------
const state = {
  solarHours: 0.0,    // 0 ถึง 24 ชม.
  elapsedDays: 0,     // 0 ถึง 365 วัน
  isPlaying: false,
  followEarth: false
};

// ---------------- Three.js Scene Setup ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const stage = document.getElementById("stage");
const camera = new THREE.PerspectiveCamera(45, 1, 1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(50, 150, 100);
scene.add(dirLight);

// กลุ่มวัตถุหลัก
const rootGroup = new THREE.Group();
scene.add(rootGroup);

// 1. ดวงอาทิตย์ที่ศูนย์กลาง
const sunGroup = new THREE.Group();
const sunGeo = new THREE.SphereGeometry(18, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunGroup.add(sunMesh);

const sunCoronaGeo = new THREE.SphereGeometry(26, 32, 32);
const sunCoronaMat = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.35, side: THREE.BackSide });
const sunCoronaMesh = new THREE.Mesh(sunCoronaGeo, sunCoronaMat);
sunGroup.add(sunCoronaMesh);
rootGroup.add(sunGroup);

// 2. วงโคจรของโลก (Orbit Circle)
const orbitGeo = new THREE.BufferGeometry();
const orbitPts = [];
for (let i = 0; i <= 128; i++) {
  const th = (i / 128) * Math.PI * 2;
  orbitPts.push(new THREE.Vector3(Math.cos(th) * R_ORBIT, 0, Math.sin(th) * R_ORBIT));
}
orbitGeo.setFromPoints(orbitPts);
const orbitLine = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({ color: 0x4fa3e3, dashSize: 4, gapSize: 3 }));
orbitLine.computeLineDistances();
rootGroup.add(orbitLine);

// 3. ระบบจำลองโลก (Earth System Group)
const earthSystem = new THREE.Group();
rootGroup.add(earthSystem);

// ลูกโลก (Earth Mesh)
const earthGeo = new THREE.SphereGeometry(R_EARTH, 32, 32);
const earthMat = new THREE.MeshPhongMaterial({
  color: 0x1d6fa5,
  emissive: 0x0a2540,
  specular: 0x2288cc,
  shininess: 25
});
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
earthSystem.add(earthMesh);

// เส้นศูนย์สูตรโลก
const earthEquatorGeo = new THREE.BufferGeometry();
const eqPts = [];
for (let i = 0; i <= 64; i++) {
  const th = (i / 64) * Math.PI * 2;
  eqPts.push(new THREE.Vector3(Math.cos(th) * (R_EARTH + 0.3), 0, Math.sin(th) * (R_EARTH + 0.3)));
}
earthEquatorGeo.setFromPoints(eqPts);
const earthEquator = new THREE.Line(earthEquatorGeo, new THREE.LineBasicMaterial({ color: 0x7dd6a8 }));
earthMesh.add(earthEquator);

// ผู้สังเกต (Observer marker & arrow on Earth)
const obsGroup = new THREE.Group();
const obsMarkerGeo = new THREE.CylinderGeometry(0.8, 1.8, 6, 16);
const obsMarkerMat = new THREE.MeshBasicMaterial({ color: 0xff4d6d });
const obsMarker = new THREE.Mesh(obsMarkerGeo, obsMarkerMat);
obsMarker.position.set(0, 0, R_EARTH + 3);
obsMarker.rotation.x = Math.PI / 2;
obsGroup.add(obsMarker);

// เวกเตอร์ชี้แนวสายตาผู้สังเกต (Observer Local Meridian Ray)
const obsRayGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, R_EARTH),
  new THREE.Vector3(0, 0, R_EARTH + 35)
]);
const obsRayLine = new THREE.Line(obsRayGeo, new THREE.LineBasicMaterial({ color: 0xff4d6d, linewidth: 3 }));
obsGroup.add(obsRayLine);

earthSystem.add(obsGroup);

// เวกเตอร์ชี้ไปยังดาวฤกษ์ไกลโพ้น (Fixed Star Direction Ray — ทิศทางขนานคงที่ตลอดกาล)
const starRayGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -65)
]);
const starRayLine = new THREE.Line(starRayGeo, new THREE.LineDashedMaterial({ color: 0x7dd6a8, dashSize: 3, gapSize: 2 }));
starRayLine.computeLineDistances();
earthSystem.add(starRayLine);

// เวกเตอร์ชี้ไปยังดวงอาทิตย์ (Sun-line)
const sunRayGeo = new THREE.BufferGeometry();
const sunRayLine = new THREE.Line(sunRayGeo, new THREE.LineBasicMaterial({ color: 0xffd166, linewidth: 2 }));
rootGroup.add(sunRayLine);

// ---------------- กล้องและการควบคุม ----------------
const camState = {
  radius: 360,
  theta: 0,
  phi: 15 * D2R, // มองจากเกือบตั้งฉากด้านบน (Top-down view)
  target: new THREE.Vector3(0, 0, 0),
  isDragging: false,
  prevMouseX: 0,
  prevMouseY: 0
};

function updateCameraPosition() {
  camState.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camState.phi));
  camState.radius = Math.max(80, Math.min(800, camState.radius));

  if (state.followEarth) {
    camera.position.x = earthSystem.position.x + camState.radius * 0.45 * Math.sin(camState.phi) * Math.sin(camState.theta);
    camera.position.y = earthSystem.position.y + camState.radius * 0.45 * Math.cos(camState.phi);
    camera.position.z = earthSystem.position.z + camState.radius * 0.45 * Math.sin(camState.phi) * Math.cos(camState.theta);
    camera.lookAt(earthSystem.position);
  } else {
    camera.position.x = camState.target.x + camState.radius * Math.sin(camState.phi) * Math.sin(camState.theta);
    camera.position.y = camState.target.y + camState.radius * Math.cos(camState.phi);
    camera.position.z = camState.target.z + camState.radius * Math.sin(camState.phi) * Math.cos(camState.theta);
    camera.lookAt(camState.target);
  }
}

stage.addEventListener("pointerdown", (e) => {
  camState.isDragging = true;
  camState.prevMouseX = e.clientX;
  camState.prevMouseY = e.clientY;
});

window.addEventListener("pointermove", (e) => {
  if (!camState.isDragging) return;
  const dx = e.clientX - camState.prevMouseX;
  const dy = e.clientY - camState.prevMouseY;
  camState.prevMouseX = e.clientX;
  camState.prevMouseY = e.clientY;

  camState.theta -= dx * 0.007;
  camState.phi -= dy * 0.007;
  updateCameraPosition();
});

window.addEventListener("pointerup", () => {
  camState.isDragging = false;
});

stage.addEventListener("wheel", (e) => {
  e.preventDefault();
  camState.radius += e.deltaY * 0.2;
  updateCameraPosition();
}, { passive: false });

function fitCameraToViewport() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  updateCameraPosition();
}

const ro = new ResizeObserver(() => {
  fitCameraToViewport();
});
ro.observe(stage);
fitCameraToViewport();

// ---------------- การคำนวณและอัปเดตแบบจำลอง ----------------
function updateSimulation() {
  // 1. การโคจรของโลกรอบดวงอาทิตย์ (Orbital angle θ_orbit)
  // 1 ปี = 365.25 วัน โคจร 360° -> ~0.9856° ต่อวัน
  const totalDays = state.elapsedDays + state.solarHours / 24;
  const orbitAngleDeg = (totalDays / 365.25) * 360;
  const orbitAngleRad = orbitAngleDeg * D2R;

  // ตำแหน่งของโลกในระนาบวงโคจร XZ
  // เริ่มต้นที่ (0, 0, R_ORBIT) โคจรทวนเข็มนาฬิกา
  const earthX = R_ORBIT * Math.sin(orbitAngleRad);
  const earthZ = R_ORBIT * Math.cos(orbitAngleRad);
  earthSystem.position.set(earthX, 0, earthZ);

  // 2. การหมุนรอบตัวเองของโลก (Axial rotation)
  // วันดาราคติ: หมุน 360° ในเวลา 23.9344696 ชม. (360° / 23.9344696 ต่อชั่วโมง = 15.04107° ต่อชั่วโมง)
  // เมื่อครบ 24 ชม. โลกหมุนไปแล้ว 360° + 0.9856° = 360.9856°
  const rotationDeg = totalDays * 360.9856;
  const rotationRad = rotationDeg * D2R;

  // หมุนตัวผู้สังเกตตามการหมุนของโลก
  obsGroup.rotation.y = rotationRad;
  earthMesh.rotation.y = rotationRad;

  // 3. เวกเตอร์ชี้ไปยังดวงอาทิตย์ (Sun-line จากโลกไปหา (0,0,0))
  sunRayLine.geometry.setFromPoints([
    new THREE.Vector3(earthX, 0, earthZ),
    new THREE.Vector3(0, 0, 0)
  ]);

  // เวกเตอร์ดาวฤกษ์ไกล (ตรึงทิศทางคงที่ตามแนวแกน Z ลบ หรือทิศทางคงที่ในฉาก)
  // ให้หมุนสวนทางกับ earthSystem เพื่อรักษาทิศทางคงที่ในอวกาศสัมบูรณ์
  starRayLine.rotation.y = 0;

  // 4. คำนวณค่าตัวเลขและแสดงผล
  const curHours = Math.floor(state.solarHours);
  const curMins = Math.round((state.solarHours - curHours) * 60);
  dom.valSolarHours.textContent = `${String(curHours).padStart(2, "0")} ชม. ${String(curMins).padStart(2, "0")} นาที`;
  dom.valElapsedDays.textContent = `วันที่ ${state.elapsedDays + 1} (${state.elapsedDays} วันที่ผ่านไป)`;

  // เวลาดาราคติสะสม: เดินเร็วกว่าเวลาสุริยคติ 3.94 นาทีต่อวัน
  const siderealTotalH = (totalDays * (24 + 3.9426 / 60)) % 24;
  const sH = Math.floor(siderealTotalH);
  const sM = Math.floor((siderealTotalH - sH) * 60);
  dom.resAccumSidereal.textContent = `${String(sH).padStart(2, "0")} ชม. ${String(sM).padStart(2, "0")} นาที`;

  // ผลสะสมการขึ้นเร็วของดาวฤกษ์ (นาที)
  const driftMin = totalDays * 3.9426;
  if (driftMin < 60) {
    dom.resDriftTime.textContent = `เร็วขึ้น ${driftMin.toFixed(1)} นาที`;
  } else {
    const driftH = (driftMin / 60).toFixed(2);
    dom.resDriftTime.textContent = `เร็วขึ้น ${driftH} ชม. (${Math.round(driftMin)} นาที)`;
  }

  // ซ่อน/แสดงวัตถุ
  sunRayLine.visible = dom.chkShowSunRay.checked;
  starRayLine.visible = dom.chkShowStarRay.checked;
  obsGroup.visible = dom.chkShowObserver.checked;
  orbitLine.visible = dom.chkShowOrbit.checked;

  updateCameraPosition();
}

// ---------------- Event Listeners ----------------
dom.solarHours.addEventListener("input", (e) => {
  state.solarHours = parseFloat(e.target.value);
  updateSimulation();
});

dom.elapsedDays.addEventListener("input", (e) => {
  state.elapsedDays = parseInt(e.target.value);
  updateSimulation();
});

// ขั้นตอนสำคัญ (Stages)
dom.chipStage0.addEventListener("click", () => {
  state.solarHours = 0;
  state.elapsedDays = 0;
  dom.solarHours.value = 0;
  dom.elapsedDays.value = 0;
  updateSimulation();
});

dom.chipStageSidereal.addEventListener("click", () => {
  state.solarHours = 23.9344696; // 23h 56m 04s
  dom.solarHours.value = 23.93;
  updateSimulation();
});

dom.chipStageSolar.addEventListener("click", () => {
  state.solarHours = 24.0;
  dom.solarHours.value = 24.0;
  updateSimulation();
});

dom.chipStageMonth.addEventListener("click", () => {
  state.elapsedDays = 30;
  dom.elapsedDays.value = 30;
  updateSimulation();
});

// เช็คบ็อกซ์
[dom.chkShowSunRay, dom.chkShowStarRay, dom.chkShowObserver, dom.chkShowOrbit, dom.chkShowAngles].forEach((chk) => {
  chk.addEventListener("change", updateSimulation);
});

// แอนิเมชัน
dom.btnPlayTime.addEventListener("click", () => {
  state.isPlaying = !state.isPlaying;
  dom.playTimeIcon.textContent = state.isPlaying ? "⏸" : "▶";
  dom.btnPlayTime.classList.toggle("primary", !state.isPlaying);
});

// มุมกล้อง
function doResetCamera() {
  state.followEarth = false;
  camState.radius = 360;
  camState.theta = 0;
  camState.phi = 15 * D2R;
  camState.target.set(0, 0, 0);
  updateCameraPosition();
}

dom.btnResetView?.addEventListener("click", doResetCamera);
dom.btnResetViewDesktop?.addEventListener("click", doResetCamera);

dom.btnViewEarthFollow.addEventListener("click", () => {
  state.followEarth = true;
  camState.radius = 110;
  camState.theta = 0;
  camState.phi = 45 * D2R;
  updateCameraPosition();
});

dom.btnViewPerspective.addEventListener("click", () => {
  state.followEarth = false;
  camState.radius = 350;
  camState.theta = 35 * D2R;
  camState.phi = 60 * D2R;
  camState.target.set(0, 0, 0);
  updateCameraPosition();
});

/* ---- ควบคุม Dropdown / Popover บนหน้าจอมือถือ ---- */
function closeAllPopovers() {
  dom.stageToolbarLayers?.classList.remove("open-popover");
  dom.stageLegend?.classList.remove("open-popover");
  if (dom.btnToggleLayersMenu) {
    dom.btnToggleLayersMenu.classList.remove("active");
    dom.btnToggleLayersMenu.setAttribute("aria-expanded", "false");
  }
  if (dom.btnToggleLegendMenu) {
    dom.btnToggleLegendMenu.classList.remove("active");
    dom.btnToggleLegendMenu.setAttribute("aria-expanded", "false");
  }
}

if (dom.btnToggleLayersMenu && dom.stageToolbarLayers) {
  dom.btnToggleLayersMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dom.stageToolbarLayers.classList.contains("open-popover");
    closeAllPopovers();
    if (!isOpen) {
      dom.stageToolbarLayers.classList.add("open-popover");
      dom.btnToggleLayersMenu.classList.add("active");
      dom.btnToggleLayersMenu.setAttribute("aria-expanded", "true");
    }
  });
}

if (dom.btnToggleLegendMenu && dom.stageLegend) {
  dom.btnToggleLegendMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dom.stageLegend.classList.contains("open-popover");
    closeAllPopovers();
    if (!isOpen) {
      dom.stageLegend.classList.add("open-popover");
      dom.btnToggleLegendMenu.classList.add("active");
      dom.btnToggleLegendMenu.setAttribute("aria-expanded", "true");
    }
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#stageToolbarLayers") && !e.target.closest("#stageLegend") &&
      !e.target.closest(".mobile-control-bar")) {
    closeAllPopovers();
  }
});

// Drawer Navigation
function openDrawer() {
  document.body.classList.add("drawer-open");
  dom.sideDrawer?.classList.add("open");
  dom.drawerBackdrop?.classList.add("open");
}
function closeDrawer() {
  document.body.classList.remove("drawer-open");
  dom.sideDrawer?.classList.remove("open");
  dom.drawerBackdrop?.classList.remove("open");
}

dom.menuToggle?.addEventListener("click", openDrawer);
dom.drawerClose?.addEventListener("click", closeDrawer);
dom.drawerBackdrop?.addEventListener("click", closeDrawer);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

// ธีมสี
const themeBtn = document.querySelector("[data-theme-toggle]");
themeBtn?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  if (next === "light") {
    scene.background = new THREE.Color(0xf0f4fc);
  } else {
    scene.background = new THREE.Color(0x0b1020);
  }
});

// ---------------- Animation Loop ----------------
let lastTime = performance.now();
function animate(currentTime) {
  requestAnimationFrame(animate);
  const dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  if (state.isPlaying) {
    state.solarHours += dt * 3.5; // 3.5 ชั่วโมงต่อวินาที
    if (state.solarHours >= 24) {
      state.solarHours -= 24;
      state.elapsedDays = (state.elapsedDays + 1) % 365;
      dom.elapsedDays.value = state.elapsedDays;
    }
    dom.solarHours.value = state.solarHours;
    updateSimulation();
  }

  renderer.render(scene, camera);
}

// เริ่มต้นระบบ
updateCameraPosition();
updateSimulation();
requestAnimationFrame(animate);
