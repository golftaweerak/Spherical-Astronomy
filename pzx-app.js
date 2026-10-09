/**
 * แบบจำลองสามเหลี่ยมดาราศาสตร์ PZX (The Astronomical Triangle Interactive Solver)
 * หลักสูตรค่าย 1 สอวน. ดาราศาสตร์ ม.ปลาย (อ้างอิง: 2. spherical_astronomy_and_time_corrected.tex)
 */

import * as THREE from 'three';
import {
  D2R,
  pad2,
  equatorialToHorizontal,
  horizontalToEquatorial,
  degToDMS,
  azToCompass,
} from './astro-math.js';

/* =====================================================================
   ส่วนที่ 1 — ฉาก Three.js และโมเดล 3D
   ระบบพิกัด: x = ตะวันออก (E), y = ขึ้น (Zenith), z = −เหนือ (N)
   ===================================================================== */
const R = 100;
const stage = document.getElementById('stage');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 1, 1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

// การควบคุมมุมกล้อง: มุมมองเฉียงสบายตา ไม่ล้นขอบจอ
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
  const w = window.innerWidth;
  if (w <= 480) return 1.45;
  if (w <= 768) return 1.28;
  return 1.0;
}

function makeLabel(text, color = '#e9ecf5', bg = 'rgba(8,12,28,0.92)', scale = 6.8) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const fs = 56;
  ctx.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  const pad = 26;
  c.width = Math.max(40, Math.ceil(ctx.measureText(text).width + pad * 2));
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
  ctx2.shadowBlur = 6;
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
  const fs = d.fs || 56;
  const pad = d.pad || 26;
  const ctx = c.getContext('2d');
  ctx.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  c.width = Math.max(40, Math.ceil(ctx.measureText(text).width + pad * 2));
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
  ctx2.shadowBlur = 6;
  ctx2.fillText(text, pad, c.height / 2 + 1);
  ctx2.shadowBlur = 0;

  sprite.material.map.dispose();
  const texture = new THREE.CanvasTexture(c);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  sprite.material.map = texture;
  d.aspect = c.width / c.height;
  const mult = getLabelScaleMultiplier();
  sprite.scale.set(d.aspect * d.scale * mult, d.scale * mult, 1);
}

// -------------------------------------------------------------
// โครงสร้างวัตถุ 3D ในฉาก
// -------------------------------------------------------------
const sphereGroup = new THREE.Group();
const horizonGroup = new THREE.Group();
const pzxTriangleGroup = new THREE.Group();
const greatCirclesGroup = new THREE.Group();
scene.add(sphereGroup, horizonGroup, pzxTriangleGroup, greatCirclesGroup);

// 1. โครงทรงกลมฟ้าโปร่งแสง
const sphereWire = new THREE.Mesh(
  new THREE.SphereGeometry(R, 36, 18),
  new THREE.MeshBasicMaterial({ color: 0x223055, wireframe: true, transparent: true, opacity: 0.18 })
);
sphereGroup.add(sphereWire);

// 2. ระนาบขอบฟ้า (Horizon Ground)
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

// ป้ายทิศหลัก 4 ทิศบนขอบฟ้า
const labelN = makeLabel('ทิศเหนือ N', '#7dd6a8', 'rgba(10,25,18,0.85)', 5.2);
labelN.position.set(0, 0, -R * 1.08);
const labelS = makeLabel('ทิศใต้ S', '#7dd6a8', 'rgba(10,25,18,0.85)', 5.2);
labelS.position.set(0, 0, R * 1.08);
const labelE = makeLabel('ทิศตะวันออก E', '#7dd6a8', 'rgba(10,25,18,0.85)', 5.2);
labelE.position.set(R * 1.08, 0, 0);
const labelW = makeLabel('ทิศตะวันตก W', '#7dd6a8', 'rgba(10,25,18,0.85)', 5.2);
labelW.position.set(-R * 1.08, 0, 0);
horizonGroup.add(labelN, labelS, labelE, labelW);

// 3. จุดยอดทั้งสามของสามเหลี่ยม PZX
function makeVertexMarker(color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 24, 24),
    new THREE.MeshBasicMaterial({ color })
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(4.8, 24, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })
  );
  mesh.add(glow);
  return mesh;
}

