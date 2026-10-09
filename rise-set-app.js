/**
 * สภาวะขึ้น-ตกและแสงสนธยา (Rise/Set Conditions & Twilight)
 * หลักสูตร สอวน. ดาราศาสตร์ ค่าย 1
 */

import * as THREE from "three";
import {
  D2R,
  calculateRiseSet,
  degToDMS
} from "./astro-math.js";

const R = 100;

// ---------------- DOM Elements ----------------
const dom = {
  riseLat: document.getElementById("riseLat"),
  valRiseLat: document.getElementById("valRiseLat"),
  riseDec: document.getElementById("riseDec"),
  valRiseDec: document.getElementById("valRiseDec"),
  riseHA: document.getElementById("riseHA"),
  valRiseHA: document.getElementById("valRiseHA"),

  chipSunEquinox: document.getElementById("chipSunEquinox"),
  chipSunSummer: document.getElementById("chipSunSummer"),
  chipSunWinter: document.getElementById("chipSunWinter"),
  chipVega: document.getElementById("chipVega"),
  chipSirius: document.getElementById("chipSirius"),

  btnPlayOrbit: document.getElementById("btnPlayOrbit"),
  playOrbitIcon: document.getElementById("playOrbitIcon"),

  chkShowTwilight: document.getElementById("chkShowTwilight"),
  chkShowRisePoints: document.getElementById("chkShowRisePoints"),
  chkShowEquator: document.getElementById("chkShowEquator"),
  chkShowDiurnal: document.getElementById("chkShowDiurnal"),
  chkShowHourAngle: document.getElementById("chkShowHourAngle"),
  chkShowHorizon: document.getElementById("chkShowHorizon"),
  chkShowGrid: document.getElementById("chkShowGrid"),

  riseClassBox: document.getElementById("riseClassBox"),
  riseClassBadge: document.getElementById("riseClassBadge"),
  riseClassDesc: document.getElementById("riseClassDesc"),

  resCosH0: document.getElementById("resCosH0"),
  resH0: document.getElementById("resH0"),
  resDayTime: document.getElementById("resDayTime"),
  resRiseAz: document.getElementById("resRiseAz"),
  resSetAz: document.getElementById("resSetAz"),
  resMaxAlt: document.getElementById("resMaxAlt"),

  resTwilCivilH: document.getElementById("resTwilCivilH"),
  resTwilCivilDur: document.getElementById("resTwilCivilDur"),
  resTwilNautH: document.getElementById("resTwilNautH"),
  resTwilNautDur: document.getElementById("resTwilNautDur"),
  resTwilAstroH: document.getElementById("resTwilAstroH"),
  resTwilAstroDur: document.getElementById("resTwilAstroDur"),

  btnResetView: document.getElementById("btnResetView"),
  btnViewEast: document.getElementById("btnViewEast"),
  btnViewMeridian: document.getElementById("btnViewMeridian"),
  btnViewZenith: document.getElementById("btnViewZenith"),

  menuToggle: document.getElementById("menuToggle"),
  sideDrawer: document.getElementById("sideDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerClose: document.getElementById("drawerClose"),
  btnBrowseAllSims: document.getElementById("btnBrowseAllSims")
};

// ---------------- สถานะแบบจำลอง ----------------
const state = {
  latDeg: 13.8,
  decDeg: 0.0,
  haHours: 0.0, // มุมชั่วโมงบวก (0.0 ถึง 24.0 ชั่วโมง)
  haDeg: 0.0,   // มุมชั่วโมงบวก (0.0° ถึง 360.0°)
  isPlaying: false
};

// ---------------- Three.js Scene Setup ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const stage = document.getElementById("stage");
const camera = new THREE.PerspectiveCamera(48, 1, 1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 200, 150);
scene.add(dirLight);

// กลุ่มวัตถุ
const rootGroup = new THREE.Group();
scene.add(rootGroup);

const horizonGroup = new THREE.Group();
rootGroup.add(horizonGroup);

const celestialGroup = new THREE.Group();
horizonGroup.add(celestialGroup);

// ทรงกลมลวดลายรอบนอก
const sphereGeo = new THREE.SphereGeometry(R, 64, 32);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0x224488, wireframe: true, transparent: true, opacity: 0.12 });
const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
celestialGroup.add(sphereMesh);

