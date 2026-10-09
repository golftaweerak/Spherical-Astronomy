/**
 * สุริยวิถี 4 ฤดูกาลและกลุ่มดาวจักราศี (Seasons, Ecliptic & Zodiac)
 * หลักสูตร สอวน. ดาราศาสตร์ ค่าย 1
 */

import * as THREE from "three";
import {
  D2R,
  EPSILON_DEG,
  eclipticToEquatorial,
  calculateRiseSet,
  hoursToHMS,
  degToDMS
} from "./astro-math.js";

// รัศมีทรงกลมท้องฟ้าในฉาก 3 มิติ
const R = 100;

// ชื่อกลุ่มดาวจักราศีทั้ง 12 ตามลำดับลองจิจูดสุริยวิถี (0° ถึง 360°)
const ZODIAC_SIGNS = [
  { name: "กลุ่มดาวปลา (Pisces)", symbol: "♓", min: 330, max: 360, altMin: 0, altMax: 30 },
  { name: "กลุ่มดาวแกะ (Aries)", symbol: "♈", min: 0, max: 30 },
  { name: "กลุ่มดาววัว (Taurus)", symbol: "♉", min: 30, max: 60 },
  { name: "กลุ่มดาวคนคู่ (Gemini)", symbol: "♊", min: 60, max: 90 },
  { name: "กลุ่มดาวปู (Cancer)", symbol: "♋", min: 90, max: 120 },
  { name: "กลุ่มดาวสิงโต (Leo)", symbol: "♌", min: 120, max: 150 },
  { name: "กลุ่มดาวหญิงสาว (Virgo)", symbol: "♍", min: 150, max: 180 },
  { name: "กลุ่มดาวคันชั่ง (Libra)", symbol: "♎", min: 180, max: 210 },
  { name: "กลุ่มดาวแมงป่อง (Scorpius)", symbol: "♏", min: 210, max: 240 },
  { name: "กลุ่มดาวคนยิงธนู (Sagittarius)", symbol: "♐", min: 240, max: 270 },
  { name: "กลุ่มดาวแพะทะเล (Capricornus)", symbol: "♑", min: 270, max: 300 },
  { name: "กลุ่มดาวคนแบกหม้อน้ำ (Aquarius)", symbol: "♒", min: 300, max: 330 }
];

function getZodiac(lonDeg) {
  const norm = ((lonDeg % 360) + 360) % 360;
  // ดาราศาสตร์แท้จริงเทียบกับสัญลักษณ์จักราศี
  const index = Math.floor(norm / 30);
  const zodiacList = [
    { name: "กลุ่มดาวแกะ (Aries)", symbol: "♈" },
    { name: "กลุ่มดาววัว (Taurus)", symbol: "♉" },
    { name: "กลุ่มดาวคนคู่ (Gemini)", symbol: "♊" },
    { name: "กลุ่มดาวปู (Cancer)", symbol: "♋" },
    { name: "กลุ่มดาวสิงโต (Leo)", symbol: "♌" },
    { name: "กลุ่มดาวหญิงสาว (Virgo)", symbol: "♍" },
    { name: "กลุ่มดาวคันชั่ง (Libra)", symbol: "♎" },
    { name: "กลุ่มดาวแมงป่อง (Scorpius)", symbol: "♏" },
    { name: "กลุ่มดาวคนยิงธนู (Sagittarius)", symbol: "♐" },
    { name: "กลุ่มดาวแพะทะเล (Capricornus)", symbol: "♑" },
    { name: "กลุ่มดาวคนแบกหม้อน้ำ (Aquarius)", symbol: "♒" },
    { name: "กลุ่มดาวปลา (Pisces)", symbol: "♓" }
  ];
  return zodiacList[index % 12];
}

