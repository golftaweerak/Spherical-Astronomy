/**
 * แบบจำลองดาวรอบขั้วและการขึ้นตกตามละติจูด (Circumpolar Stars & Star Classifications)
 * สอวน. ดาราศาสตร์ ค่าย 1 (อ้างอิง: 2. spherical_astronomy_and_time_corrected.tex)
 */

import * as THREE from 'three';
import { D2R, pad2, degToDMS } from './astro-math.js';

/* =====================================================================
   ส่วนที่ 1 — ฉาก Three.js
   ระบบพิกัด: x = ตะวันออก (E), y = ขึ้น (Zenith), z = −เหนือ (N)
   ===================================================================== */
const R = 100;
const stage = document.getElementById('stage');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 1, 1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

const DEFAULT_CAM = { theta: Math.PI * 0.72, phi: Math.PI * 0.36, radius: 295 };
const camState = { theta: DEFAULT_CAM.theta, phi: DEFAULT_CAM.phi, radius: DEFAULT_CAM.radius, minRadius: 150 };

function applyCamera() {
  camState.phi = Math.max(0.06, Math.min(Math.PI - 0.06, camState.phi));
  camState.radius = Math.max(camState.minRadius, Math.min(850, camState.radius));
  camera.position.set(
    camState.radius * Math.sin(camState.phi) * Math.cos(camState.theta),
    camState.radius * Math.cos(camState.phi),
    camState.radius * Math.sin(camState.phi) * Math.sin(camState.theta)
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
}
applyCamera();

// ตัวช่วยสร้าง Sprite ป้ายข้อความ
const allLabels = [];
let labelsVisible = true;

function getLabelScaleMultiplier() {
  const w = (typeof stage !== 'undefined' && stage && stage.clientWidth) ? stage.clientWidth : window.innerWidth;
  if (w <= 480) return 1.45;
  if (w <= 768) return 1.28;
  if (w <= 1024) return 1.12;
  return 1.0;
}

function makeLabel(text, color = '#e9ecf5', bg = 'rgba(8,12,28,0.92)', scale = 6.8) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const fs = 54;
  ctx.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  const pad = 26;
  c.width = Math.max(32, Math.ceil(ctx.measureText(text).width + pad * 2));
  c.height = fs + pad;

  const ctx2 = c.getContext('2d');
  ctx2.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  ctx2.fillStyle = bg;
  ctx2.beginPath();
  if (ctx2.roundRect) ctx2.roundRect(0, 0, c.width, c.height, 16);
  else ctx2.rect(0, 0, c.width, c.height);
  ctx2.fill();

  ctx2.lineWidth = 3;
  ctx2.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx2.stroke();

  ctx2.fillStyle = color;
  ctx2.textBaseline = 'middle';
  ctx2.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx2.shadowBlur = 4;
  ctx2.fillText(text, pad, c.height / 2 + 1);
  ctx2.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(c);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  
  const mult = getLabelScaleMultiplier();
  const aspect = c.width / c.height;
  sprite.scale.set(aspect * scale * mult, scale * mult, 1);
  sprite.userData = { canvas: c, scale, aspect, baseColor: color, baseBg: bg, fs, pad };
  allLabels.push(sprite);
  return sprite;
}

function updateLabel(sprite, text, color, bg) {
  const d = sprite.userData;
  const c = d.canvas;
  const fs = d.fs || 54;
  const pad = d.pad || 26;
  const ctx = c.getContext('2d');
  ctx.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  c.width = Math.max(32, Math.ceil(ctx.measureText(text).width + pad * 2));
  c.height = fs + pad;

  const ctx2 = c.getContext('2d');
  ctx2.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  ctx2.fillStyle = bg || d.baseBg;
  ctx2.beginPath();
  if (ctx2.roundRect) ctx2.roundRect(0, 0, c.width, c.height, 16);
  else ctx2.rect(0, 0, c.width, c.height);
  ctx2.fill();

  ctx2.lineWidth = 3;
  ctx2.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx2.stroke();

  ctx2.fillStyle = color || d.baseColor;
  ctx2.textBaseline = 'middle';
  ctx2.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx2.shadowBlur = 4;
  ctx2.fillText(text, pad, c.height / 2 + 1);
  ctx2.shadowBlur = 0;

  sprite.material.map.dispose();
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  sprite.material.map = tex;
  const mult = getLabelScaleMultiplier();
  d.aspect = c.width / c.height;
  sprite.scale.set(d.aspect * d.scale * mult, d.scale * mult, 1);
}

