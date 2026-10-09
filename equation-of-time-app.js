/**
 * สมการเวลาและกราฟ Analemma (Equation of Time & Analemma Simulation)
 * สอวน. ดาราศาสตร์ ค่าย 1
 */

import * as THREE from "three";
import {
  D2R,
  calculateEOT
} from "./astro-math.js";

const R = 90;

// ---------------- DOM Elements ----------------
const dom = {
  daySlider: document.getElementById("daySlider"),
  valDateText: document.getElementById("valDateText"),

  chipPeakNov: document.getElementById("chipPeakNov"),
  chipTroughFeb: document.getElementById("chipTroughFeb"),
  chipZeroApr: document.getElementById("chipZeroApr"),
  chipZeroJun: document.getElementById("chipZeroJun"),
  chipZeroSep: document.getElementById("chipZeroSep"),
  chipZeroDec: document.getElementById("chipZeroDec"),

  btnPlayAnalemma: document.getElementById("btnPlayAnalemma"),
  playAnalemmaIcon: document.getElementById("playAnalemmaIcon"),

  chkShowEOTCurve: document.getElementById("chkShowEOTCurve"),
  chkShowEccentricity: document.getElementById("chkShowEccentricity"),
  chkShowObliquity: document.getElementById("chkShowObliquity"),
  chkShowAnalemma3D: document.getElementById("chkShowAnalemma3D"),
  chkShowMeridianLine: document.getElementById("chkShowMeridianLine"),

  eotBadge: document.getElementById("eotBadge"),
  eotDesc: document.getElementById("eotDesc"),

  resEOT: document.getElementById("resEOT"),
  resDec: document.getElementById("resDec"),
  resTermE: document.getElementById("resTermE"),
  resTermEps: document.getElementById("resTermEps"),
  resMeridianTime: document.getElementById("resMeridianTime"),
  resSunStatus: document.getElementById("resSunStatus"),

  btnResetView: document.getElementById("btnResetView"),
  btnViewFront: document.getElementById("btnViewFront"),
  btnViewSide: document.getElementById("btnViewSide"),

  webglContainer: document.getElementById("webglContainer"),
  eotCanvas: document.getElementById("eotCanvas"),

  menuToggle: document.getElementById("menuToggle"),
  sideDrawer: document.getElementById("sideDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerClose: document.getElementById("drawerClose"),
  btnBrowseAllSims: document.getElementById("btnBrowseAllSims")
};

// ---------------- สถานะแบบจำลอง ----------------
const state = {
  dayOfYear: 307, // ~3 พฤศจิกายน (ค่าสูงสุด)
  isPlaying: false
};

const MONTH_NAMES = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function dayToDateStr(n) {
  const d0 = new Date(2025, 0, 1);
  d0.setDate(d0.getDate() + (n - 1));
  const monthsFull = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  return `~${d0.getDate()} ${monthsFull[d0.getMonth()]} (วันที่ ${n})`;
}

// ---------------- Three.js Scene Setup ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const container = dom.webglContainer;
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 150, 100);
scene.add(dirLight);

const rootGroup = new THREE.Group();
scene.add(rootGroup);

// ทรงกลมลวดลายโปร่งใส
const sphereGeo = new THREE.SphereGeometry(R, 64, 32);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0x224488, wireframe: true, transparent: true, opacity: 0.12 });
const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
rootGroup.add(sphereMesh);

// เส้นเมริเดียนท้องถิ่นครบวง (Full 360° Celestial Meridian Circle)
const meridianGeo = new THREE.BufferGeometry();
const meridianPts = [];
for (let i = 0; i <= 128; i++) {
  const th = (i / 128) * Math.PI * 2;
  meridianPts.push(new THREE.Vector3(0, Math.sin(th) * R, Math.cos(th) * R));
}
meridianGeo.setFromPoints(meridianPts);
const meridianLine = new THREE.LineLoop(meridianGeo, new THREE.LineBasicMaterial({ color: 0x8ecae6, linewidth: 2 }));
rootGroup.add(meridianLine);