// ระนาบขอบฟ้า (Horizon Disc)
const horizonDiscGeo = new THREE.CircleGeometry(R, 64);
const horizonDiscMat = new THREE.MeshBasicMaterial({ color: 0x2a9d8f, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
const horizonDisc = new THREE.Mesh(horizonDiscGeo, horizonDiscMat);
horizonDisc.rotation.x = Math.PI / 2;
horizonGroup.add(horizonDisc);

const horizonRingGeo = new THREE.RingGeometry(R - 0.6, R + 0.6, 96);
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

// วงแหวนสนธยา 3 ระดับ (Civil -6°, Nautical -12°, Astronomical -18°)
function makeTwilightRing(altDeg, colorHex) {
  const rT = R * Math.cos(-altDeg * D2R);
  const yT = -R * Math.sin(-altDeg * D2R);
  const geo = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const th = (i / 96) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(th) * rT, yT, Math.sin(th) * rT));
  }
  geo.setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({ color: colorHex, dashSize: 3, gapSize: 2 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

const ringCivil = makeTwilightRing(-6, 0xe76f51);
const ringNautical = makeTwilightRing(-12, 0x457b9d);
const ringAstro = makeTwilightRing(-18, 0x1d3557);

const twilightGroup = new THREE.Group();
twilightGroup.add(ringCivil);
twilightGroup.add(ringNautical);
twilightGroup.add(ringAstro);
horizonGroup.add(twilightGroup);

// ศูนย์สูตรฟ้า
const eqGeo = new THREE.BufferGeometry();
const eqPts = [];
for (let i = 0; i <= 96; i++) {
  const th = (i / 96) * Math.PI * 2;
  eqPts.push(new THREE.Vector3(Math.cos(th) * R, 0, Math.sin(th) * R));
}
eqGeo.setFromPoints(eqPts);
const eqLine = new THREE.Line(eqGeo, new THREE.LineBasicMaterial({ color: 0x4fa3e3, linewidth: 2 }));
celestialGroup.add(eqLine);

// แกนหมุนขั้วฟ้า
const axisGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, R * 1.15, 0),
  new THREE.Vector3(0, -R * 1.15, 0)
]);
const axisLine = new THREE.Line(axisGeo, new THREE.LineDashedMaterial({ color: 0x8ecae6, dashSize: 3, gapSize: 2 }));
axisLine.computeLineDistances();
celestialGroup.add(axisLine);

// ทางเดินประจำวันของดาว (Diurnal Path)
const diurnalGeo = new THREE.BufferGeometry();
const diurnalLine = new THREE.Line(diurnalGeo, new THREE.LineBasicMaterial({ color: 0xff8c42, linewidth: 2.5 }));
celestialGroup.add(diurnalLine);

// จุดตัดขอบฟ้าขึ้น-ตก (Rising & Setting Markers)
const riseMarkerGeo = new THREE.SphereGeometry(3.0, 16, 16);
const riseMarkerMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
const riseMarker = new THREE.Mesh(riseMarkerGeo, riseMarkerMat);
const setMarker = new THREE.Mesh(riseMarkerGeo, riseMarkerMat);
horizonGroup.add(riseMarker);
horizonGroup.add(setMarker);

// วัตถุจำลองเทห์ฟากฟ้า (Target Star)
const starGroup = new THREE.Group();
const starCoreGeo = new THREE.SphereGeometry(3.6, 32, 32);
const starCoreMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
const starMesh = new THREE.Mesh(starCoreGeo, starCoreMat);
starGroup.add(starMesh);

const starGlowGeo = new THREE.SphereGeometry(5.5, 32, 32);
const starGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.35, side: THREE.BackSide });
const starGlowMesh = new THREE.Mesh(starGlowGeo, starGlowMat);
starGroup.add(starGlowMesh);

celestialGroup.add(starGroup);

// เส้นและส่วนโค้งมุมชั่วโมง (Hour Circle & Equatorial Hour Angle Arc)
const hourCircleGeo = new THREE.BufferGeometry();
const hourCircleLine = new THREE.Line(
  hourCircleGeo,
  new THREE.LineDashedMaterial({ color: 0x48cae4, dashSize: 3, gapSize: 2, linewidth: 2 })
);
celestialGroup.add(hourCircleLine);