// -------------------------------------------------------------
// กลุ่มวัตถุ 3D
// -------------------------------------------------------------
const celestialGroup = new THREE.Group();
const horizonGroup = new THREE.Group();
const zonesGroup = new THREE.Group();
const starPathGroup = new THREE.Group();
scene.add(celestialGroup, horizonGroup, zonesGroup, starPathGroup);

// 1. ระนาบขอบฟ้า
const groundMesh = new THREE.Mesh(
  new THREE.CircleGeometry(R, 64),
  new THREE.MeshBasicMaterial({ color: 0x0a0f24, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
);
groundMesh.rotation.x = Math.PI / 2;
const horizonCircle = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      return new THREE.Vector3(R * Math.sin(a), 0, R * Math.cos(a));
    })
  ),
  new THREE.LineBasicMaterial({ color: 0x7dd6a8, linewidth: 2 })
);
horizonGroup.add(groundMesh, horizonCircle);

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

// 0. โครงสร้างทรงกลมท้องฟ้าและเส้นรอบวงเมริเดียน (Celestial Sphere Outline & Meridian)
const sphereWire = new THREE.Mesh(
  new THREE.SphereGeometry(R, 36, 18),
  new THREE.MeshBasicMaterial({ color: 0x223055, wireframe: true, transparent: true, opacity: 0.15 })
);
horizonGroup.add(sphereWire);

// เส้นรอบวงเมริเดียนท้องฟ้า (Celestial Meridian Circle: ผ่าน เหนือ N - จอมฟ้า Z - ใต้ S - จุดดิ่ง Nadir ครบ 360°)
const meridianPts = [];
for (let i = 0; i <= 128; i++) {
  const a = (i / 128) * Math.PI * 2;
  // X = 0 (ระนาบเมริเดียนท้องถิ่น), Y = R*cos(a), Z = R*sin(a)
  meridianPts.push(new THREE.Vector3(0, R * Math.cos(a), R * Math.sin(a)));
}
const meridianCircle = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(meridianPts),
  new THREE.LineBasicMaterial({ color: 0x8ecae6, linewidth: 2, transparent: true, opacity: 0.85 })
);
horizonGroup.add(meridianCircle);

// จุดจอมฟ้า (Zenith, Z) และ จุดดิ่ง (Nadir)
const zenithMarker = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xaab4cf })
);
zenithMarker.position.set(0, R, 0);
const labelZ = makeLabel('จุดจอมฟ้า (Zenith, Z)', '#cfd9f0', 'rgba(12,18,32,0.85)', 5.5);
labelZ.position.set(0, R * 1.08, 0);

const nadirMarker = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0x64748b })
);
nadirMarker.position.set(0, -R, 0);
const labelNadir = makeLabel('จุดดิ่ง (Nadir)', '#94a3b8', 'rgba(12,18,32,0.85)', 4.8);
labelNadir.position.set(0, -R * 1.08, 0);

horizonGroup.add(zenithMarker, labelZ, nadirMarker, labelNadir);

const labelN = makeLabel('ทิศเหนือ N', '#7dd6a8', 'rgba(10,25,18,0.85)', 5.2);
labelN.position.set(0, 0, -R * 1.08);
const labelS = makeLabel('ทิศใต้ S', '#7dd6a8', 'rgba(10,25,18,0.85)', 5.2);
labelS.position.set(0, 0, R * 1.08);
const labelE = makeLabel('ทิศตะวันออก E', '#7dd6a8', 'rgba(10,25,18,0.85)', 5.2);
labelE.position.set(R * 1.08, 0, 0);
const labelW = makeLabel('ทิศตะวันตก W', '#7dd6a8', 'rgba(10,25,18,0.85)', 5.2);
labelW.position.set(-R * 1.08, 0, 0);
horizonGroup.add(labelN, labelS, labelE, labelW);

// 2. แกนหมุนโลก NCP - SCP
const axisGeo = new THREE.BufferGeometry();
const axisMat = new THREE.LineDashedMaterial({ color: 0xf87171, dashSize: 4, gapSize: 3, linewidth: 2 });
const polarAxis = new THREE.Line(axisGeo, axisMat);
celestialGroup.add(polarAxis);