// ---------------- DOM Elements ----------------
const dom = {
  solarLon: document.getElementById("solarLon"),
  valSolarLon: document.getElementById("valSolarLon"),
  dayOfYear: document.getElementById("dayOfYear"),
  valDateStr: document.getElementById("valDateStr"),
  obsLat: document.getElementById("obsLat"),
  valObsLat: document.getElementById("valObsLat"),
  solarTime: document.getElementById("solarTime"),
  valSolarTime: document.getElementById("valSolarTime"),

  presetVernal: document.getElementById("presetVernal"),
  presetSummer: document.getElementById("presetSummer"),
  presetAutumn: document.getElementById("presetAutumn"),
  presetWinter: document.getElementById("presetWinter"),

  btnPlayDaily: document.getElementById("btnPlayDaily"),
  playDailyIcon: document.getElementById("playDailyIcon"),
  btnPlayYearly: document.getElementById("btnPlayYearly"),
  playYearlyIcon: document.getElementById("playYearlyIcon"),

  chkEcliptic: document.getElementById("chkEcliptic"),
  chkEquator: document.getElementById("chkEquator"),
  chkHorizon: document.getElementById("chkHorizon"),
  chkDiurnal: document.getElementById("chkDiurnal"),
  chkZodiac: document.getElementById("chkZodiac"),
  chkGrid: document.getElementById("chkGrid"),

  seasonBanner: document.getElementById("seasonBanner"),
  seasonName: document.getElementById("seasonName"),
  seasonDesc: document.getElementById("seasonDesc"),

  resSunDec: document.getElementById("resSunDec"),
  resSunRA: document.getElementById("resSunRA"),
  resNoonAlt: document.getElementById("resNoonAlt"),
  resDayLength: document.getElementById("resDayLength"),
  resRiseSetAz: document.getElementById("resRiseSetAz"),
  resZodiac: document.getElementById("resZodiac"),

  btnResetView: document.getElementById("btnResetView"),
  btnViewEcliptic: document.getElementById("btnViewEcliptic"),
  btnViewNCP: document.getElementById("btnViewNCP"),
  btnViewZenith: document.getElementById("btnViewZenith"),

  menuToggle: document.getElementById("menuToggle"),
  sideDrawer: document.getElementById("sideDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerClose: document.getElementById("drawerClose"),
  btnBrowseAllSims: document.getElementById("btnBrowseAllSims")
};

// ---------------- สถานะแบบจำลอง ----------------
const state = {
  solarLonDeg: 0,
  dayOfYear: 80,
  latDeg: 13.8,
  solarTimeH: 12.0, // เที่ยงวัน = 12 ชม.
  isDailyPlaying: false,
  isYearlyPlaying: false
};

// แปลงวันในรอบปีเป็นข้อความวันที่โดยประมาณ
function dayOfYearToDateStr(n) {
  const d0 = new Date(2025, 0, 1);
  d0.setDate(d0.getDate() + (n - 1));
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  return `~${d0.getDate()} ${months[d0.getMonth()]}`;
}

// ---------------- Three.js Scene Setup ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const stage = document.getElementById("stage");
const camera = new THREE.PerspectiveCamera(48, 1, 1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

// แสงสว่าง
const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 200, 150);
scene.add(dirLight);

// กลุ่มวัตถุหลัก
const rootGroup = new THREE.Group();
scene.add(rootGroup);

// วัตถุยึดตามขอบฟ้าผู้สังเกต (Horizon frame: X=East, Y=Zenith/Up, Z=South)
const horizonGroup = new THREE.Group();
rootGroup.add(horizonGroup);

// วัตถุที่เอียงตามละติจูด (Equatorial frame)
const celestialGroup = new THREE.Group();
horizonGroup.add(celestialGroup);

// วัตถุระนาบสุริยวิถี (Ecliptic frame)
const eclipticGroup = new THREE.Group();
celestialGroup.add(eclipticGroup);

// ---------------- สร้างทรงกลมท้องฟ้าและระนาบ ----------------
// 1. ทรงกลมโปร่งใสรอบนอก
const sphereGeo = new THREE.SphereGeometry(R, 64, 32);
const sphereMat = new THREE.MeshBasicMaterial({
  color: 0x224488,
  wireframe: true,
  transparent: true,
  opacity: 0.12
});
const celestialSphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
celestialGroup.add(celestialSphereMesh);

// 2. ระนาบขอบฟ้า (Horizon Disc)
const horizonDiscGeo = new THREE.CircleGeometry(R, 64);
const horizonDiscMat = new THREE.MeshBasicMaterial({
  color: 0x2a9d8f,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide
});
const horizonDisc = new THREE.Mesh(horizonDiscGeo, horizonDiscMat);
horizonDisc.rotation.x = Math.PI / 2;
horizonGroup.add(horizonDisc);

// วงแหวนขอบฟ้า (Horizon Ring)
const horizonRingGeo = new THREE.RingGeometry(R - 0.5, R + 0.5, 96);
const horizonRingMat = new THREE.MeshBasicMaterial({ color: 0x52b788, side: THREE.DoubleSide });
const horizonRing = new THREE.Mesh(horizonRingGeo, horizonRingMat);
horizonRing.rotation.x = Math.PI / 2;
horizonGroup.add(horizonRing);

// เส้นแนวแกนเหนือ-ใต้ (N-S) และ ตะวันออก-ตก (E-W) บนระนาบขอบฟ้า
const horizonNsGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0.2, -R),
  new THREE.Vector3(0, 0.2, R)
]);
const horizonNsLine = new THREE.Line(
  horizonNsGeo,
  new THREE.LineDashedMaterial({ color: 0x52b788, dashSize: 4, gapSize: 3, linewidth: 2, transparent: true, opacity: 0.85 })
);
horizonNsLine.computeLineDistances();
horizonGroup.add(horizonNsLine);

const horizonEwGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-R, 0.2, 0),
  new THREE.Vector3(R, 0.2, 0)
]);
const horizonEwLine = new THREE.Line(
  horizonEwGeo,
  new THREE.LineDashedMaterial({ color: 0x52b788, dashSize: 4, gapSize: 3, linewidth: 2, transparent: true, opacity: 0.85 })
);
horizonEwLine.computeLineDistances();
horizonGroup.add(horizonEwLine);

// 3. ศูนย์สูตรฟ้า (Celestial Equator: δ = 0)
const equatorGeo = new THREE.BufferGeometry();
const equatorPts = [];
for (let i = 0; i <= 128; i++) {
  const th = (i / 128) * Math.PI * 2;
  equatorPts.push(new THREE.Vector3(Math.cos(th) * R, 0, Math.sin(th) * R));
}
equatorGeo.setFromPoints(equatorPts);
const equatorLine = new THREE.Line(equatorGeo, new THREE.LineBasicMaterial({ color: 0x4fa3e3, linewidth: 2 }));
celestialGroup.add(equatorLine);

// แกนหมุนท้องฟ้า NCP - SCP
const axisGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, R * 1.15, 0),
  new THREE.Vector3(0, -R * 1.15, 0)
]);
const axisLine = new THREE.Line(axisGeo, new THREE.LineDashedMaterial({ color: 0x8ecae6, dashSize: 3, gapSize: 2 }));
axisLine.computeLineDistances();
celestialGroup.add(axisLine);

// 4. ระนาบสุริยวิถี (Ecliptic: เอียง ε = 23.44° เทียบกับศูนย์สูตรฟ้า)
// หมุนรอบแกน X (จุดวสันตวิษุวัตอยู่ที่แนว X)
eclipticGroup.rotation.x = EPSILON_DEG * D2R;

const eclipticDiscGeo = new THREE.CircleGeometry(R, 64);
const eclipticDiscMat = new THREE.MeshBasicMaterial({
  color: 0xf6c445,
  transparent: true,
  opacity: 0.12,
  side: THREE.DoubleSide
});
const eclipticDisc = new THREE.Mesh(eclipticDiscGeo, eclipticDiscMat);
eclipticDisc.rotation.x = Math.PI / 2;
eclipticGroup.add(eclipticDisc);

const eclipticRingGeo = new THREE.RingGeometry(R - 0.7, R + 0.7, 96);
const eclipticRingMat = new THREE.MeshBasicMaterial({ color: 0xf6c445, side: THREE.DoubleSide });
const eclipticRing = new THREE.Mesh(eclipticRingGeo, eclipticRingMat);
eclipticRing.rotation.x = Math.PI / 2;
eclipticGroup.add(eclipticRing);