// เส้นศูนย์สูตรฟ้า
const equatorGeo = new THREE.BufferGeometry();
const eqPts = [];
for (let i = 0; i <= 64; i++) {
  const th = (i / 64) * Math.PI * 2;
  eqPts.push(new THREE.Vector3(Math.cos(th) * R, 0, Math.sin(th) * R));
}
equatorGeo.setFromPoints(eqPts);
const equatorLine = new THREE.Line(equatorGeo, new THREE.LineBasicMaterial({ color: 0x4fa3e3 }));
rootGroup.add(equatorLine);

// เส้น Analemma รูปเลขแปด 3 มิติ (คำนวณตลอดทั้ง 365 วัน)
const analemmaPts = [];
for (let d = 1; d <= 365; d++) {
  const eotData = calculateEOT(d);
  // ค่า EOT เป็นนาที -> แปลงเป็นมุม 1 นาที = 0.25 องศา (15°/60)
  // ขยายสเกลเชิงมุม 2.5 เท่าเพื่อให้เห็นรูปร่างเลขแปดชัดเจนบนทรงกลม
  const eotDeg = eotData.eotMinutes * 0.25 * 2.5;
  const decDeg = eotData.sunDecDeg;

  const decRad = decDeg * D2R;
  const haRad = eotDeg * D2R;

  // แปลงเป็นพิกัด 3D บนทรงกลมรัศมี R
  const x = -R * Math.cos(decRad) * Math.sin(haRad);
  const y = R * Math.sin(decRad);
  const z = R * Math.cos(decRad) * Math.cos(haRad);
  analemmaPts.push(new THREE.Vector3(x, y, z));
}
// ปิดลูป
analemmaPts.push(analemmaPts[0].clone());

const analemmaGeo = new THREE.BufferGeometry().setFromPoints(analemmaPts);
const analemmaLine = new THREE.Line(analemmaGeo, new THREE.LineBasicMaterial({ color: 0xf6c445, linewidth: 3 }));
rootGroup.add(analemmaLine);

// ตัวดวงอาทิตย์บนเส้นเลขแปด (Sun mesh)
const sunGroup = new THREE.Group();
const sunCoreGeo = new THREE.SphereGeometry(3.5, 32, 32);
const sunCoreMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
const sunMesh = new THREE.Mesh(sunCoreGeo, sunCoreMat);
sunGroup.add(sunMesh);

const sunGlowGeo = new THREE.SphereGeometry(5.5, 32, 32);
const sunGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.35, side: THREE.BackSide });
const sunGlowMesh = new THREE.Mesh(sunGlowGeo, sunGlowMat);
sunGroup.add(sunGlowMesh);

rootGroup.add(sunGroup);

// ---------------- กล้องและการควบคุม ----------------
const camState = {
  radius: 250,
  theta: 0,
  phi: 90 * D2R, // มองจากด้านหน้าเข้าหาเมริเดียน
  target: new THREE.Vector3(0, 0, 0),
  isDragging: false,
  prevMouseX: 0,
  prevMouseY: 0
};

function updateCameraPosition() {
  camState.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camState.phi));
  camState.radius = Math.max(100, Math.min(600, camState.radius));

  camera.position.x = camState.target.x + camState.radius * Math.sin(camState.phi) * Math.sin(camState.theta);
  camera.position.y = camState.target.y + camState.radius * Math.cos(camState.phi);
  camera.position.z = camState.target.z + camState.radius * Math.sin(camState.phi) * Math.cos(camState.theta);
  camera.lookAt(camState.target);
}