const markerP = makeVertexMarker(0xe86a6a); // ขั้วฟ้าเหนือ NCP
const markerZ = makeVertexMarker(0x7dd6a8); // จุดจอมฟ้า Zenith
const markerX = makeVertexMarker(0xf2c14e); // วัตถุท้องฟ้า Star

const labelP = makeLabel('P (NCP ขั้วฟ้าเหนือ)', '#f87171', 'rgba(30,10,10,0.9)', 6.2);
const labelZ = makeLabel('Z (Zenith จุดจอมฟ้า)', '#7dd6a8', 'rgba(10,30,20,0.9)', 6.2);
const labelX = makeLabel('X (Star ดาวเป้าหมาย)', '#f2c14e', 'rgba(30,24,10,0.9)', 6.2);

pzxTriangleGroup.add(markerP, markerZ, markerX, labelP, labelZ, labelX);

// 4. ด้านทั้งสามของสามเหลี่ยม (ส่วนโค้งวงกลมใหญ่ Spherical Arcs)
function makeArcLine(color, width = 3) {
  const geo = new THREE.BufferGeometry();
  const mat = new THREE.LineBasicMaterial({ color, linewidth: width });
  return new THREE.Line(geo, mat);
}

const linePZ = makeArcLine(0x60a5fa, 3.5); // ด้าน PZ: 90° − φ (สีน้ำเงิน)
const linePX = makeArcLine(0xf59e0b, 3.5); // ด้าน PX: 90° − δ (สีส้มทอง)
const lineZX = makeArcLine(0x34d399, 3.5); // ด้าน ZX: 90° − h = z (สีเขียวมรกต)

const labelSidePZ = makeLabel('PZ = 90° − φ', '#93c5fd', 'rgba(12,20,40,0.85)', 5.5);
const labelSidePX = makeLabel('PX = 90° − δ', '#fcd34d', 'rgba(30,22,10,0.85)', 5.5);
const labelSideZX = makeLabel('ZX = 90° − h', '#6ee7b7', 'rgba(10,28,18,0.85)', 5.5);

pzxTriangleGroup.add(linePZ, linePX, lineZX, labelSidePZ, labelSidePX, labelSideZX);

// 5. พื้นผิวสามเหลี่ยมทรงกลม (Spherical Triangle Surface Mesh)
let triangleMesh = null;

// 6. วงกลมใหญ่ต่อขยาย (Great Circles Extension)
function makeCircleLoop(color) {
  const geo = new THREE.BufferGeometry();
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false });
  return new THREE.LineLoop(geo, mat);
}
const circleMeridian = makeCircleLoop(0x60a5fa); // วงกลมเมริเดียน (ผ่าน P และ Z)
const circleHour = makeCircleLoop(0xf59e0b);     // วงกลมชั่วโมง (ผ่าน P และ X)
const circleVertical = makeCircleLoop(0x34d399); // วงกลมดิ่ง (ผ่าน Z และ X)
greatCirclesGroup.add(circleMeridian, circleHour, circleVertical);

// ดาวฉากหลังระยิบระยับ
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
   ส่วนที่ 2 — ฟังก์ชันช่วยทางเรขาคณิตทรงกลม (Slerp & Subdivisions)
   ===================================================================== */

/** คำนวณจุดบนส่วนโค้งวงกลมใหญ่ระหว่าง v1 และ v2 ด้วย Slerp */
function slerpGreatCircleArc(v1, v2, steps = 48, radius = R) {
  const u1 = v1.clone().normalize();
  const u2 = v2.clone().normalize();
  const dot = Math.max(-1, Math.min(1, u1.dot(u2)));
  const omega = Math.acos(dot);
  const pts = [];

  if (omega < 1e-6) {
    pts.push(u1.clone().multiplyScalar(radius));
    pts.push(u2.clone().multiplyScalar(radius));
    return pts;
  }

  const sinOmega = Math.sin(omega);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * omega) / sinOmega;
    const s2 = Math.sin(t * omega) / sinOmega;
    const p = new THREE.Vector3().addScaledVector(u1, s1).addScaledVector(u2, s2).normalize().multiplyScalar(radius);
    pts.push(p);
  }
  return pts;
}