// จุด 4 ตำแหน่งสำคัญบนสุริยวิถี
function makeMarker(color, size = 2.8) {
  const geo = new THREE.SphereGeometry(size, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

// วสันตวิษุวัต (Vernal Equinox: λ = 0°) -> (R, 0, 0)
const markerVernal = makeMarker(0x7dd6a8, 3.2);
markerVernal.position.set(R, 0, 0);
eclipticGroup.add(markerVernal);

// ครีษมายัน (Summer Solstice: λ = 90°) -> (0, 0, -R)
const markerSummer = makeMarker(0xff758f, 3.2);
markerSummer.position.set(0, 0, -R);
eclipticGroup.add(markerSummer);

// ศารทวิษุวัต (Autumnal Equinox: λ = 180°) -> (-R, 0, 0)
const markerAutumn = makeMarker(0x90e0ef, 3.2);
markerAutumn.position.set(-R, 0, 0);
eclipticGroup.add(markerAutumn);

// เหมายัน (Winter Solstice: λ = 270°) -> (0, 0, R)
const markerWinter = makeMarker(0x48cae4, 3.2);
markerWinter.position.set(0, 0, R);
eclipticGroup.add(markerWinter);

// 5. ทางเดินประจำวันของดวงอาทิตย์ (Diurnal Path Circle)
const diurnalLineGeo = new THREE.BufferGeometry();
const diurnalLineMat = new THREE.LineBasicMaterial({ color: 0xff8c42, linewidth: 2.5 });
const diurnalLine = new THREE.Line(diurnalLineGeo, diurnalLineMat);
celestialGroup.add(diurnalLine);

// 6. แบบจำลองดวงอาทิตย์ (The Sun Mesh)
const sunGroup = new THREE.Group();
const sunCoreGeo = new THREE.SphereGeometry(4.2, 32, 32);
const sunCoreMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
const sunCoreMesh = new THREE.Mesh(sunCoreGeo, sunCoreMat);
sunGroup.add(sunCoreMesh);

// โคโรนาเรืองแสงรอบดวงอาทิตย์
const sunGlowGeo = new THREE.SphereGeometry(6.5, 32, 32);
const sunGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffaa00,
  transparent: true,
  opacity: 0.38,
  side: THREE.BackSide
});
const sunGlowMesh = new THREE.Mesh(sunGlowGeo, sunGlowMat);
sunGroup.add(sunGlowMesh);

celestialGroup.add(sunGroup);