container.addEventListener("pointerdown", (e) => {
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

container.addEventListener("wheel", (e) => {
  e.preventDefault();
  camState.radius += e.deltaY * 0.15;
  updateCameraPosition();
}, { passive: false });

// ---------------- การวาดกราฟ 2 มิติ (2D Canvas Chart) ----------------
const canvas = dom.eotCanvas;
const ctx = canvas ? canvas.getContext("2d") : null;

function draw2DChart() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;

  // พื้นหลังกราฟ
  ctx.fillStyle = "#090d18";
  ctx.fillRect(0, 0, W, H);

  // ขอบเขตและสเกล
  const padL = 45;
  const padR = 20;
  const padT = 15;
  const padB = 25;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const yMin = -20; // นาที
  const yMax = +20; // นาที

  function xToPx(day) {
    return padL + ((day - 1) / 364) * plotW;
  }

  function yToPx(val) {
    return padT + plotH - ((val - yMin) / (yMax - yMin)) * plotH;
  }

  // เส้นตารางแนวนอน (-15, -10, -5, 0, +5, +10, +15)
  ctx.lineWidth = 1;
  [-15, -10, -5, 0, 5, 10, 15].forEach((val) => {
    const yPx = yToPx(val);
    ctx.strokeStyle = val === 0 ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.08)";
    ctx.setLineDash(val === 0 ? [] : [2, 3]);
    ctx.beginPath();
    ctx.moveTo(padL, yPx);
    ctx.lineTo(W - padR, yPx);
    ctx.stroke();

    // ป้ายข้อความแกน Y
    ctx.fillStyle = val === 0 ? "#ffffff" : "rgba(255, 255, 255, 0.5)";
    ctx.font = "11px 'IBM Plex Sans Thai', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${val > 0 ? "+" : ""}${val}m`, padL - 6, yPx);
  });
  ctx.setLineDash([]);

  // ป้ายเดือนบนแกน X (12 เดือน)
  const monthDays = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  monthDays.forEach((d, idx) => {
    const xPx = xToPx(d);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(xPx, padT);
    ctx.lineTo(xPx, padT + plotH);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "10px 'IBM Plex Sans Thai', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(MONTH_NAMES[idx], xPx + plotW / 24, padT + plotH + 6);
  });

  // วาดกราฟเส้นองค์ประกอบ
  // 1. ผลจากความรีวงโคจร (eTerm: สีฟ้า)
  if (dom.chkShowEccentricity.checked) {
    ctx.strokeStyle = "#4fa3e3";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let d = 1; d <= 365; d++) {
      const eot = calculateEOT(d);
      const px = xToPx(d);
      const py = yToPx(eot.eTerm);
      if (d === 1) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // 2. ผลจากความเอียงแกนโลก (epsTerm: สีเขียว)
  if (dom.chkShowObliquity.checked) {
    ctx.strokeStyle = "#52b788";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let d = 1; d <= 365; d++) {
      const eot = calculateEOT(d);
      const px = xToPx(d);
      const py = yToPx(eot.epsTerm);
      if (d === 1) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3. กราฟรวม EOT (สีทอง หนา)
  if (dom.chkShowEOTCurve.checked) {
    ctx.strokeStyle = "#f6c445";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    for (let d = 1; d <= 365; d++) {
      const eot = calculateEOT(d);
      const px = xToPx(d);
      const py = yToPx(eot.eotMinutes);
      if (d === 1) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // เส้นบ่งชี้วันที่ปัจจุบัน (Current Day Indicator)
  const curX = xToPx(state.dayOfYear);
  ctx.strokeStyle = "#ff4d6d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(curX, padT);
  ctx.lineTo(curX, padT + plotH);
  ctx.stroke();

  // จุดวงกลมบนกราฟ EOT
  const curEot = calculateEOT(state.dayOfYear);
  const curY = yToPx(curEot.eotMinutes);

  ctx.fillStyle = "#ff4d6d";
  ctx.beginPath();
  ctx.arc(curX, curY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function fitViewports() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w && h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    updateCameraPosition();
  }
  if (canvas) draw2DChart();
}

const ro = new ResizeObserver(() => {
  fitViewports();
});
const stageEl = document.getElementById("stage");
if (stageEl) ro.observe(stageEl);
fitViewports();

// ---------------- การคำนวณและอัปเดตแบบจำลอง ----------------
function updateSimulation() {
  const eotData = calculateEOT(state.dayOfYear);
  const eotMin = eotData.eotMinutes;
  const decDeg = eotData.sunDecDeg;

  // วางตำแหน่งดวงอาทิตย์ 3 มิติบนเส้น Analemma
  const eotDeg = eotMin * 0.25 * 2.5; // สเกลเทียบเท่า
  const decRad = decDeg * D2R;
  const haRad = eotDeg * D2R;

  const sunX = -R * Math.cos(decRad) * Math.sin(haRad);
  const sunY = R * Math.sin(decRad);
  const sunZ = R * Math.cos(decRad) * Math.cos(haRad);
  sunGroup.position.set(sunX, sunY, sunZ);

  // อัปเดตข้อความบนแผงควบคุม
  dom.valDateText = document.getElementById("valDateText");
  if (dom.valDateText) dom.valDateText.textContent = dayToDateStr(state.dayOfYear);

  dom.resEOT.textContent = `${eotMin >= 0 ? "+" : ""}${eotMin.toFixed(2)} นาที`;
  dom.resDec.textContent = `${decDeg >= 0 ? "+" : ""}${decDeg.toFixed(2)}°`;
  dom.resTermE.textContent = `${eotData.eTerm >= 0 ? "+" : ""}${eotData.eTerm.toFixed(2)} นาที`;
  dom.resTermEps.textContent = `${eotData.epsTerm >= 0 ? "+" : ""}${eotData.epsTerm.toFixed(2)} นาที`;

  // เวลาจริงที่ข้ามเมริเดียน: LAT = 12:00 -> LMT = 12:00 - EOT
  const lmtHours = 12 - eotMin / 60;
  const h = Math.floor(lmtHours);
  const m = Math.floor((lmtHours - h) * 60);
  const s = Math.round(((lmtHours - h) * 60 - m) * 60);
  dom.resMeridianTime.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} น.`;

  if (eotMin > 0.5) {
    dom.eotBadge.textContent = `นาฬิกาแดดเร็วกว่านาฬิกาปกติ +${eotMin.toFixed(1)} นาที`;
    dom.eotBadge.style.background = "#f6c445";
    dom.eotBadge.style.color = "#111";
    dom.eotDesc.textContent = "ดวงอาทิตย์จริงข้ามเมริเดียนท้องถิ่นก่อนเวลา 12:00 น. ของเวลาสุริยคติเฉลี่ย (Sun is fast)";
    dom.resSunStatus.textContent = "เดินเร็วกว่าเวลาเฉลี่ย (เร็ว)";
  } else if (eotMin < -0.5) {
    dom.eotBadge.textContent = `นาฬิกาแดดช้ากว่านาฬิกาปกติ ${eotMin.toFixed(1)} นาที`;
    dom.eotBadge.style.background = "#4fa3e3";
    dom.eotBadge.style.color = "#111";
    dom.eotDesc.textContent = "ดวงอาทิตย์จริงข้ามเมริเดียนท้องถิ่นหลังเวลา 12:00 น. ของเวลาสุริยคติเฉลี่ย (Sun is slow)";
    dom.resSunStatus.textContent = "เดินช้ากว่าเวลาเฉลี่ย (ช้า)";
  } else {
    dom.eotBadge.textContent = "นาฬิกาแดดตรงกับนาฬิกาปกติ (EOT ≈ 0)";
    dom.eotBadge.style.background = "#52b788";
    dom.eotBadge.style.color = "#111";
    dom.eotDesc.textContent = "เวลาสุริยคติปรากฏตรงกับเวลาสุริยคติเฉลี่ยอย่างแม่นยำ (เกิดขึ้น 4 ครั้งในรอบปี)";
    dom.resSunStatus.textContent = "ตรงเวลาพอดี (0 นาที)";
  }

  // การมองเห็น
  analemmaLine.visible = dom.chkShowAnalemma3D.checked;
  meridianLine.visible = dom.chkShowMeridianLine.checked;

  draw2DChart();
}

// ---------------- Event Listeners ----------------
dom.daySlider.addEventListener("input", (e) => {
  state.dayOfYear = parseInt(e.target.value);
  updateSimulation();
});

// ชิปวันสำคัญ
dom.chipPeakNov.addEventListener("click", () => {
  state.dayOfYear = 307; // ~3 พ.ย.
  dom.daySlider.value = 307;
  updateSimulation();
});

dom.chipTroughFeb.addEventListener("click", () => {
  state.dayOfYear = 43; // ~12 ก.พ.
  dom.daySlider.value = 43;
  updateSimulation();
});

dom.chipZeroApr.addEventListener("click", () => {
  state.dayOfYear = 105; // ~15 เม.ย.
  dom.daySlider.value = 105;
  updateSimulation();
});

dom.chipZeroJun.addEventListener("click", () => {
  state.dayOfYear = 165; // ~14 มิ.ย.
  dom.daySlider.value = 165;
  updateSimulation();
});

dom.chipZeroSep.addEventListener("click", () => {
  state.dayOfYear = 244; // ~1 ก.ย.
  dom.daySlider.value = 244;
  updateSimulation();
});

dom.chipZeroDec.addEventListener("click", () => {
  state.dayOfYear = 359; // ~25 ธ.ค.
  dom.daySlider.value = 359;
  updateSimulation();
});

// เช็คบ็อกซ์
[dom.chkShowEOTCurve, dom.chkShowEccentricity, dom.chkShowObliquity, dom.chkShowAnalemma3D, dom.chkShowMeridianLine].forEach((chk) => {
  chk.addEventListener("change", updateSimulation);
});

// แอนิเมชัน
dom.btnPlayAnalemma.addEventListener("click", () => {
  state.isPlaying = !state.isPlaying;
  dom.playAnalemmaIcon.textContent = state.isPlaying ? "⏸" : "▶";
  dom.btnPlayAnalemma.classList.toggle("primary", !state.isPlaying);
});

// มุมกล้อง
dom.btnResetView.addEventListener("click", () => {
  camState.radius = 250;
  camState.theta = 0;
  camState.phi = 90 * D2R;
  camState.target.set(0, 0, 0);
  updateCameraPosition();
});

dom.btnViewFront.addEventListener("click", () => {
  camState.radius = 230;
  camState.theta = 0;
  camState.phi = 90 * D2R;
  updateCameraPosition();
});

dom.btnViewSide.addEventListener("click", () => {
  camState.radius = 230;
  camState.theta = 90 * D2R;
  camState.phi = 90 * D2R;
  updateCameraPosition();
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
dom.btnBrowseAllSims?.addEventListener("click", openDrawer);

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
    sphereMat.color.setHex(0x4466aa);
  } else {
    scene.background = new THREE.Color(0x0b1020);
    sphereMat.color.setHex(0x224488);
  }
  draw2DChart();
});

// ---------------- Animation Loop ----------------
let lastTime = performance.now();
function animate(currentTime) {
  requestAnimationFrame(animate);
  const dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  if (state.isPlaying) {
    state.dayOfYear = (state.dayOfYear + dt * 25) % 365;
    if (state.dayOfYear < 1) state.dayOfYear += 365;
    dom.daySlider.value = Math.round(state.dayOfYear);
    updateSimulation();
  }

  renderer.render(scene, camera);
}

// เริ่มต้นระบบ
updateCameraPosition();
updateSimulation();
requestAnimationFrame(animate);