const ncpLabel = makeLabel('NCP (ขั้วฟ้าเหนือ)', '#f87171', 'rgba(30,10,10,0.9)', 6.0);
const scpLabel = makeLabel('SCP (ขั้วฟ้าใต้)', '#818cf8', 'rgba(15,10,35,0.9)', 6.0);
celestialGroup.add(ncpLabel, scpLabel);

// เส้นศูนย์สูตรฟ้า (Celestial Equator)
const ceGeo = new THREE.BufferGeometry();
const ceMat = new THREE.LineBasicMaterial({ color: 0x6ea8e8, linewidth: 2 });
const ceLine = new THREE.LineLoop(ceGeo, ceMat);
const ceLabel = makeLabel('เส้นศูนย์สูตรฟ้า (CE)', '#6ea8e8', 'rgba(10,20,40,0.88)', 5.8);
celestialGroup.add(ceLine, ceLabel);

// 3. โซนดาวรอบขั้ว (Circumpolar Cap) & โซนดาวไม่เคยขึ้น (Never-rise Cap)
let circMesh = null;
let neverMesh = null;

const circBorderLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 }));
const neverBorderLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 }));
zonesGroup.add(circBorderLine, neverBorderLine);

// 4. เส้นทางเดินประจำวันของดาวเป้าหมาย (Target Diurnal Circle)
const diurnalGeo = new THREE.BufferGeometry();
const diurnalMat = new THREE.LineBasicMaterial({ color: 0xf2c14e, linewidth: 2.5 });
const diurnalLine = new THREE.LineLoop(diurnalGeo, diurnalMat);

const starMesh = new THREE.Mesh(
  new THREE.SphereGeometry(2.8, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xf2c14e })
);
const starGlow = new THREE.Mesh(
  new THREE.SphereGeometry(5.6, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.35, depthWrite: false })
);
starMesh.add(starGlow);

const starLabel = makeLabel('ดาวเป้าหมาย', '#f2c14e', 'rgba(30,24,10,0.9)', 6.2);
starPathGroup.add(diurnalLine, starMesh, starLabel);

// ทะเลดาว
(() => {
  const n = 600;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = R * 2.3, s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(th);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x9fb0d8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.35, depthWrite: false,
  })));
})();

/* =====================================================================
   ส่วนที่ 2 — ตัวคำนวณและวาดทรงกลม (Math & Zone Mesh Builder)
   ===================================================================== */

/** สร้าง Mesh สำหรับ Spherical Cap (กรวยตัดบนผิวทรงกลม) */
function createSphericalCapMesh(centerAxis, capAngleRad, color, opacity = 0.22) {
  const capAngle = Math.max(0.001, Math.min(Math.PI - 0.001, capAngleRad));
  const geo = new THREE.SphereGeometry(R * 0.996, 48, 24, 0, Math.PI * 2, 0, capAngle);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // หมุนแกน Z ของ Sphere ไปตาม centerAxis
  const defaultDir = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(defaultDir, centerAxis.clone().normalize());
  mesh.quaternion.copy(q);
  return mesh;
}

/** คำนวณจุดบนขอบเขตวงกลมเล็กบนผิวทรงกลม */
function smallCirclePoints(centerAxis, angleRad, steps = 64, radius = R) {
  const uCenter = centerAxis.clone().normalize();
  let perp = new THREE.Vector3(1, 0, 0);
  if (Math.abs(uCenter.dot(perp)) > 0.9) perp.set(0, 0, 1);
  const u1 = new THREE.Vector3().crossVectors(uCenter, perp).normalize();
  const u2 = new THREE.Vector3().crossVectors(uCenter, u1).normalize();

  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const pts = [];

  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const p = new THREE.Vector3()
      .addScaledVector(uCenter, cosA)
      .addScaledVector(u1, sinA * Math.cos(t))
      .addScaledVector(u2, sinA * Math.sin(t))
      .multiplyScalar(radius);
    pts.push(p);
  }
  return pts;
}

/* =====================================================================
   ส่วนที่ 3 — ผูก UI และคำนวณวิเคราะห์
   ===================================================================== */
const $ = (id) => document.getElementById(id);

const circLat = $('circLat');
const circDec = $('circDec');
const valCircLat = $('valCircLat');
const valCircDec = $('valCircDec');
const starSelector = $('starSelector');