// ป้ายข้อความ 3D แบบ Sprite
function createTextSprite(text, color = "#ffffff", fontSize = 28) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 70;
  const ctx = canvas.getContext("2d");
  ctx.font = `Bold ${fontSize}px 'IBM Plex Sans Thai', sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 150, 35);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(30, 7, 1);
  return sprite;
}

// เส้นรอบวงเมริเดียนท้องฟ้า (Celestial Meridian Circle: เหนือ N - จอมฟ้า Z - ใต้ S - จุดดิ่ง Nadir ครบ 360°)
const meridianPts = [];
for (let i = 0; i <= 128; i++) {
  const a = (i / 128) * Math.PI * 2;
  meridianPts.push(new THREE.Vector3(0, R * Math.cos(a), R * Math.sin(a)));
}
const meridianCircle = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(meridianPts),
  new THREE.LineBasicMaterial({ color: 0x8ecae6, linewidth: 2, transparent: true, opacity: 0.85 })
);
horizonGroup.add(meridianCircle);

// ป้ายทิศหลักขอบฟ้า
const lblN = createTextSprite("N (เหนือ)", "#52b788");
lblN.position.set(0, 0, -R * 1.08);
horizonGroup.add(lblN);

const lblS = createTextSprite("S (ใต้)", "#52b788");
lblS.position.set(0, 0, R * 1.08);
horizonGroup.add(lblS);

const lblE = createTextSprite("E (ออก)", "#52b788");
lblE.position.set(R * 1.08, 0, 0);
horizonGroup.add(lblE);

const lblW = createTextSprite("W (ตก)", "#52b788");
lblW.position.set(-R * 1.08, 0, 0);
horizonGroup.add(lblW);

const lblZ = createTextSprite("Z (จอมฟ้า)", "#ffd166");
lblZ.position.set(0, R * 1.08, 0);
horizonGroup.add(lblZ);

const lblNadir = createTextSprite("Na (จุดดิ่ง)", "#94a3b8", 22);
lblNadir.position.set(0, -R * 1.08, 0);
horizonGroup.add(lblNadir);

// ป้าย 4 จุดสำคัญ
const lblVernal = createTextSprite("วสันตวิษุวัต (♈)", "#7dd6a8", 22);
lblVernal.position.set(R * 1.15, 0, 0);
eclipticGroup.add(lblVernal);

const lblSummer = createTextSprite("ครีษมายัน (♋)", "#ff758f", 22);
lblSummer.position.set(0, 0, -R * 1.15);
eclipticGroup.add(lblSummer);

const lblAutumn = createTextSprite("ศารทวิษุวัต (♎)", "#90e0ef", 22);
lblAutumn.position.set(-R * 1.15, 0, 0);
eclipticGroup.add(lblAutumn);

const lblWinter = createTextSprite("เหมายัน (♑)", "#48cae4", 22);
lblWinter.position.set(0, 0, R * 1.15);
eclipticGroup.add(lblWinter);

// ---------------- กล้องและการควบคุมมุมมอง ----------------
const camState = {
  radius: 285,
  theta: 45 * D2R, // azimuth
  phi: 65 * D2R,   // polar angle from Y
  target: new THREE.Vector3(0, 0, 0),
  isDragging: false,
  prevMouseX: 0,
  prevMouseY: 0
};

function updateCameraPosition() {
  camState.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camState.phi));
  camState.radius = Math.max(120, Math.min(600, camState.radius));

  camera.position.x = camState.target.x + camState.radius * Math.sin(camState.phi) * Math.sin(camState.theta);
  camera.position.y = camState.target.y + camState.radius * Math.cos(camState.phi);
  camera.position.z = camState.target.z + camState.radius * Math.sin(camState.phi) * Math.cos(camState.theta);
  camera.lookAt(camState.target);
}

// การควบคุมเมาส์และทัช
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
  camState.radius += e.deltaY * 0.15;
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
  // 1. หมุนกรอบท้องฟ้าตามละติจูด (เอียงแกน NCP ทำมุม φ กับระนาบขอบฟ้า)
  // ในกรอบขอบฟ้า: ขั้วฟ้าเหนือ (NCP) อยู่ทางทิศเหนือ (Z ติดลบ) ทำมุมเงย φ จากแนวระนาบ
  const phiRad = state.latDeg * D2R;
  celestialGroup.rotation.x = -(Math.PI / 2 - phiRad);

  // 2. คำนวณพิกัดดวงอาทิตย์บนสุริยวิถี
  const lamRad = state.solarLonDeg * D2R;
  const epsRad = EPSILON_DEG * D2R;

  // เดคลิเนชัน: sin δ = sin ε · sin λ
  const sinDec = Math.sin(epsRad) * Math.sin(lamRad);
  const sunDecDeg = Math.asin(Math.max(-1, Math.min(1, sinDec))) / D2R;

  // ไรท์แอสเซนชัน: α
  const eq = eclipticToEquatorial(state.solarLonDeg, 0);
  const sunRADeg = eq.raDeg;
  const sunRAH = eq.raHours;

  // 3. วาดวงกลมทางเดินประจำวัน (Diurnal Path)
  // เป็นวงกลมขนานศูนย์สูตรฟ้า ที่มีเดคลิเนชัน δ คงที่
  const rParallel = R * Math.cos(sunDecDeg * D2R);
  const yParallel = R * Math.sin(sunDecDeg * D2R);

  const diurnalPts = [];
  for (let i = 0; i <= 96; i++) {
    const ang = (i / 96) * Math.PI * 2;
    diurnalPts.push(new THREE.Vector3(Math.cos(ang) * rParallel, yParallel, Math.sin(ang) * rParallel));
  }
  diurnalLine.geometry.setFromPoints(diurnalPts);

  // 4. คำนวณตำแหน่ง 3D ของดวงอาทิตย์ในรอบวันตามมุมชั่วโมง H
  // เวลาสุริยคติเที่ยงวัน (12.0) = จุดผ่านเมริเดียนบน (H = 0°)
  // H = (solarTimeH - 12) * 15°
  const hourAngleDeg = (state.solarTimeH - 12) * 15;
  const hourAngleRad = hourAngleDeg * D2R;

  // ตำแหน่งในกรอบศูนย์สูตรฟ้า:
  // ที่ H = 0 (ผ่านเมริเดียนบน) ดวงอาทิตย์อยู่บนระนาบ YZ
  const sunX = -rParallel * Math.sin(hourAngleRad);
  const sunY = yParallel;
  const sunZ = rParallel * Math.cos(hourAngleRad);
  sunGroup.position.set(sunX, sunY, sunZ);

  // 5. คำนวณเงื่อนไขขึ้น-ตก และความยาวนานกลางวัน
  const riseSet = calculateRiseSet(sunDecDeg, state.latDeg);

  // มุมเงยเที่ยงวัน: h_noon = 90° - |φ - δ|
  const noonAlt = 90 - Math.abs(state.latDeg - sunDecDeg);

  // กลุ่มดาวจักราศี
  const zodiac = getZodiac(state.solarLonDeg);

  // 6. อัปเดต UI ข้อความและผลลัพธ์
  dom.valSolarLon.textContent = `${state.solarLonDeg.toFixed(1)}°`;
  dom.valDateStr.textContent = dayOfYearToDateStr(state.dayOfYear);
  dom.valObsLat.textContent = `${Math.abs(state.latDeg).toFixed(1)}° ${state.latDeg >= 0 ? "N" : "S"}`;
  
  const hNum = Math.floor(state.solarTimeH);
  const mNum = Math.floor((state.solarTimeH - hNum) * 60);
  dom.valSolarTime.textContent = `${String(hNum).padStart(2, "0")}:${String(mNum).padStart(2, "0")} น.`;

  dom.resSunDec.textContent = `${sunDecDeg >= 0 ? "+" : ""}${sunDecDeg.toFixed(2)}° (${degToDMS(sunDecDeg)})`;
  dom.resSunRA.textContent = `${sunRAH.toFixed(2)} ชม. (${hoursToHMS(sunRAH)})`;
  dom.resNoonAlt.textContent = `${noonAlt.toFixed(2)}°`;

  if (riseSet.type === "circumpolar") {
    dom.resDayLength.textContent = "24 ชม. 00 นาที (พระอาทิตย์เที่ยงคืน)";
    dom.resRiseSetAz.textContent = "ไม่ตก (หมุนวนเหนือขอบฟ้า)";
  } else if (riseSet.type === "never_rise") {
    dom.resDayLength.textContent = "0 ชม. 00 นาที (ค่ำคืนขั้วโลก)";
    dom.resRiseSetAz.textContent = "ไม่ขึ้น (อยู่ใต้ขอบฟ้าตลอดวัน)";
  } else {
    const dH = Math.floor(riseSet.dayLengthHours);
    const dM = Math.round((riseSet.dayLengthHours - dH) * 60);
    dom.resDayLength.textContent = `${dH} ชม. ${String(dM).padStart(2, "0")} นาที`;
    dom.resRiseSetAz.textContent = `${riseSet.riseAzDeg.toFixed(1)}° / ${riseSet.setAzDeg.toFixed(1)}°`;
  }

  dom.resZodiac.textContent = `${zodiac.name} ${zodiac.symbol}`;

  // ป้ายคำอธิบายฤดูกาล
  updateSeasonBanner(sunDecDeg, state.solarLonDeg);

  // การมองเห็นระนาบต่างๆ
  eclipticGroup.visible = dom.chkEcliptic.checked;
  equatorLine.visible = dom.chkEquator.checked;
  horizonGroup.visible = dom.chkHorizon.checked;
  diurnalLine.visible = dom.chkDiurnal.checked;
  celestialSphereMesh.visible = dom.chkGrid.checked;

  lblVernal.visible = dom.chkZodiac.checked;
  lblSummer.visible = dom.chkZodiac.checked;
  lblAutumn.visible = dom.chkZodiac.checked;
  lblWinter.visible = dom.chkZodiac.checked;
}

function updateSeasonBanner(dec, lon) {
  const normLon = ((lon % 360) + 360) % 360;
  if (Math.abs(normLon - 0) < 5 || Math.abs(normLon - 360) < 5) {
    dom.seasonName.textContent = "วสันตวิษุวัต (Vernal Equinox)";
    dom.seasonName.style.background = "#7dd6a8";
    dom.seasonDesc.textContent = "ดวงอาทิตย์ตัดศูนย์สูตรฟ้าจากซีกใต้ขึ้นซีกเหนือ (δ = 0°) กลางวันและกลางคืนยาวนานเท่ากัน 12 ชั่วโมงทั่วโลก เริ่มต้นฤดูใบไม้ผลิในซีกโลกเหนือ";
  } else if (Math.abs(normLon - 90) < 5) {
    dom.seasonName.textContent = "ครีษมายัน (Summer Solstice)";
    dom.seasonName.style.background = "#ff758f";
    dom.seasonDesc.textContent = "ดวงอาทิตย์อยู่เหนือสุดบนทรงกลมท้องฟ้า (δ = +23.44°) กลางวันยาวนานที่สุดในรอบปีสำหรับซีกโลกเหนือ ขั้วโลกเหนือเป็นพระอาทิตย์เที่ยงคืน";
  } else if (Math.abs(normLon - 180) < 5) {
    dom.seasonName.textContent = "ศารทวิษุวัต (Autumnal Equinox)";
    dom.seasonName.style.background = "#90e0ef";
    dom.seasonDesc.textContent = "ดวงอาทิตย์ตัดศูนย์สูตรฟ้าจากซีกเหนือลงซีกใต้ (δ = 0°) กลางวันและกลางคืนยาวนานเท่ากัน 12 ชั่วโมงทั่วโลก เริ่มต้นฤดูใบไม้ร่วงในซีกโลกเหนือ";
  } else if (Math.abs(normLon - 270) < 5) {
    dom.seasonName.textContent = "เหมายัน (Winter Solstice)";
    dom.seasonName.style.background = "#48cae4";
    dom.seasonDesc.textContent = "ดวงอาทิตย์อยู่ใต้สุดบนทรงกลมท้องฟ้า (δ = −23.44°) กลางคืนยาวนานที่สุดในรอบปีสำหรับซีกโลกเหนือ ซีกโลกใต้เป็นช่วงฤดูร้อน";
  } else {
    dom.seasonName.textContent = `ลองจิจูดสุริยวิถี λ = ${normLon.toFixed(1)}°`;
    dom.seasonName.style.background = "#ffd166";
    dom.seasonDesc.textContent = `เดคลิเนชันของดวงอาทิตย์ปัจจุบันอยู่ที่ δ = ${dec.toFixed(2)}° การขึ้นและตกของดวงอาทิตย์จะเบี่ยงเบนออกจากทิศตะวันออกและทิศตะวันตกตามสูตร sin δ / cos φ`;
  }
}

// ---------------- Event Listeners ----------------
dom.solarLon.addEventListener("input", (e) => {
  state.solarLonDeg = parseFloat(e.target.value);
  // ประเมินวันที่ในรอบปีคร่าวๆ: λ = 0 อยู่ที่ ~80 (21 มีนาคม)
  state.dayOfYear = Math.round(((state.solarLonDeg / 360) * 365 + 80) % 365) || 1;
  dom.dayOfYear.value = state.dayOfYear;
  updateSimulation();
});

dom.dayOfYear.addEventListener("input", (e) => {
  state.dayOfYear = parseInt(e.target.value);
  // แปลงวันในรอบปีเป็น λ
  state.solarLonDeg = ((state.dayOfYear - 80 + 365) % 365) * (360 / 365);
  dom.solarLon.value = Math.round(state.solarLonDeg);
  updateSimulation();
});

dom.obsLat.addEventListener("input", (e) => {
  state.latDeg = parseFloat(e.target.value);
  updateSimulation();
});

dom.solarTime.addEventListener("input", (e) => {
  state.solarTimeH = parseFloat(e.target.value);
  updateSimulation();
});

// ชิปตำแหน่งสำคัญ 4 ฤดูกาล
dom.presetVernal.addEventListener("click", () => {
  state.solarLonDeg = 0;
  state.dayOfYear = 80;
  dom.solarLon.value = 0;
  dom.dayOfYear.value = 80;
  updateSimulation();
});

dom.presetSummer.addEventListener("click", () => {
  state.solarLonDeg = 90;
  state.dayOfYear = 172;
  dom.solarLon.value = 90;
  dom.dayOfYear.value = 172;
  updateSimulation();
});

dom.presetAutumn.addEventListener("click", () => {
  state.solarLonDeg = 180;
  state.dayOfYear = 266;
  dom.solarLon.value = 180;
  dom.dayOfYear.value = 266;
  updateSimulation();
});

dom.presetWinter.addEventListener("click", () => {
  state.solarLonDeg = 270;
  state.dayOfYear = 356;
  dom.solarLon.value = 270;
  dom.dayOfYear.value = 356;
  updateSimulation();
});

// ชิปละติจูด
document.querySelectorAll("[data-lat]").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.latDeg = parseFloat(btn.dataset.lat);
    dom.obsLat.value = state.latDeg;
    updateSimulation();
  });
});

// เช็คบ็อกซ์แสดงผล
[dom.chkEcliptic, dom.chkEquator, dom.chkHorizon, dom.chkDiurnal, dom.chkZodiac, dom.chkGrid].forEach((chk) => {
  chk.addEventListener("change", updateSimulation);
});

// แอนิเมชันเดินเวลาประจำวัน
dom.btnPlayDaily.addEventListener("click", () => {
  state.isDailyPlaying = !state.isDailyPlaying;
  dom.playDailyIcon.textContent = state.isDailyPlaying ? "⏸" : "▶";
  dom.btnPlayDaily.classList.toggle("primary", !state.isDailyPlaying);
});

// แอนิเมชันเดินเวลาในรอบปี
dom.btnPlayYearly.addEventListener("click", () => {
  state.isYearlyPlaying = !state.isYearlyPlaying;
  dom.playYearlyIcon.textContent = state.isYearlyPlaying ? "⏸" : "🔄";
  dom.btnPlayYearly.classList.toggle("primary", state.isYearlyPlaying);
});

// ปุ่มรีเซ็ตมุมมองและมุมมองมาตรฐาน
dom.btnResetView.addEventListener("click", () => {
  camState.radius = 285;
  camState.theta = 45 * D2R;
  camState.phi = 65 * D2R;
  camState.target.set(0, 0, 0);
  updateCameraPosition();
});

dom.btnViewEcliptic.addEventListener("click", () => {
  // มองจากขั้วสุริยวิถีเหนือ (NEP)
  camState.radius = 270;
  camState.theta = 0;
  camState.phi = (90 - EPSILON_DEG) * D2R;
  updateCameraPosition();
});

dom.btnViewNCP.addEventListener("click", () => {
  // มองจากขั้วฟ้าเหนือ (NCP)
  camState.radius = 270;
  camState.theta = 0;
  camState.phi = (90 - state.latDeg) * D2R;
  updateCameraPosition();
});

dom.btnViewZenith.addEventListener("click", () => {
  // มองจากจุดจอมฟ้า (Zenith)
  camState.radius = 270;
  camState.theta = 0;
  camState.phi = 0.05;
  updateCameraPosition();
});

// Drawer Navigation และ Theme Toggle
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

// สลับธีมสี
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
});

// ---------------- Animation Loop ----------------
let lastTime = performance.now();
function animate(currentTime) {
  requestAnimationFrame(animate);
  const dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // แอนิเมชันเดินเวลาประจำวัน (1 วินาที = 1 ชั่วโมง)
  if (state.isDailyPlaying) {
    state.solarTimeH = (state.solarTimeH + dt * 1.5) % 24;
    dom.solarTime.value = state.solarTimeH;
    updateSimulation();
  }

  // แอนิเมชันเดินเวลาในรอบปี (1 วินาที = 10 วัน)
  if (state.isYearlyPlaying) {
    state.solarLonDeg = (state.solarLonDeg + dt * 25) % 360;
    dom.solarLon.value = state.solarLonDeg;
    state.dayOfYear = Math.round(((state.solarLonDeg / 360) * 365 + 80) % 365) || 1;
    dom.dayOfYear.value = state.dayOfYear;
    updateSimulation();
  }

  renderer.render(scene, camera);
}

// เริ่มต้นระบบ
updateCameraPosition();
updateSimulation();
requestAnimationFrame(animate);