/** คำนวณจุดของวงกลมใหญ่เต็มวง (360°) ที่ผ่านเวกเตอร์ v1 และ v2 */
function fullGreatCirclePoints(v1, v2, steps = 96, radius = R) {
  const u1 = v1.clone().normalize();
  const norm = new THREE.Vector3().crossVectors(u1, v2).normalize();
  const u2 = new THREE.Vector3().crossVectors(norm, u1).normalize();
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(new THREE.Vector3()
      .addScaledVector(u1, Math.cos(a))
      .addScaledVector(u2, Math.sin(a))
      .multiplyScalar(radius));
  }
  return pts;
}

/** สร้าง Mesh พื้นผิวของสามเหลี่ยมทรงกลม PZX */
function buildSphericalTriangleMesh(pP, pZ, pX) {
  if (triangleMesh) {
    pzxTriangleGroup.remove(triangleMesh);
    triangleMesh.geometry.dispose();
  }

  const uP = pP.clone().normalize();
  const uZ = pZ.clone().normalize();
  const uX = pX.clone().normalize();

  // สร้างจุดแบบ Grid สอดไส้ในสามเหลี่ยมทรงกลม
  const N = 12;
  const positions = [];
  const indices = [];

  const grid = [];
  for (let i = 0; i <= N; i++) {
    grid[i] = [];
    const t1 = i / N;
    // จุดบนขอบ PZ
    const pPZ = new THREE.Vector3().lerpVectors(uP, uZ, t1).normalize();
    // จุดบนขอบ PX
    const pPX = new THREE.Vector3().lerpVectors(uP, uX, t1).normalize();

    for (let j = 0; j <= i; j++) {
      const t2 = i === 0 ? 0 : j / i;
      const pt = new THREE.Vector3().lerpVectors(pPZ, pPX, t2).normalize().multiplyScalar(R * 0.996);
      grid[i][j] = positions.length / 3;
      positions.push(pt.x, pt.y, pt.z);
    }
  }

  // สร้าง Faces (Triangles)
  for (let i = 0; i < N; i++) {
    for (let j = 0; j <= i; j++) {
      const p1 = grid[i][j];
      const p2 = grid[i + 1][j];
      const p3 = grid[i + 1][j + 1];
      indices.push(p1, p2, p3);

      if (j < i) {
        const p4 = grid[i][j + 1];
        indices.push(p1, p3, p4);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  triangleMesh = new THREE.Mesh(geo, mat);
  pzxTriangleGroup.add(triangleMesh);
}

/* =====================================================================
   ส่วนที่ 3 — ผูก UI และคำนวณสามเหลี่ยม PZX (Astro-Math Engine)
   ===================================================================== */
const $ = (id) => document.getElementById(id);

const pzxPreset = $('pzxPreset');
const pzxLat = $('pzxLat');
const pzxDec = $('pzxDec');
const pzxHa = $('pzxHa');

const valLat = $('valLat');
const valDec = $('valDec');
const valHa = $('valHa');

const sidePzVal = $('sidePzVal');
const sidePxVal = $('sidePxVal');
const sideZxVal = $('sideZxVal');
const anglePVal = $('anglePVal');
const angleZVal = $('angleZVal');
const angleXVal = $('angleXVal');

const calcAltOut = $('calcAltOut');
const calcAltDmsOut = $('calcAltDmsOut');
const calcAzOut = $('calcAzOut');
const calcAzQuadOut = $('calcAzQuadOut');

const derivStep1 = $('derivStep1');
const derivStep1Res = $('derivStep1Res');
const derivStep2 = $('derivStep2');
const derivStep2Res = $('derivStep2Res');

/** ฟังก์ชันหลักคำนวณและวาดสามเหลี่ยม PZX */
function solvePzx() {
  const phi = parseFloat(pzxLat.value);
  const dec = parseFloat(pzxDec.value);
  const ha = parseFloat(pzxHa.value);

  valLat.textContent = `${phi >= 0 ? '+' : ''}${phi.toFixed(1)}°`;
  valDec.textContent = `${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°`;
  const haH = ha / 15;
  const haHFloor = Math.floor(haH);
  const haMFloor = Math.floor((haH - haHFloor) * 60);
  valHa.textContent = `${ha.toFixed(1)}° (${pad2(haHFloor)}h ${pad2(haMFloor)}m)`;

  const phiRad = phi * D2R;
  const decRad = dec * D2R;
  const haRad = ha * D2R;

  // 1. คำนวณพิกัด 3D ของจุดยอดทั้งสาม
  // จุด Z: Zenith (0, R, 0)
  const posZ = new THREE.Vector3(0, R, 0);

  // จุด P: NCP ชี้ไปทางทิศเหนือ ยกสูงจากขอบฟ้าเหนือ = phi
  // ในกรอบ x=E, y=U, z=-N:
  // ขอบฟ้าเหนือคือ (0, 0, -R), จุดจอมฟ้าคือ (0, R, 0)
  // NCP อยู่ในระนาบเมริเดียน (x=0) มี Alt = phi
  const posP = new THREE.Vector3(0, R * Math.sin(phiRad), -R * Math.cos(phiRad));

  // จุด X: ดาวเป้าหมาย
  // องค์ประกอบทิศทางในกรอบ E, N, U:
  const E = -Math.cos(decRad) * Math.sin(haRad);
  const N = Math.sin(decRad) * Math.cos(phiRad) - Math.cos(decRad) * Math.cos(haRad) * Math.sin(phiRad);
  const U = Math.sin(decRad) * Math.sin(phiRad) + Math.cos(decRad) * Math.cos(haRad) * Math.cos(phiRad);

  const posX = new THREE.Vector3(E * R, U * R, -N * R);

  // อัปเดตตำแหน่ง Markers
  markerP.position.copy(posP);
  markerZ.position.copy(posZ);
  markerX.position.copy(posX);

  // อัปเดตป้ายกำกับจุดยอด
  labelP.position.copy(posP.clone().multiplyScalar(1.12));
  labelZ.position.copy(posZ.clone().multiplyScalar(1.12));
  labelX.position.copy(posX.clone().multiplyScalar(1.12));

  // 2. คำนวณส่วนโค้งด้านทั้งสาม
  const ptsPZ = slerpGreatCircleArc(posP, posZ, 48, R);
  const ptsPX = slerpGreatCircleArc(posP, posX, 48, R);
  const ptsZX = slerpGreatCircleArc(posZ, posX, 48, R);

  linePZ.geometry.setFromPoints(ptsPZ);
  linePX.geometry.setFromPoints(ptsPX);
  lineZX.geometry.setFromPoints(ptsZX);

  // วางป้ายกำกับกึ่งกลางของแต่ละด้าน
  const midPZ = ptsPZ[Math.floor(ptsPZ.length / 2)].clone().multiplyScalar(1.08);
  const midPX = ptsPX[Math.floor(ptsPX.length / 2)].clone().multiplyScalar(1.08);
  const midZX = ptsZX[Math.floor(ptsZX.length / 2)].clone().multiplyScalar(1.08);

  labelSidePZ.position.copy(midPZ);
  labelSidePX.position.copy(midPX);
  labelSideZX.position.copy(midZX);

  // 3. สร้างพื้นผิวสามเหลี่ยม PZX Mesh
  buildSphericalTriangleMesh(posP, posZ, posX);

  // 4. วงกลมใหญ่ต่อขยาย
  circleMeridian.geometry.setFromPoints(fullGreatCirclePoints(posP, posZ, 96, R * 0.999));
  circleHour.geometry.setFromPoints(fullGreatCirclePoints(posP, posX, 96, R * 0.999));
  circleVertical.geometry.setFromPoints(fullGreatCirclePoints(posZ, posX, 96, R * 0.999));

  // 5. คำนวณค่าทางตรีโกณมิติทรงกลม
  // ด้าน PZ = 90° - phi
  const sidePZ = 90 - phi;
  // ด้าน PX = 90° - dec
  const sidePX = 90 - dec;

  // กฎโคไซน์สำหรับด้าน a (ZX):
  // sin h = sin phi * sin dec + cos phi * cos dec * cos HA
  const sinH = Math.sin(phiRad) * Math.sin(decRad) + Math.cos(phiRad) * Math.cos(decRad) * Math.cos(haRad);
  const altDeg = Math.asin(Math.max(-1, Math.min(1, sinH))) / D2R;
  const sideZX = 90 - altDeg;

  // กฎโคไซน์สำหรับมุม Z (Azimuth):
  const cosAlt = Math.cos(altDeg * D2R);
  let cosA = 0;
  if (Math.abs(cosAlt) > 1e-6 && Math.abs(Math.cos(phiRad)) > 1e-6) {
    cosA = (Math.sin(decRad) - Math.sin(phiRad) * Math.sin(altDeg * D2R)) / (Math.cos(phiRad) * cosAlt);
  }
  const A0 = Math.acos(Math.max(-1, Math.min(1, cosA))) / D2R;
  // การตัดสินจตุภาค: ซีกฟ้าตก (0 < HA <= 180) -> A = 360 - A0, ซีกฟ้าออก (180 < HA < 360) -> A = A0
  const isWest = ha > 0 && ha <= 180;
  const azDeg = isWest ? (360 - A0) : A0;

  // Parallactic angle q (มุมที่จุด X): กฎไซน์ sin q = cos phi * sin HA / cos h
  let qDeg = 0;
  if (Math.abs(cosAlt) > 1e-6) {
    const sinQ = (Math.cos(phiRad) * Math.sin(haRad)) / cosAlt;
    qDeg = Math.asin(Math.max(-1, Math.min(1, sinQ))) / D2R;
  }

  // อัปเดตตารางสรุป
  sidePzVal.textContent = `${sidePZ.toFixed(1)}°`;
  sidePxVal.textContent = `${sidePX.toFixed(1)}°`;
  sideZxVal.textContent = `${sideZX.toFixed(1)}°`;
  anglePVal.textContent = `${ha.toFixed(1)}°`;
  angleZVal.textContent = `${A0.toFixed(1)}°`;
  angleXVal.textContent = `${Math.abs(qDeg).toFixed(1)}°`;

  // อัปเดตกล่องผลลัพธ์
  calcAltOut.textContent = `${altDeg >= 0 ? '+' : ''}${altDeg.toFixed(1)}°`;
  calcAltDmsOut.textContent = degToDMS(altDeg);
  calcAzOut.textContent = `${azDeg.toFixed(1)}°`;
  calcAzQuadOut.textContent = `N ${A0.toFixed(1)}° ${isWest ? 'W (ซีกฟ้าตก)' : 'E (ซีกฟ้าออก)'}`;

  // อัปเดตการแทนค่าสมการสด
  derivStep1.textContent = `sin h = sin(${phi.toFixed(1)}°)·sin(${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°) + cos(${phi.toFixed(1)}°)·cos(${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°)·cos(${ha.toFixed(1)}°)`;
  derivStep1Res.innerHTML = `sin h = ${sinH.toFixed(4)} &nbsp;⟹&nbsp; <strong>h = ${altDeg >= 0 ? '+' : ''}${altDeg.toFixed(1)}° (z = ${sideZX.toFixed(1)}°)</strong>`;

  derivStep2.textContent = `cos A = (sin ${dec.toFixed(1)}° − sin ${phi.toFixed(1)}°·sin ${altDeg.toFixed(1)}°) / (cos ${phi.toFixed(1)}°·cos ${altDeg.toFixed(1)}°)`;
  derivStep2Res.innerHTML = `cos A = ${cosA.toFixed(4)} &nbsp;⟹&nbsp; A₀ = ${A0.toFixed(1)}° &nbsp;⟹&nbsp; <strong>A = ${isWest ? '360° − ' + A0.toFixed(1) + '° = ' : ''}${azDeg.toFixed(1)}°</strong>`;
}

/* =====================================================================
   ส่วนที่ 4 — ผูกการควบคุม ป้าย และแถบเครื่องมือ
   ===================================================================== */
for (const input of [pzxLat, pzxDec, pzxHa]) {
  input.addEventListener('input', () => {
    pzxPreset.value = 'custom';
    solvePzx();
  });
}

pzxPreset.addEventListener('change', () => {
  const v = pzxPreset.value;
  if (v === 'ex') {
    pzxLat.value = 18.5; pzxDec.value = 20.0; pzxHa.value = 45.0;
  } else if (v === 'p21') {
    pzxLat.value = 15.0; pzxDec.value = 15.0; pzxHa.value = 30.0;
  } else if (v === 'p22') {
    pzxLat.value = 15.0; pzxDec.value = 38.8; pzxHa.value = 39.9;
  } else if (v === 'p24') {
    // โจทย์ 24: phi=13, h=45, A=160 -> dec=-26.7, ha=16.6
    pzxLat.value = 13.0; pzxDec.value = -26.7; pzxHa.value = 16.6;
  }
  solvePzx();
});

// แถบเครื่องมือ 3D
let showTriangleFill = true;
let showGreatCircles = true;
let showHorizonGround = true;
let showSphereGrid = true;

const toggleTriangleFillBtn = $('toggleTriangleFill');
const toggleGreatCirclesBtn = $('toggleGreatCircles');
const toggleHorizonGroundBtn = $('toggleHorizonGround');
const toggleSphereGridBtn = $('toggleSphereGrid');
const togglePzxLabelsBtn = $('togglePzxLabels');
const btnPzxResetView = $('btnPzxResetView');

if (toggleTriangleFillBtn) {
  toggleTriangleFillBtn.addEventListener('click', () => {
    showTriangleFill = !showTriangleFill;
    if (triangleMesh) triangleMesh.visible = showTriangleFill;
    toggleTriangleFillBtn.classList.toggle('active-amber', showTriangleFill);
    toggleTriangleFillBtn.setAttribute('aria-pressed', String(showTriangleFill));
  });
}

if (toggleGreatCirclesBtn) {
  toggleGreatCirclesBtn.addEventListener('click', () => {
    showGreatCircles = !showGreatCircles;
    greatCirclesGroup.visible = showGreatCircles;
    toggleGreatCirclesBtn.classList.toggle('active-blue', showGreatCircles);
    toggleGreatCirclesBtn.setAttribute('aria-pressed', String(showGreatCircles));
  });
}

if (toggleHorizonGroundBtn) {
  toggleHorizonGroundBtn.addEventListener('click', () => {
    showHorizonGround = !showHorizonGround;
    horizonGroup.visible = showHorizonGround;
    toggleHorizonGroundBtn.classList.toggle('active-green', showHorizonGround);
    toggleHorizonGroundBtn.setAttribute('aria-pressed', String(showHorizonGround));
  });
}

if (toggleSphereGridBtn) {
  toggleSphereGridBtn.addEventListener('click', () => {
    showSphereGrid = !showSphereGrid;
    sphereWire.visible = showSphereGrid;
    toggleSphereGridBtn.classList.toggle('active', showSphereGrid);
    toggleSphereGridBtn.setAttribute('aria-pressed', String(showSphereGrid));
  });
}

if (togglePzxLabelsBtn) {
  togglePzxLabelsBtn.addEventListener('click', () => {
    labelsVisible = !labelsVisible;
    allLabels.forEach((lbl) => { lbl.visible = labelsVisible; });
    togglePzxLabelsBtn.classList.toggle('active', labelsVisible);
    togglePzxLabelsBtn.setAttribute('aria-pressed', String(labelsVisible));
  });
}

function doResetCameraView() {
  camState.theta = DEFAULT_CAM.theta;
  camState.phi = DEFAULT_CAM.phi;
  camState.radius = DEFAULT_CAM.radius;
  applyCamera();
}

if (btnPzxResetView) {
  btnPzxResetView.addEventListener('click', doResetCameraView);
}
const btnPzxResetViewDesktop = $('btnPzxResetViewDesktop');
if (btnPzxResetViewDesktop) {
  btnPzxResetViewDesktop.addEventListener('click', doResetCameraView);
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
  allLabels.forEach(lbl => {
    if (lbl.userData?.aspect && lbl.userData?.scale) {
      lbl.scale.set(lbl.userData.aspect * lbl.userData.scale * mult, lbl.userData.scale * mult, 1);
    }
  });
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

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

document.fonts.ready.then(() => {
  solvePzx();
  animate();
});
setTimeout(() => {
  solvePzx();
  animate();
}, 1000);