const classCard = $('classCard');
const classBadge = $('classBadge');
const classDesc = $('classDesc');

const circThresholdVal = $('circThresholdVal');
const neverThresholdVal = $('neverThresholdVal');
const hMaxVal = $('hMaxVal');
const hMinVal = $('hMinVal');

let animTimeSec = 0;
let isRotating = false;

function updateCircumpolarSim() {
  const phi = parseFloat(circLat.value);
  const dec = parseFloat(circDec.value);

  valCircLat.textContent = `${phi >= 0 ? '+' : ''}${phi.toFixed(1)}° (${phi >= 0 ? 'ฟ้าเหนือ' : 'ฟ้าใต้'})`;
  valCircDec.textContent = `${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°`;

  const phiRad = phi * D2R;
  const decRad = dec * D2R;

  // 1. ทิศทางของแกนหมุนโลก NCP (Elevated by phi from North)
  // ในกรอบ x=E, y=U, z=-N:
  const ncpDir = new THREE.Vector3(0, Math.sin(phiRad), -Math.cos(phiRad)).normalize();
  const scpDir = ncpDir.clone().negate();

  const posNcp = ncpDir.clone().multiplyScalar(R * 1.05);
  const posScp = scpDir.clone().multiplyScalar(R * 1.05);

  polarAxis.geometry.setFromPoints([posScp, posNcp]);
  polarAxis.computeLineDistances();

  ncpLabel.position.copy(posNcp.clone().multiplyScalar(1.08));
  scpLabel.position.copy(posScp.clone().multiplyScalar(1.08));

  // 2. วงกลมศูนย์สูตรฟ้า (Celestial Equator: ตั้งฉากกับ ncpDir)
  const cePts = smallCirclePoints(ncpDir, Math.PI / 2, 64, R);
  ceLine.geometry.setFromPoints(cePts);
  // ป้าย CE วางที่จุดตัดกับเส้นเมริเดียน
  // จุดตัดเมริเดียนของ CE อยู่ที่ Alt = 90 - |phi|
  const ceMidN = -Math.sin(phiRad);
  const ceMidU = Math.cos(phiRad);
  ceLabel.position.set(0, ceMidU * R * 1.08, -ceMidN * R * 1.08);

  // 3. โซนดาวรอบขั้วและดาวไม่เคยขึ้น
  const absPhi = Math.abs(phi);
  const capAngleRad = absPhi * D2R; // รัศมีเชิงมุมของกรวยดาวรอบขั้ว = ละติจูด

  if (circMesh) { zonesGroup.remove(circMesh); circMesh.geometry.dispose(); }
  if (neverMesh) { zonesGroup.remove(neverMesh); neverMesh.geometry.dispose(); }

  if (absPhi > 0.5) {
    // ซีกเหนือ: ขั้วเหนือ NCP เป็นศูนย์กลางดาวรอบขั้ว
    // ซีกใต้: ขั้วใต้ SCP เป็นศูนย์กลางดาวรอบขั้ว
    const circCenter = phi >= 0 ? ncpDir : scpDir;
    const neverCenter = phi >= 0 ? scpDir : ncpDir;

    circMesh = createSphericalCapMesh(circCenter, capAngleRad, 0xf59e0b, 0.22);
    neverMesh = createSphericalCapMesh(neverCenter, capAngleRad, 0x8b5cf6, 0.22);
    zonesGroup.add(circMesh, neverMesh);

    circBorderLine.geometry.setFromPoints(smallCirclePoints(circCenter, capAngleRad, 64, R * 0.998));
    neverBorderLine.geometry.setFromPoints(smallCirclePoints(neverCenter, capAngleRad, 64, R * 0.998));
    circBorderLine.visible = true;
    neverBorderLine.visible = true;
  } else {
    circBorderLine.visible = false;
    neverBorderLine.visible = false;
  }

  // 4. วงทางเดินประจำวันของดาว (Diurnal Circle)
  // เดคลิเนชัน δ มีระยะห่างเชิงมุมจาก NCP = 90° - δ
  const polarDistRad = (90 - dec) * D2R;
  const diurnalPts = smallCirclePoints(ncpDir, polarDistRad, 64, R);
  diurnalLine.geometry.setFromPoints(diurnalPts);

  // ตำแหน่งของดาว ณ มุมเวลา animTimeSec
  const haRad = animTimeSec * 15 * D2R;
  const E = -Math.cos(decRad) * Math.sin(haRad);
  const N = Math.sin(decRad) * Math.cos(phiRad) - Math.cos(decRad) * Math.cos(haRad) * Math.sin(phiRad);
  const U = Math.sin(decRad) * Math.sin(phiRad) + Math.cos(decRad) * Math.cos(haRad) * Math.cos(phiRad);

  const starPos = new THREE.Vector3(E * R, U * R, -N * R);
  starMesh.position.copy(starPos);
  starLabel.position.copy(starPos.clone().multiplyScalar(1.12));

  // 5. การจำแนกประเภท (Classification Logic)
  const circLimit = 90 - absPhi;
  let starType = 'rise-set';

  if (phi >= 0) {
    if (dec > circLimit) starType = 'circumpolar';
    else if (dec < -circLimit) starType = 'never-rise';
    circThresholdVal.textContent = `δ > +${circLimit.toFixed(1)}°`;
    neverThresholdVal.textContent = `δ < −${circLimit.toFixed(1)}°`;
  } else {
    if (dec < -circLimit) starType = 'circumpolar';
    else if (dec > circLimit) starType = 'never-rise';
    circThresholdVal.textContent = `δ < −${circLimit.toFixed(1)}° (ขั้วใต้)`;
    neverThresholdVal.textContent = `δ > +${circLimit.toFixed(1)}° (ขั้วใต้)`;
  }

  // มุมเงยสูงสุดและต่ำสุด
  const hMax = 90 - Math.abs(phi - dec);
  // มุมเงยต่ำสุด (Lower Culmination)
  const hMin = (phi >= 0) ? (phi + dec - 90) : (-phi - dec - 90);

  hMaxVal.textContent = `${hMax >= 0 ? '+' : ''}${hMax.toFixed(1)}°`;
  hMinVal.textContent = `${hMin >= 0 ? '+' : ''}${hMin.toFixed(1)}°`;

  if (starType === 'circumpolar') {
    classBadge.className = 'class-badge badge-circ';
    classBadge.textContent = '🟡 ดาวไม่ตกขอบฟ้า (Circumpolar Star)';
    classDesc.textContent = `ดาวดวงนี้อยู่ภายในโซนรอบขั้วฟ้า หมุนวนอยู่เหนือขอบฟ้าตลอด 24 ชั่วโมง โดยมีมุมเงยต่ำสุดขณะผ่านเมริเดียนล่าง h_min = ${hMin.toFixed(1)}° ซึ่งสูงกว่าระนาบขอบฟ้า (ไม่เคยตกลับขอบฟ้า)`;
    starMesh.material.color.setHex(0xf59e0b);
    starGlow.material.color.setHex(0xf59e0b);
  } else if (starType === 'never-rise') {
    classBadge.className = 'class-badge badge-never';
    classBadge.textContent = '🟣 ดาวไม่เคยโผล่พ้นขอบฟ้า (Never-rise Star)';
    classDesc.textContent = `ดาวดวงนี้อยู่ภายในโซนไม่เคยขึ้น อยู่ใต้ระนาบขอบฟ้าตลอดเวลา โดยมีมุมเงยสูงสุดขณะผ่านเมริเดียน h_max = ${hMax.toFixed(1)}° ซึ่งยังคงอยู่ต่ำกว่าขอบฟ้า ผู้สังเกตที่ละติจูดนี้จึงมองไม่เห็นดาวดวงนี้เลย`;
    starMesh.material.color.setHex(0x8b5cf6);
    starGlow.material.color.setHex(0x8b5cf6);
  } else {
    classBadge.className = 'class-badge badge-riseset';
    classBadge.textContent = '🟢 ดาวขึ้นและตกตามปกติ (Rise-Set Star)';
    classDesc.textContent = `ทางเดินประจำวันของดาวตัดผ่านระนาบขอบฟ้า มีช่วงเวลาโผล่พ้นขอบฟ้า (กลางวัน/มองเห็น) ขึ้นสู่จุดสูงสุดที่มุมเงย h_max = ${hMax.toFixed(1)}° และมีช่วงเวลาตกลับใต้ขอบฟ้า (กลางคืน/ลับขอบฟ้า)`;
    starMesh.material.color.setHex(0x34d399);
    starGlow.material.color.setHex(0x34d399);
  }
}