const hourArcGeo = new THREE.BufferGeometry();
const hourArcLine = new THREE.Line(
  hourArcGeo,
  new THREE.LineBasicMaterial({ color: 0x48cae4, linewidth: 3.5 })
);
celestialGroup.add(hourArcLine);

function createTextSprite(text, color = "#ffffff", fontSize = 26) {
  const canvas = document.createElement("canvas");
  canvas.width = 340;
  canvas.height = 70;
  const ctx = canvas.getContext("2d");

  function draw(str) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `Bold ${fontSize}px 'IBM Plex Sans Thai', sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str, canvas.width / 2, canvas.height / 2);
  }

  draw(text);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(34, 7, 1);
  sprite.lastText = text;

  sprite.setText = function(newText) {
    if (sprite.lastText === newText) return;
    sprite.lastText = newText;
    draw(newText);
    texture.needsUpdate = true;
  };

  return sprite;
}

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

const lblNadir = createTextSprite("Na (จุดดิ่ง)", "#94a3b8", 20);
lblNadir.position.set(0, -R * 1.08, 0);
horizonGroup.add(lblNadir);

const lblRise = createTextSprite("จุดขึ้น (Rise)", "#ffd166", 20);
horizonGroup.add(lblRise);

const lblSet = createTextSprite("จุดตก (Set)", "#ffd166", 20);
horizonGroup.add(lblSet);

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

// ป้ายกำกับมุมชั่วโมง H
const lblHourAngle = createTextSprite("H = 0.00h (0.0°)", "#48cae4", 22);
celestialGroup.add(lblHourAngle);

// ---------------- กล้องและการควบคุม ----------------
const camState = {
  radius: 285,
  theta: 50 * D2R,
  phi: 65 * D2R,
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

const pointers = new Map();
let pinchDist = null;
const el = renderer.domElement;

el.addEventListener("pointerdown", (e) => {
  try { el.setPointerCapture(e.pointerId); } catch (_) {}
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
  }
});

el.addEventListener("pointermove", (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (pointers.size === 1) {
    camState.theta -= (e.clientX - p.x) * 0.007;
    camState.phi   -= (e.clientY - p.y) * 0.007;
    updateCameraPosition();
  }
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2 && pinchDist !== null) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    camState.radius *= pinchDist / Math.max(d, 1);
    pinchDist = d;
    updateCameraPosition();
  }
});

const endPointer = (e) => { pointers.delete(e.pointerId); pinchDist = null; };
el.addEventListener("pointerup", endPointer);
el.addEventListener("pointercancel", endPointer);

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

// ---------------- การคำนวณและอัปเดต ----------------
function updateSimulation() {
  const phiRad = state.latDeg * D2R;
  const deltaRad = state.decDeg * D2R;

  // หมุนกรอบศูนย์สูตรตามละติจูด
  celestialGroup.rotation.x = -(Math.PI / 2 - phiRad);

  // วาดวงกลมทางเดินประจำวัน (Diurnal circle)
  const rParallel = R * Math.cos(deltaRad);
  const yParallel = R * Math.sin(deltaRad);

  const diurnalPts = [];
  for (let i = 0; i <= 96; i++) {
    const ang = (i / 96) * Math.PI * 2;
    diurnalPts.push(new THREE.Vector3(Math.cos(ang) * rParallel, yParallel, Math.sin(ang) * rParallel));
  }
  diurnalLine.geometry.setFromPoints(diurnalPts);

  // ตำแหน่งของดาวตามมุมชั่วโมง H (บวก 0 ถึง 24 ชั่วโมง หรือ 0° ถึง 360°)
  state.haHours = ((state.haHours % 24) + 24) % 24;
  state.haDeg = state.haHours * 15;
  const haRad = state.haDeg * D2R;
  const starX = -rParallel * Math.sin(haRad);
  const starY = yParallel;
  const starZ = rParallel * Math.cos(haRad);
  starGroup.position.set(starX, starY, starZ);

  // คำนวณสภาวะขึ้น-ตก
  const riseSet = calculateRiseSet(state.decDeg, state.latDeg, 0);

  // คำนวณและวาดเส้นมุมชั่วโมง (Hour Angle Arc & Hour Circle)
  const haSteps = 48;
  const haArcPts = [];
  const haStep = haRad / haSteps;
  for (let i = 0; i <= haSteps; i++) {
    const a = haStep * i;
    haArcPts.push(new THREE.Vector3(-R * Math.sin(a), 0, R * Math.cos(a)));
  }
  hourArcLine.geometry.dispose();
  hourArcLine.geometry = new THREE.BufferGeometry().setFromPoints(haArcPts);

  // วงกลมชั่วโมงผ่านดาว จาก NCP ไปยัง SCP ผ่านมุมชั่วโมง H เดียวกัน
  const hcPts = [];
  for (let i = 0; i <= 64; i++) {
    const ang = -Math.PI / 2 + (i / 64) * Math.PI;
    hcPts.push(new THREE.Vector3(-R * Math.cos(ang) * Math.sin(haRad), R * Math.sin(ang), R * Math.cos(ang) * Math.cos(haRad)));
  }
  hourCircleLine.geometry.dispose();
  hourCircleLine.geometry = new THREE.BufferGeometry().setFromPoints(hcPts);
  hourCircleLine.computeLineDistances();

  // ป้ายข้อความระบุมุมชั่วโมง H (แสดงเฉพาะค่าบวก 0 ถึง 24 ชม. และอยู่ติดกับจุดดาวโดยตรง)
  lblHourAngle.position.set(starX * 1.10, starY * 1.10 + 4, starZ * 1.10);
  const hText = `H = ${state.haHours.toFixed(2)}h (${state.haDeg.toFixed(1)}°)`;
  lblHourAngle.setText(hText);

  // ปรับการมองเห็นมุมชั่วโมง
  const showHA = dom.chkShowHourAngle.checked;
  hourCircleLine.visible = showHA;
  hourArcLine.visible = showHA;
  lblHourAngle.visible = showHA;

  // คำนวณมุมเงยสูงสุด: h_max = 90° - |φ - δ|
  const maxAlt = 90 - Math.abs(state.latDeg - state.decDeg);

  // อัปเดตจุดตัดขึ้น-ตก 3 มิติ
  if (riseSet.canRiseSet && dom.chkShowRisePoints.checked) {
    riseMarker.visible = true;
    setMarker.visible = true;
    lblRise.visible = true;
    lblSet.visible = true;

    // คำนวณพิกัดขอบฟ้า (X=East, Z=South)
    // A_rise วัดจากทิศเหนือ (Z = -R) ตามเข็ม
    const Arad = riseSet.riseAzDeg * D2R;
    const xRise = R * Math.sin(Arad);
    const zRise = -R * Math.cos(Arad);
    riseMarker.position.set(xRise, 0, zRise);
    lblRise.position.set(xRise * 1.12, 4, zRise * 1.12);

    const AsRad = riseSet.setAzDeg * D2R;
    const xSet = R * Math.sin(AsRad);
    const zSet = -R * Math.cos(AsRad);
    setMarker.position.set(xSet, 0, zSet);
    lblSet.position.set(xSet * 1.12, 4, zSet * 1.12);
  } else {
    riseMarker.visible = false;
    setMarker.visible = false;
    lblRise.visible = false;
    lblSet.visible = false;
  }

  // แสงสนธยา 3 ระดับ
  function calcTwilight(altH) {
    const sinH = Math.sin(altH * D2R);
    const cosH = (sinH - Math.sin(phiRad) * Math.sin(deltaRad)) / (Math.cos(phiRad) * Math.cos(deltaRad));
    if (cosH < -1 || cosH > 1) return { possible: false, Hdeg: 0, durMin: 0 };
    const hDeg = Math.acos(cosH) / D2R;
    const durDeg = riseSet.canRiseSet ? Math.max(0, hDeg - riseSet.H0Deg) : 0;
    const durMin = Math.round((durDeg / 15) * 60);
    return { possible: true, Hdeg: hDeg, durMin };
  }

  const twilCivil = calcTwilight(-6);
  const twilNaut = calcTwilight(-12);
  const twilAstro = calcTwilight(-18);

  // อัปเดต UI
  dom.valRiseLat.textContent = `${Math.abs(state.latDeg).toFixed(1)}° ${state.latDeg >= 0 ? "N" : "S"}`;
  dom.valRiseDec.textContent = `${state.decDeg >= 0 ? "+" : ""}${state.decDeg.toFixed(1)}°`;
  let haRemark = "";
  if (state.haHours < 0.08 || state.haHours > 23.92) haRemark = " — เมริเดียนบน";
  else if (Math.abs(state.haHours - 12) < 0.08) haRemark = " — เมริเดียนล่าง";
  dom.valRiseHA.textContent = `${state.haHours.toFixed(2)} ชม. (${state.haDeg.toFixed(1)}°${haRemark})`;

  dom.resCosH0.textContent = riseSet.cosH0.toFixed(4);
  dom.resMaxAlt.textContent = `${maxAlt.toFixed(2)}°`;

  if (riseSet.type === "circumpolar") {
    dom.riseClassBadge.textContent = "ดาวรอบขั้ว (Circumpolar — ไม่ตก)";
    dom.riseClassBadge.style.background = "#ffd166";
    dom.riseClassBadge.style.color = "#111";
    dom.riseClassDesc.textContent = "cos H₀ < −1 เดคลิเนชัน δ ≥ 90° − φ ดาวหมุนวนอยู่เหนือขอบฟ้าตลอด 24 ชั่วโมง";
    dom.resH0.textContent = "ไม่มีจุดตก (H₀ = 180°)";
    dom.resDayTime.textContent = "24 ชม. 00 นาที (อยู่เหนือขอบฟ้าตลอดเวลา)";
    dom.resRiseAz.textContent = "ไม่มีจุดขึ้นขอบฟ้า";
    dom.resSetAz.textContent = "ไม่มีจุดตกขอบฟ้า";
  } else if (riseSet.type === "never_rise") {
    dom.riseClassBadge.textContent = "ดาวไม่ขึ้น (Never-Rise)";
    dom.riseClassBadge.style.background = "#b5838d";
    dom.riseClassBadge.style.color = "#fff";
    dom.riseClassDesc.textContent = "cos H₀ > +1 เดคลิเนชัน δ ≤ −(90° − φ) ดาวหมุนวนอยู่ใต้ระนาบขอบฟ้าตลอดเวลา";
    dom.resH0.textContent = "ไม่มีจุดขึ้น (H₀ = 0°)";
    dom.resDayTime.textContent = "0 ชม. 00 นาที (อยู่ใต้ขอบฟ้าตลอดเวลา)";
    dom.resRiseAz.textContent = "ไม่มีจุดขึ้นขอบฟ้า";
    dom.resSetAz.textContent = "ไม่มีจุดตกขอบฟ้า";
  } else {
    dom.riseClassBadge.textContent = "ขึ้นและตกตามปกติ (Rise-Set)";
    dom.riseClassBadge.style.background = "#52b788";
    dom.riseClassBadge.style.color = "#111";
    dom.riseClassDesc.textContent = "|cos H₀| ≤ 1 ทางเดินประจำวันตัดระนาบขอบฟ้า มีเวลาขึ้นและตกที่คำนวณได้แน่นอน";
    dom.resH0.textContent = `${riseSet.H0Deg.toFixed(2)}° (${riseSet.H0Hours.toFixed(2)} ชม.)`;
    const dH = Math.floor(riseSet.dayLengthHours);
    const dM = Math.round((riseSet.dayLengthHours - dH) * 60);
    dom.resDayTime.textContent = `${dH} ชม. ${String(dM).padStart(2, "0")} นาที`;
    dom.resRiseAz.textContent = `${riseSet.riseAzDeg.toFixed(1)}° (${riseSet.riseAzDeg < 90 ? "ตะวันออกเฉียงเหนือ" : "ตะวันออกเฉียงใต้"})`;
    dom.resSetAz.textContent = `${riseSet.setAzDeg.toFixed(1)}° (${riseSet.setAzDeg < 270 ? "ตะวันตกเฉียงใต้" : "ตะวันตกเฉียงเหนือ"})`;
  }

  // อัปเดตตารางแสงสนธยา
  dom.resTwilCivilH.textContent = twilCivil.possible ? `${twilCivil.Hdeg.toFixed(1)}°` : "ไม่สิ้นสุด";
  dom.resTwilCivilDur.textContent = twilCivil.possible ? `~${twilCivil.durMin} นาที` : "แสงสนธยาตลอดคืน";

  dom.resTwilNautH.textContent = twilNaut.possible ? `${twilNaut.Hdeg.toFixed(1)}°` : "ไม่สิ้นสุด";
  dom.resTwilNautDur.textContent = twilNaut.possible ? `~${twilNaut.durMin} นาที` : "แสงสนธยาตลอดคืน";

  dom.resTwilAstroH.textContent = twilAstro.possible ? `${twilAstro.Hdeg.toFixed(1)}°` : "ไม่สิ้นสุด";
  dom.resTwilAstroDur.textContent = twilAstro.possible ? `~${twilAstro.durMin} นาที` : "แสงสนธยาตลอดคืน";

  // การมองเห็น
  twilightGroup.visible = dom.chkShowTwilight.checked;
  eqLine.visible = dom.chkShowEquator.checked;
  diurnalLine.visible = dom.chkShowDiurnal.checked;
  horizonGroup.visible = dom.chkShowHorizon.checked;
  sphereMesh.visible = dom.chkShowGrid.checked;
}

// ---------------- Event Listeners ----------------
dom.riseLat.addEventListener("input", (e) => {
  state.latDeg = parseFloat(e.target.value);
  updateSimulation();
});

dom.riseDec.addEventListener("input", (e) => {
  state.decDeg = parseFloat(e.target.value);
  updateSimulation();
});

dom.riseHA.addEventListener("input", (e) => {
  state.haHours = parseFloat(e.target.value);
  state.haDeg = state.haHours * 15;
  updateSimulation();
});

// ชิปวัตถุตัวอย่าง
dom.chipSunEquinox.addEventListener("click", () => {
  state.decDeg = 0;
  dom.riseDec.value = 0;
  updateSimulation();
});

dom.chipSunSummer.addEventListener("click", () => {
  state.decDeg = 23.44;
  dom.riseDec.value = 23.44;
  updateSimulation();
});

dom.chipSunWinter.addEventListener("click", () => {
  state.decDeg = -23.44;
  dom.riseDec.value = -23.44;
  updateSimulation();
});

dom.chipVega.addEventListener("click", () => {
  state.decDeg = 38.78;
  dom.riseDec.value = 38.78;
  updateSimulation();
});

dom.chipSirius.addEventListener("click", () => {
  state.decDeg = -16.72;
  dom.riseDec.value = -16.72;
  updateSimulation();
});

// ชิปละติจูด
document.querySelectorAll("[data-lat]").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.latDeg = parseFloat(btn.dataset.lat);
    dom.riseLat.value = state.latDeg;
    updateSimulation();
  });
});

// เช็คบ็อกซ์
[dom.chkShowTwilight, dom.chkShowRisePoints, dom.chkShowEquator, dom.chkShowDiurnal, dom.chkShowHourAngle, dom.chkShowHorizon, dom.chkShowGrid].forEach((chk) => {
  chk.addEventListener("change", updateSimulation);
});

// เล่นแอนิเมชันการหมุนประจำวัน
dom.btnPlayOrbit.addEventListener("click", () => {
  state.isPlaying = !state.isPlaying;
  dom.playOrbitIcon.textContent = state.isPlaying ? "⏸" : "▶";
  dom.btnPlayOrbit.classList.toggle("primary", !state.isPlaying);
});

// มุมมองกล้อง
dom.btnResetView.addEventListener("click", () => {
  camState.radius = 285;
  camState.theta = 50 * D2R;
  camState.phi = 65 * D2R;
  camState.target.set(0, 0, 0);
  updateCameraPosition();
});

dom.btnViewEast.addEventListener("click", () => {
  camState.radius = 270;
  camState.theta = 90 * D2R;
  camState.phi = 80 * D2R;
  updateCameraPosition();
});

dom.btnViewMeridian.addEventListener("click", () => {
  camState.radius = 270;
  camState.theta = 0;
  camState.phi = 80 * D2R;
  updateCameraPosition();
});

dom.btnViewZenith.addEventListener("click", () => {
  camState.radius = 270;
  camState.theta = 0;
  camState.phi = 0.05;
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

  if (state.isPlaying) {
    state.haHours += dt * 1.5; // เดินเวลา 1.5 ชม./วินาที
    if (state.haHours >= 24) state.haHours -= 24;
    state.haDeg = state.haHours * 15;
    dom.riseHA.value = state.haHours.toFixed(1);
    updateSimulation();
  }

  renderer.render(scene, camera);
}

// เริ่มต้นระบบ
updateCameraPosition();
updateSimulation();
requestAnimationFrame(animate);