/* =====================================================================
   ส่วนที่ 4 — ผูกเหตุการณ์และแอนิเมชัน
   ===================================================================== */
circLat.addEventListener('input', updateCircumpolarSim);
circDec.addEventListener('input', () => {
  starSelector.value = 'custom';
  updateCircumpolarSim();
});

document.querySelectorAll('.chip[data-lat]').forEach((chip) => {
  chip.addEventListener('click', () => {
    circLat.value = chip.dataset.lat;
    updateCircumpolarSim();
  });
});

starSelector.addEventListener('change', () => {
  const v = starSelector.value;
  if (v === 'polaris') circDec.value = 89.3;
  else if (v === 'dubhe') circDec.value = 61.8;
  else if (v === 'vega') circDec.value = 38.8;
  else if (v === 'sirius') circDec.value = -16.7;
  else if (v === 'canopus') circDec.value = -52.7;
  else if (v === 'crux') circDec.value = -63.1;
  updateCircumpolarSim();
});

// แอนิเมชันหมุนดาว
const btnPlayRotation = $('btnPlayRotation');
const playRotIcon = $('playRotIcon');
const playRotText = $('playRotText');

if (btnPlayRotation) {
  btnPlayRotation.addEventListener('click', () => {
    isRotating = !isRotating;
    btnPlayRotation.classList.toggle('playing', isRotating);
    playRotIcon.textContent = isRotating ? '⏸' : '▶';
    playRotText.textContent = isRotating ? 'หยุดชั่วคราว' : 'หมุนจำลอง';
  });
}

// แถบเครื่องมือ 3D
const toggleCircZoneBtn = $('toggleCircZone');
const toggleNeverZoneBtn = $('toggleNeverZone');
const toggleGroundBtn = $('toggleGround');
const toggleLabelsBtn = $('toggleLabels');
const btnResetView = $('btnResetView');

let showCircZone = true;
let showNeverZone = true;
let showGround = true;

if (toggleCircZoneBtn) {
  toggleCircZoneBtn.addEventListener('click', () => {
    showCircZone = !showCircZone;
    if (circMesh) circMesh.visible = showCircZone;
    circBorderLine.visible = showCircZone;
    toggleCircZoneBtn.classList.toggle('active-amber', showCircZone);
  });
}

if (toggleNeverZoneBtn) {
  toggleNeverZoneBtn.addEventListener('click', () => {
    showNeverZone = !showNeverZone;
    if (neverMesh) neverMesh.visible = showNeverZone;
    neverBorderLine.visible = showNeverZone;
    toggleNeverZoneBtn.classList.toggle('active-blue', showNeverZone);
  });
}

if (toggleGroundBtn) {
  toggleGroundBtn.addEventListener('click', () => {
    showGround = !showGround;
    horizonGroup.visible = showGround;
    toggleGroundBtn.classList.toggle('active-green', showGround);
  });
}

if (toggleLabelsBtn) {
  toggleLabelsBtn.addEventListener('click', () => {
    labelsVisible = !labelsVisible;
    allLabels.forEach((lbl) => { lbl.visible = labelsVisible; });
    toggleLabelsBtn.classList.toggle('active', labelsVisible);
  });
}

function doResetCameraView() {
  camState.theta = DEFAULT_CAM.theta;
  camState.phi = DEFAULT_CAM.phi;
  camState.radius = DEFAULT_CAM.radius;
  applyCamera();
}

if (btnResetView) {
  btnResetView.addEventListener('click', doResetCameraView);
}
const btnResetViewDesktop = $('btnResetViewDesktop');
if (btnResetViewDesktop) {
  btnResetViewDesktop.addEventListener('click', doResetCameraView);
}

/* ---- ควบคุม Dropdown / Popover บนหน้าจอมือถือ (แสดง/ซ่อนองค์ประกอบ และ สัญลักษณ์สี) ---- */
const btnToggleLayersMenu = $('btnToggleLayersMenu');
const btnToggleLegendMenu = $('btnToggleLegendMenu');
const stageToolbarLayers = $('stageToolbarLayers');
const stageLegend = $('stageLegend');

function closeAllPopovers() {
  if (stageToolbarLayers) stageToolbarLayers.classList.remove('open-popover');
  if (stageLegend) stageLegend.classList.remove('open-popover');
  if (btnToggleLayersMenu) {
    btnToggleLayersMenu.classList.remove('active');
    btnToggleLayersMenu.setAttribute('aria-expanded', 'false');
  }
  if (btnToggleLegendMenu) {
    btnToggleLegendMenu.classList.remove('active');
    btnToggleLegendMenu.setAttribute('aria-expanded', 'false');
  }
}

if (btnToggleLayersMenu && stageToolbarLayers) {
  btnToggleLayersMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = stageToolbarLayers.classList.contains('open-popover');
    closeAllPopovers();
    if (!isOpen) {
      stageToolbarLayers.classList.add('open-popover');
      btnToggleLayersMenu.classList.add('active');
      btnToggleLayersMenu.setAttribute('aria-expanded', 'true');
    }
  });
}

if (btnToggleLegendMenu && stageLegend) {
  btnToggleLegendMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = stageLegend.classList.contains('open-popover');
    closeAllPopovers();
    if (!isOpen) {
      stageLegend.classList.add('open-popover');
      btnToggleLegendMenu.classList.add('active');
      btnToggleLegendMenu.setAttribute('aria-expanded', 'true');
    }
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#stageToolbarLayers') && !e.target.closest('#stageLegend') &&
      !e.target.closest('.mobile-control-bar')) {
    closeAllPopovers();
  }
});

// ควบคุมเมนูลิ้นชักด้านข้าง (YouTube-Style Side Drawer)
const menuToggle = $('menuToggle');
const drawerClose = $('drawerClose');
const drawerBackdrop = $('drawerBackdrop');

function openDrawer() { document.body.classList.add('drawer-open'); }
function closeDrawer() { document.body.classList.remove('drawer-open'); }

if (menuToggle) menuToggle.addEventListener('click', openDrawer);
if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) {
    closeDrawer();
  }
});

// เมาส์และการหมุน
const pointers = new Map();
let pinchDist = null;
const el = renderer.domElement;

el.addEventListener('pointerdown', (e) => {
  try { el.setPointerCapture(e.pointerId); } catch (_) {}
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
  }
});

el.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (pointers.size === 1) {
    camState.theta += (e.clientX - p.x) * 0.0055;
    camState.phi   -= (e.clientY - p.y) * 0.0045;
    applyCamera();
  }
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2 && pinchDist !== null) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    camState.radius *= pinchDist / Math.max(d, 1);
    pinchDist = d;
    applyCamera();
  }
});

const endPointer = (e) => { pointers.delete(e.pointerId); pinchDist = null; };
el.addEventListener('pointerup', endPointer);
el.addEventListener('pointercancel', endPointer);
el.addEventListener('wheel', (e) => {
  e.preventDefault();
  camState.radius *= 1 + Math.sign(e.deltaY) * 0.08;
  applyCamera();
}, { passive: false });

function fitCameraToViewport() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  const vfov = camera.fov * D2R;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (w / h));
  const minFov = Math.min(vfov, hfov);
  camState.minRadius = R * 1.50 / Math.tan(minFov / 2);
  if (camState.radius < camState.minRadius) camState.radius = camState.minRadius;
  applyCamera();

  const mult = getLabelScaleMultiplier();
  for (const s of allLabels) {
    if (s && s.userData && s.userData.scale) {
      s.scale.set(s.userData.aspect * s.userData.scale * mult, s.userData.scale * mult, 1);
    }
  }
}
const ro = new ResizeObserver(() => {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fitCameraToViewport();
});
ro.observe(stage);

// สลับธีมสี สว่าง/มืด
(function () {
  const t = document.querySelector('[data-theme-toggle]');
  if (!t) return;
  let dark = true;
  document.documentElement.setAttribute('data-theme', 'dark');
  t.addEventListener('click', () => {
    dark = !dark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    groundMesh.material.color.setHex(dark ? 0x0a0f24 : 0x9fb0cf);
    groundMesh.material.opacity = dark ? 0.65 : 0.45;
  });
})();

// Animation Loop (หมุนจำลองเวลา)
let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  if (isRotating) {
    const dt = (now - lastTime) / 1000;
    animTimeSec += dt * 0.5; // หมุน 0.5 ชม. ต่อวินาที
    updateCircumpolarSim();
  }
  lastTime = now;
  renderer.render(scene, camera);
}

document.fonts.ready.then(() => {
  updateCircumpolarSim();
  animate();
});
setTimeout(() => {
  updateCircumpolarSim();
  animate();
}, 1000);
