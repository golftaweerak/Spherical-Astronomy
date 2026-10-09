import * as THREE from 'three';
import {
  D2R,
  pad2,
  jdFromDate,
  gmstHours,
  lstHours,
  equatorialToHorizontal,
  horizontalToEquatorial,
  hoursToHMS,
  degToDMS,
  azToCompass
} from './astro-math.js';

/* =====================================================================
   ส่วนที่ 1 — ข้อมูลดาวฤกษ์สว่างอ้างอิงตามเอกสารค่าย 1 สอวน. ดาราศาสตร์
   (2. spherical_astronomy_and_time_corrected.tex)
   ===================================================================== */
const STARS = [
  { name: 'ดาวเหนือ (Polaris — α UMi)',                 ra: 2.5303,  dec: 89.2641 },
  { name: 'ดาวหัวใจสิงห์ (Regulus / ดาวเรกูลัส — α Leo)',  ra: 10.1395, dec: 11.9672 },
  { name: 'ดาวมินทากะ (Mintaka / เข็มขัดนายพราน — δ Ori)', ra: 5.5334,  dec: -0.2991 },
  { name: 'ดาวซิริอัส (Sirius / ดาวโจร — α CMa)',         ra: 6.7525,  dec: -16.7161 },
  { name: 'ดาวคาโนปุส (Canopus — α Car)',                ra: 6.3992,  dec: -52.6957 },
  { name: 'ดาวอาร์กทูรัส (Arcturus / ดาวดวงแก้ว — α Boo)', ra: 14.2610, dec: 19.1822 },
  { name: 'ดาวเวกา (Vega — α Lyr)',                      ra: 18.6156, dec: 38.7836 },
  { name: 'ดาวคาเพลลา (Capella — α Aur)',                ra: 5.2782,  dec: 45.9980 },
  { name: 'ดาวไรเจล (Rigel / ดาวโคนขาพราน — β Ori)',      ra: 5.2423,  dec: -8.2016 },
  { name: 'ดาวโปรซิออน (Procyon — α CMi)',                ra: 7.6551,  dec: 5.2250 },
  { name: 'ดาวบีเทลจุส (Betelgeuse / ดาวเต่า — α Ori)',    ra: 5.9195,  dec: 7.4071 },
  { name: 'ดาวอะเคอร์นาร์ (Achernar — α Eri)',            ra: 1.6286,  dec: -57.2367 },
  { name: 'ดาวอัลแตร์ (Altair / ดาวตานกอินทรี — α Aql)',   ra: 19.8464, dec: 8.8683 },
  { name: 'ดาวอัลเดบารัน (Aldebaran / ดาวตาวัว — α Tau)',  ra: 4.5987,  dec: 16.5093 },
  { name: 'ดาวรวงข้าว (Spica / ดาวสไปกา — α Vir)',        ra: 13.4199, dec: -11.1613 },
  { name: 'ดาวปาริชาต (Antares / ดาวแอนทาเรส — α Sco)',   ra: 16.4901, dec: -26.4320 },
  { name: 'ดาวโฟมัลฮอต (Fomalhaut — α PsA)',             ra: 22.9608, dec: -29.6222 },
  { name: 'ดาวเดเนบ (Deneb / ดาวหางหงส์ — α Cyg)',        ra: 20.6905, dec: 45.2803 },
];

/* =====================================================================
   ส่วนที่ 2 — ฉาก Three.js
   ระบบพิกัด: x = ตะวันออก(E), y = ขึ้น(Zenith), z = −เหนือ(N)
   ===================================================================== */
const R = 100; // รัศมีทรงกลมท้องฟ้า
const stage = document.getElementById('stage');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

// อาร์เรย์เก็บ Sprite ป้ายข้อความทั้งหมดเพื่อเปิด/ปิดพร้อมกันได้
const allLabels = [];
let labelsVisible = true;

// ตัวช่วยสร้างป้ายข้อความ (Sprite)
function makeLabel(text, color = '#e9ecf5', bg = 'rgba(12,16,32,0.82)', scale = 7.0) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const fs = 44;
  ctx.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  const pad = 24;
  c.width = Math.max(32, Math.ceil(ctx.measureText(text).width + pad * 2));
  c.height = fs + pad;

  const ctx2 = c.getContext('2d');
  ctx2.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  const r = 14;
  ctx2.fillStyle = bg;
  ctx2.beginPath();
  if (ctx2.roundRect) ctx2.roundRect(0, 0, c.width, c.height, r);
  else ctx2.rect(0, 0, c.width, c.height);
  ctx2.fill();
  ctx2.fillStyle = color;
  ctx2.textBaseline = 'middle';
  ctx2.fillText(text, pad, c.height / 2 + 2);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set((c.width / c.height) * scale, scale, 1);
  sprite.visible = labelsVisible;
  allLabels.push(sprite);
  return sprite;
}

// ตัวช่วยอัปเดตข้อความใน Sprite เดิมโดยไม่สูญเสียประสิทธิภาพ
function updateLabel(sprite, text, color = '#e9ecf5', bg = 'rgba(12,16,32,0.82)', scale = 7.0) {
  if (!sprite || !sprite.material || !sprite.material.map) return;
  const c = sprite.material.map.image;
  const ctx = c.getContext('2d');
  const fs = 44;
  ctx.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  const pad = 24;
  const w = Math.max(32, Math.ceil(ctx.measureText(text).width + pad * 2));
  const h = fs + pad;
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  ctx.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`;
  const r = 14;
  ctx.fillStyle = bg;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, w, h, r);
  else ctx.rect(0, 0, w, h);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, h / 2 + 2);

  sprite.material.map.needsUpdate = true;
  sprite.scale.set((w / h) * scale, scale, 1);
}

function addLine(points, color, opacity = 1, dashed = false) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  let mat, line;
  if (dashed) {
    mat = new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 3, gapSize: 2.5 });
    line = new THREE.Line(geo, mat);
    line.computeLineDistances();
  } else {
    mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    line = new THREE.Line(geo, mat);
  }
  return line;
}

function updateLinePoints(line, points) {
  if (!line || !points || points.length === 0) return;
  const validPoints = points.filter(p => p && typeof p.x === 'number' && !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z));
  if (validPoints.length < 2) return;
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(validPoints);
  if (line.material.isLineDashedMaterial) {
    line.computeLineDistances();
  }
}

// =====================================================================
// กลุ่มที่ 1: "ระนาบขอบฟ้า" (กรอบ ENU ของผู้สังเกต — อยู่กับที่)
// =====================================================================
const groundGroup = new THREE.Group();
scene.add(groundGroup);

// วงกลมขอบฟ้า (Horizon: วงกลมระดับ U=0)
const horizonLine = addLine(
  Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2;
    return new THREE.Vector3(R * Math.cos(a), 0, R * Math.sin(a));
  }),
  0xaab4cf, 0.95
);
groundGroup.add(horizonLine);

// กลุ่มระนาบขอบฟ้าและพื้นดินใต้ขอบฟ้า (เปิด/ปิด ได้อิสระ)
const groundSurfaceGroup = new THREE.Group();
groundGroup.add(groundSurfaceGroup);

// พื้นดินใต้ขอบฟ้า (ครึ่งทรงกลมใต้ขอบฟ้า โปร่งแสง)
const groundDome = new THREE.Mesh(
  new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x0a0e1e, transparent: true, opacity: 0.82, side: THREE.DoubleSide })
);
groundSurfaceGroup.add(groundDome);

// แผ่นระนาบขอบฟ้าโปร่งแสงสีเขียวอ่อน
const horizonDisk = new THREE.Mesh(
  new THREE.CircleGeometry(R * 0.998, 64),
  new THREE.MeshBasicMaterial({ color: 0x7dd6a8, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
);
horizonDisk.rotation.x = Math.PI / 2;
groundSurfaceGroup.add(horizonDisk);

// เส้นเมริเดียนท้องฟ้า (Celestial Meridian: เหนือ→จุดจอมฟ้า→ใต้) เส้นประ
const observerMeridian = addLine(
  Array.from({ length: 65 }, (_, i) => {
    const t = (i / 64) * Math.PI;
    return new THREE.Vector3(0, R * Math.sin(t), -R * Math.cos(t));
  }),
  0x7dd6a8, 0.75, true
);
groundGroup.add(observerMeridian);

// เส้นแนวแกนเหนือ-ใต้ (N-S) และ ตะวันออก-ตก (E-W) บนระนาบขอบฟ้า
const horizonNsLine = addLine([new THREE.Vector3(0, 0.2, -R), new THREE.Vector3(0, 0.2, R)], 0x52b788, 0.75, true);
const horizonEwLine = addLine([new THREE.Vector3(-R, 0.2, 0), new THREE.Vector3(R, 0.2, 0)], 0x52b788, 0.75, true);
groundGroup.add(horizonNsLine, horizonEwLine);

// จุดทิศหลักทั้งสี่: เหนือ N (-Z), ใต้ S (+Z), ตะวันออก E (+X), ตะวันตก W (-X)
const cardinals = [
  { t: 'ทิศเหนือ N',   p: [0, 1, -R * 1.12] },
  { t: 'ทิศใต้ S',     p: [0, 1, R * 1.12] },
  { t: 'ทิศตะวันออก E', p: [R * 1.12, 1, 0] },
  { t: 'ทิศตะวันตก W', p: [-R * 1.12, 1, 0] },
];
for (const c of cardinals) {
  const s = makeLabel(c.t, '#cfd9f0');
  s.position.set(...c.p);
  groundGroup.add(s);
}

// จุดจอมฟ้า (Zenith, Z)
{
  const zen = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xaab4cf })
  );
  zen.position.set(0, R, 0);
  groundGroup.add(zen);
  const lbl = makeLabel('จุดจอมฟ้า (Zenith, Z)', '#cfd9f0');
  lbl.position.set(0, R * 1.08, 0);
  groundGroup.add(lbl);
}

// =====================================================================
// กลุ่มย่อย: เส้นช่วยอ่านพิกัดขอบฟ้า (Alt/Az Visuals)
// =====================================================================
const altAzGroup = new THREE.Group();
groundGroup.add(altAzGroup);

// 1. เส้นส่วนโค้งมุมเงย (Altitude Arc, h) จากโคนดาวขึ้นหาเป้าหมาย (เส้นทึบเขียวสว่าง)
const altArcLine = addLine([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)], 0x38ef7d, 0.95);
// 2. เส้นส่วนโค้งระยะจอมฟ้า (Zenith Distance Arc: z = 90 - h) ลากต่อเนื่องไปถึงจุดจอมฟ้า Z (0, R, 0)
const zenArcLine = addLine([new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 2, 0)], 0x38ef7d, 0.75, true);
// 3. เส้นประดิ่งทิ้งดิ่งจากดาวลงสู่ระนาบขอบฟ้า
const altDropLine = addLine([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)], 0x7dd6a8, 0.6, true);
// 4. เส้นส่วนโค้งมุมทิศ (Azimuth Arc, A) บนระนาบขอบฟ้าเริ่มจากทิศเหนือเวียนตามเข็มนาฬิกา
const azArcLine = addLine([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)], 0x38ef7d, 0.95);
// 5. เส้นรัศมีชี้จากจุดสังเกต (0,0,0) ไปยังจุดขอบฟ้าของดาว
const footRayLine = addLine([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)], 0x7dd6a8, 0.5, true);
// 6. จุดขอบฟ้าของดาว (Foot of the vertical circle)
const footMarker = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0x38ef7d })
);
// 7. ป้ายกำกับค่ามุมเงย h, ระยะจอมฟ้า z, มุมทิศ A, และจุดขอบฟ้าของดาว
const altLabel  = makeLabel('มุมเงย h', '#38ef7d', 'rgba(10,26,20,0.88)', 6.2);
const zenLabel  = makeLabel('ระยะจอมฟ้า z', '#7dd6a8', 'rgba(10,26,20,0.88)', 5.6);
const azLabel   = makeLabel('มุมทิศ A', '#38ef7d', 'rgba(10,26,20,0.88)', 6.2);
const footLabel = makeLabel('จุดขอบฟ้าของดาว (Foot)', '#7dd6a8', 'rgba(10,26,20,0.88)', 5.5);

altAzGroup.add(altArcLine, zenArcLine, altDropLine, azArcLine, footRayLine, footMarker, altLabel, zenLabel, azLabel, footLabel);

// =====================================================================
// กลุ่มย่อย: เส้นทางเดินปรากฏประจำวันของดาว (Diurnal Path)
// =====================================================================
const diurnalGroup = new THREE.Group();
groundGroup.add(diurnalGroup);

// วงกลมทางเดินประจำวันตลอด 24 ชั่วโมง
const diurnalLine = addLine([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)], 0xf59e0b, 0.88, true);
// จุดผ่านเมริเดียนสูงสุด (Upper Culmination)
const culmMarker = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xf59e0b })
);
const culmLabel = makeLabel('ผ่านเมริเดียนสูงสุด (Culmination)', '#f59e0b', 'rgba(32,20,8,0.88)', 5.5);
// จุดขึ้น (Rise) และจุดตก (Set)
const riseMarker = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0x34d399 }));
const riseLabel  = makeLabel('จุดขึ้น (Rise)', '#34d399', 'rgba(10,28,20,0.88)', 5.3);
const setMarker  = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0xf87171 }));
const setLabel   = makeLabel('จุดตก (Set)', '#f87171', 'rgba(32,10,12,0.88)', 5.3);

diurnalGroup.add(diurnalLine, culmMarker, culmLabel, riseMarker, riseLabel, setMarker, setLabel);

// =====================================================================
// กลุ่มที่ 2: "ท้องฟ้า" (กรอบศูนย์สูตรฟ้า — หมุนตามเวลาดาราคติและละติจูด)
// =====================================================================
const skyGroup = new THREE.Group();
scene.add(skyGroup);

function skyPoint(raHours, decDeg, r = R) {
  const a = raHours * 15 * D2R;
  const d = decDeg * D2R;
  return new THREE.Vector3(r * Math.cos(d) * Math.cos(a), r * Math.cos(d) * Math.sin(a), r * Math.sin(d));
}

// เส้นศูนย์สูตรฟ้า (Celestial Equator: Dec = 0)
skyGroup.add(addLine(
  Array.from({ length: 129 }, (_, i) => skyPoint(i / 128 * 24, 0)),
  0x6ea8e8, 0.95
));
{
  const lbl = makeLabel('เส้นศูนย์สูตรฟ้า (CE)', '#6ea8e8');
  lbl.position.copy(skyPoint(9, 0, R * 1.06));
  skyGroup.add(lbl);
}

// =====================================================================
// ระนาบสุริยะวิถี (Ecliptic Plane: เอียง 23.44°)
// =====================================================================
const EPSILON = 23.43929 * D2R; // ความเอียงของแกนโลก (Obliquity)
function eclipticPoint(lamDeg, r = R) {
  const lam = lamDeg * D2R;
  return new THREE.Vector3(
    r * Math.cos(lam),
    r * Math.cos(EPSILON) * Math.sin(lam),
    r * Math.sin(EPSILON) * Math.sin(lam)
  );
}

const eclipticGroup = new THREE.Group();
skyGroup.add(eclipticGroup);

// วงกลมใหญ่สุริยะวิถี (สีเหลืองทองอำพัน)
const eclipticLine = addLine(
  Array.from({ length: 129 }, (_, i) => eclipticPoint(i / 128 * 360, R * 1.002)),
  0xfbbf24, 0.95
);
eclipticGroup.add(eclipticLine);

{
  const lbl = makeLabel('สุริยะวิถี (Ecliptic, ε = 23.44°)', '#fbbf24', 'rgba(32,24,10,0.88)', 6.0);
  lbl.position.copy(eclipticPoint(45, R * 1.07));
  eclipticGroup.add(lbl);
}

// จุดสำคัญบนระนาบสุริยะวิถี
// 1. จุดครีษมายัน (Summer Solstice: λ = 90°, RA 6h, Dec +23.44°)
{
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  m.position.copy(eclipticPoint(90));
  eclipticGroup.add(m);
  const lbl = makeLabel('จุดครีษมายัน (Summer Solstice)', '#fbbf24', 'rgba(32,24,10,0.88)', 5.5);
  lbl.position.copy(eclipticPoint(90, R * 1.10));
  eclipticGroup.add(lbl);
}
// 2. จุดเหมายัน (Winter Solstice: λ = 270°, RA 18h, Dec -23.44°)
{
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  m.position.copy(eclipticPoint(270));
  eclipticGroup.add(m);
  const lbl = makeLabel('จุดเหมายัน (Winter Solstice)', '#fbbf24', 'rgba(32,24,10,0.88)', 5.5);
  lbl.position.copy(eclipticPoint(270, R * 1.10));
  eclipticGroup.add(lbl);
}
// 3. จุดศารทวิษุวัต (Autumnal Equinox: λ = 180°, RA 12h, Dec 0°)
{
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xb8a0e8 }));
  m.position.copy(eclipticPoint(180));
  eclipticGroup.add(m);
  const lbl = makeLabel('จุดศารทวิษุวัต (Autumnal Eq.)', '#b8a0e8', 'rgba(25,18,35,0.88)', 5.5);
  lbl.position.copy(eclipticPoint(180, R * 1.10));
  eclipticGroup.add(lbl);
}

// กลุ่มกริดพิกัดศูนย์สูตร (Grid Group: Dec Parallels & RA Meridians)
const gridGroup = new THREE.Group();
skyGroup.add(gridGroup);

// ขนานเดคลิเนชัน Dec = ±30°, ±60°
for (const dec of [-60, -30, 30, 60]) {
  gridGroup.add(addLine(
    Array.from({ length: 129 }, (_, i) => skyPoint(i / 128 * 24, dec)),
    0x8090b8, 0.22
  ));
}

// เส้นลองจิจูดฟ้า (RA ทุก 2 ชม.) จากขั้วเหนือถึงขั้วใต้
for (let ra = 0; ra < 24; ra += 2) {
  gridGroup.add(addLine(
    Array.from({ length: 65 }, (_, i) => skyPoint(ra, -90 + (i / 64) * 180)),
    0x8090b8, 0.18
  ));
}

// ขั้วฟ้าเหนือ (North Celestial Pole: NCP) + ป้าย
const ncpLabel = makeLabel('ขั้วฟ้าเหนือ (NCP)', '#6ea8e8');
{
  const ncp = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x6ea8e8 })
  );
  ncp.position.set(0, 0, R);
  skyGroup.add(ncp);
  groundGroup.add(ncpLabel);
}

// จุดวสันตวิษุวัต (Vernal Equinox: ♈, RA 0h, Dec 0°)
{
  const eqx = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xb8a0e8 })
  );
  eqx.position.copy(skyPoint(0, 0));
  skyGroup.add(eqx);
  const lbl = makeLabel('จุดวสันตวิษุวัต (♈, RA 0ชม.)', '#b8a0e8');
  lbl.position.copy(skyPoint(0, 10, R * 1.0));
  skyGroup.add(lbl);
}

// ดาวฤกษ์สว่าง
const starPoints = (() => {
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  const pos = new Float32Array(STARS.length * 3);
  STARS.forEach((s, i) => {
    const p = skyPoint(s.ra, s.dec, R * 0.995);
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: tex, size: 5, transparent: true, opacity: 0.85,
    sizeAttenuation: false, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  skyGroup.add(pts);
  return pts;
})();

// ดาวเป้าหมาย
const targetMesh = new THREE.Mesh(
  new THREE.SphereGeometry(2.6, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0xf2c14e })
);
const targetGlow = new THREE.Mesh(
  new THREE.SphereGeometry(5.5, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.22 })
);
const targetLabel = makeLabel('★ วัตถุเป้าหมาย (X)', '#f2c14e');
skyGroup.add(targetMesh, targetGlow, targetLabel);

// =====================================================================
// กลุ่มย่อย: เส้นช่วยอ่านพิกัดศูนย์สูตร (RA/Dec Visuals)
// =====================================================================
const raDecGroup = new THREE.Group();
skyGroup.add(raDecGroup);

// 1. วงกลมชั่วโมงผ่านดาว (Hour circle: จาก NCP ผ่านดาวไป SCP)
const hourCircleLine = addLine([new THREE.Vector3(), new THREE.Vector3()], 0x5fa8f5, 0.65, true);
// 2. ส่วนโค้งเดคลิเนชัน (Declination Arc, δ) จากเส้นศูนย์สูตรฟ้าไปยังดาว
const decArcLine = addLine([new THREE.Vector3(), new THREE.Vector3()], 0x38bdf8, 0.95);
// 3. ส่วนโค้งไรต์แอสเซนชัน (RA Arc, α) ตามแนวศูนย์สูตรฟ้าจากจุดวสันตวิษุวัต
const raArcLine = addLine([new THREE.Vector3(), new THREE.Vector3()], 0x818cf8, 0.95);
// 4. จุดตัดศูนย์สูตรฟ้าตรงกับแนว RA ของดาว (Equator projection foot)
const eqFootMarker = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
);
// 5. ป้ายกำกับ Dec δ และ RA α
const decLabel = makeLabel('เดคลิเนชัน δ', '#38bdf8', 'rgba(10,20,40,0.88)', 6.2);
const raLabel  = makeLabel('ไรต์แอสเซนชัน α', '#818cf8', 'rgba(18,14,38,0.88)', 6.2);
const eqFootLabel = makeLabel('ตัดศูนย์สูตรฟ้า', '#6ea8e8', 'rgba(10,20,40,0.88)', 5.5);

raDecGroup.add(hourCircleLine, decArcLine, raArcLine, eqFootMarker, decLabel, raLabel, eqFootLabel);

// ฉากหลัง: ทะเลดาวระยิบระยับจาง ๆ
(() => {
  const n = 900;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = R * 2.2, s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(th);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xbcc8ee, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0.40, depthWrite: false,
  })));
})();

/* =====================================================================
   การควบคุมมุมกล้อง: มุมมองเริ่มต้นที่สบายตา ไม่รก และรักษาระนาบขอบฟ้า
   - theta: 0.72π (~130°) มุมมองเฉียงจากทิศใต้-ตะวันตกเฉียงใต้
   - phi: 0.36π (~65°) มุมก้ม 25° เหนือระนาบขอบฟ้า มองเห็นโครงสร้าง 3D ได้สมดุล
   - radius: 245 ระยะพอดีกรอบ ไม่ตกขอบจอ
   ===================================================================== */
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
  camera.up.set(0, 1, 0); // แกนดิ่งชี้ขึ้นหา Zenith ตลอดเวลา ขอบฟ้าจึงไม่เอียง
  camera.lookAt(0, 0, 0);
}
applyCamera();

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
    // ลากไปขวา (clientX เพิ่ม) ทรงกลมฟ้าจะหมุนตามไปทางขวาอย่างเป็นธรรมชาติ
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

/* ---- ปรับขนาดตาม container ---- */
function fitCameraToViewport() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  const vfov = camera.fov * D2R;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (w / h));
  const minFov = Math.min(vfov, hfov);
  camState.minRadius = R * 1.50 / Math.tan(minFov / 2);
  if (camState.radius < camState.minRadius) camState.radius = camState.minRadius;
  applyCamera();
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

/* =====================================================================
   ส่วนที่ 3 — ผูก UI และคำนวณดาราศาสตร์
   ===================================================================== */
const $ = (id) => document.getElementById(id);
const raInput = $('raInput'), decInput = $('decInput');
const latInput = $('latInput'), lonInput = $('lonInput');
const dtInput = $('dtInput'), tzSelect = $('tzSelect'), liveCheck = $('liveCheck');
const starPreset = $('starPreset');

// สลับโหมดการระบุพิกัดสองทาง (Equatorial vs Horizontal)
let currentInputMode = 'equatorial';
const modeEquatorial = $('modeEquatorial');
const modeHorizontal = $('modeHorizontal');
const boxEquatorialInputs = $('boxEquatorialInputs');
const boxHorizontalInputs = $('boxHorizontalInputs');
const altInput = $('altInput');
const azInput = $('azInput');

const raResultOut = $('raResultOut');
const raHmsOut = $('raHmsOut');
const decResultOut = $('decResultOut');
const decDmsOut = $('decDmsOut');
const haSubOut = $('haSubOut');
const resBoxAlt = $('resBoxAlt');
const resBoxAz = $('resBoxAz');
const resBoxRa = $('resBoxRa');
const resBoxDec = $('resBoxDec');

// เติมตัวเลือกดาวฤกษ์
STARS.forEach((s, i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = `${s.name} (RA ${s.ra.toFixed(2)}h, Dec ${s.dec >= 0 ? '+' : ''}${s.dec.toFixed(1)}°)`;
  starPreset.append(opt);
});

function nowStringInZone() {
  let offMin;
  if (tzSelect.value === 'local') offMin = -new Date().getTimezoneOffset();
  else if (tzSelect.value === '7') offMin = 420;
  else offMin = 0;
  const d = new Date(Date.now() + offMin * 60000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

function eveningString() {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T20:00:00`;
}
dtInput.value = eveningString();

function inputToUtcMs() {
  const v = dtInput.value;
  if (!v) return Date.now();
  if (tzSelect.value === 'local') return new Date(v).getTime();
  let wall = v;
  if (wall.length === 16) wall += ':00';
  const wallAsUTC = Date.parse(wall + 'Z');
  if (isNaN(wallAsUTC)) return Date.now();
  return tzSelect.value === '7' ? wallAsUTC - 7 * 3600000 : wallAsUTC;
}

function setDtInputFromUtcMs(utcMs) {
  let offMin = 0;
  if (tzSelect.value === 'local') offMin = -new Date().getTimezoneOffset();
  else if (tzSelect.value === '7') offMin = 420;
  const d = new Date(utcMs + offMin * 60000);
  dtInput.value = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

function updateTargetPosition(ra, dec) {
  const p = skyPoint(ra, dec, R * 0.99);
  targetMesh.position.copy(p);
  targetGlow.position.copy(p);
  targetLabel.position.copy(p.clone().normalize().multiplyScalar(R * 1.1));
}

/** อัปเดตการหมุนของกลุ่มท้องฟ้าตาม LST และละติจูด (NCP ชี้ไปทิศเหนือ -Z) */
function updateSkyRotation(lstH, latDeg) {
  const t = lstH * 15 * D2R;   // LST เรเดียน
  const phi = latDeg * D2R;
  // ป้าย NCP: ยกสูงขึ้นจากทิศเหนือ (-Z) เท่ากับละติจูด phi (Alt_NCP = phi)
  ncpLabel.position.set(R * 0.34, R * Math.sin(phi) + 6, -R * Math.cos(phi));

  // เมทริกซ์หมุนจากกรอบศูนย์สูตรฟ้า → กรอบสามมิติของผู้สังเกต (x=E, y=U, z=−N)
  const st = Math.sin(t), ct = Math.cos(t);
  const sp = Math.sin(phi), cp = Math.cos(phi);
  const m = new THREE.Matrix4().set(
    -st,    ct,     0,   0,   // x = E
     ct*cp, st*cp,  sp,  0,   // y = U
     ct*sp, st*sp, -cp,  0,   // z = −N
     0,     0,      0,   1
  );
  skyGroup.quaternion.setFromRotationMatrix(m);
}

/** อัปเดตเส้นและมุมช่วยอ่านพิกัดขอบฟ้า (Alt/Az) ลากไปจนถึงจุดจอมฟ้า (Zenith) */
function updateAltAzVisuals(res) {
  const azDeg = res.azDeg ?? 0;
  const azRad = azDeg * D2R;
  const altDeg = res.altDeg;
  const altRad = altDeg * D2R;

  // คำนวณเวกเตอร์ ENU ที่ปลอดภัย ป้องกันค่า undefined หรือ NaN
  const E = (typeof res.E === 'number' && !isNaN(res.E)) ? res.E : Math.cos(altRad) * Math.sin(azRad);
  const N = (typeof res.N === 'number' && !isNaN(res.N)) ? res.N : Math.cos(altRad) * Math.cos(azRad);
  const U = (typeof res.U === 'number' && !isNaN(res.U)) ? res.U : Math.sin(altRad);

  // จุดขอบฟ้าของดาว (Foot point: x = R*sin(A), y = 0, z = -R*cos(A))
  const footPos = new THREE.Vector3(R * Math.sin(azRad), 0, -R * Math.cos(azRad));
  footMarker.position.copy(footPos);
  footLabel.position.copy(footPos.clone().multiplyScalar(1.08));

  // ตำแหน่งดาวเป้าหมายในกรอบขอบฟ้า (ENU)
  const starPos = new THREE.Vector3(
    E * R,
    U * R,
    -N * R
  );

  // 1. ส่วนโค้งมุมเงย (Altitude Arc, h) จากโคนดาวขึ้นหาเป้าหมาย (เส้นทึบเขียวสว่าง)
  const altPts = [];
  const altSteps = 32;
  for (let i = 0; i <= altSteps; i++) {
    const a = (i / altSteps) * altRad;
    altPts.push(new THREE.Vector3(
      R * Math.cos(a) * Math.sin(azRad),
      R * Math.sin(a),
      -R * Math.cos(a) * Math.cos(azRad)
    ));
  }
  updateLinePoints(altArcLine, altPts);

  // 2. ส่วนโค้งระยะจอมฟ้า (Zenith Distance: z = 90 - h) ต่อจากดาวขึ้นไปถึงจุดจอมฟ้า Z (0, R, 0)
  const zenPts = [];
  const zenSteps = 24;
  const halfPi = Math.PI * 0.5;
  for (let i = 0; i <= zenSteps; i++) {
    const a = altRad + (i / zenSteps) * (halfPi - altRad);
    zenPts.push(new THREE.Vector3(
      R * Math.cos(a) * Math.sin(azRad),
      R * Math.sin(a),
      -R * Math.cos(a) * Math.cos(azRad)
    ));
  }
  updateLinePoints(zenArcLine, zenPts);

  // 3. เส้นประดิ่ง (Drop Line) ทิ้งดิ่งลงระนาบขอบฟ้า
  updateLinePoints(altDropLine, [
    starPos,
    new THREE.Vector3(E * R, 0, -N * R)
  ]);

  // 4. ส่วนโค้งมุมทิศ (Azimuth Arc, A) บนระนาบขอบฟ้า จากทิศเหนือ (0°) เวียนตามเข็มนาฬิกา
  const azPts = [];
  const azSteps = Math.max(12, Math.ceil(azDeg / 4));
  const rAz = R * 0.94;
  for (let i = 0; i <= azSteps; i++) {
    const ang = (i / azSteps) * azRad;
    azPts.push(new THREE.Vector3(rAz * Math.sin(ang), 0.6, -rAz * Math.cos(ang)));
  }
  updateLinePoints(azArcLine, azPts);

  // 5. เส้นรัศมีจากจุดศูนย์กลางไปยังจุดขอบฟ้าของดาว
  updateLinePoints(footRayLine, [
    new THREE.Vector3(0, 0.4, 0),
    footPos.clone().multiplyScalar(0.96)
  ]);

  // อัปเดตป้ายกำกับมุมเงย h, ระยะจอมฟ้า z, และมุมทิศ A
  const midAltAng = altRad * 0.5;
  const midAltPos = new THREE.Vector3(
    R * 1.08 * Math.cos(midAltAng) * Math.sin(azRad),
    R * 1.08 * Math.sin(midAltAng),
    -R * 1.08 * Math.cos(midAltAng) * Math.cos(azRad)
  );
  altLabel.position.copy(midAltPos);
  updateLabel(altLabel, `มุมเงย h = ${altDeg >= 0 ? '+' : ''}${altDeg.toFixed(1)}°`, '#38ef7d', 'rgba(10,26,20,0.88)', 6.2);

  const zenDistDeg = 90 - altDeg;
  const midZenAng = (altRad + halfPi) * 0.5;
  const midZenPos = new THREE.Vector3(
    R * 1.08 * Math.cos(midZenAng) * Math.sin(azRad),
    R * 1.08 * Math.sin(midZenAng),
    -R * 1.08 * Math.cos(midZenAng) * Math.cos(azRad)
  );
  zenLabel.position.copy(midZenPos);
  updateLabel(zenLabel, `ระยะจอมฟ้า z = ${zenDistDeg.toFixed(1)}°`, '#7dd6a8', 'rgba(10,26,20,0.88)', 5.6);

  const midAzAng = azRad * 0.5;
  const midAzPos = new THREE.Vector3(
    rAz * 0.78 * Math.sin(midAzAng),
    1.2,
    -rAz * 0.78 * Math.cos(midAzAng)
  );
  azLabel.position.copy(midAzPos);
  updateLabel(azLabel, `มุมทิศ A = ${azDeg.toFixed(1)}° (${azToCompass(azDeg)})`, '#38ef7d', 'rgba(10,26,20,0.88)', 6.2);
}

/** อัปเดตเส้นทางเดินปรากฏประจำวันของดาว (Diurnal Path) ในกรอบของผู้สังเกต */
function updateDiurnalPath(decDeg, latDeg) {
  const dRad = decDeg * D2R;
  const phiRad = latDeg * D2R;
  const cosD = Math.cos(dRad), sinD = Math.sin(dRad);
  const cosPhi = Math.cos(phiRad), sinPhi = Math.sin(phiRad);

  // วาดวงกลม 24 ชม. ของการหมุนรอบแกนขั้วฟ้า
  const pts = [];
  const steps = 128;
  for (let i = 0; i <= steps; i++) {
    const H = (i / steps) * Math.PI * 2;
    const cosH = Math.cos(H), sinH = Math.sin(H);
    const E = -cosD * sinH;
    const N = sinD * cosPhi - cosD * cosH * sinPhi;
    const U = sinD * sinPhi + cosD * cosH * cosPhi;
    pts.push(new THREE.Vector3(E * R, U * R, -N * R));
  }
  updateLinePoints(diurnalLine, pts);

  // 1. จุดผ่านเมริเดียนสูงสุด (Upper Culmination: H = 0)
  const culmN = sinD * cosPhi - cosD * sinPhi;
  const culmU = sinD * sinPhi + cosD * cosPhi;
  const culmPos = new THREE.Vector3(0, culmU * R, -culmN * R);
  culmMarker.position.copy(culmPos);
  culmLabel.position.copy(culmPos.clone().multiplyScalar(1.09));
  const maxAlt = 90 - Math.abs(latDeg - decDeg);
  updateLabel(culmLabel, `ผ่านเมริเดียนสูงสุด (h = ${maxAlt.toFixed(1)}°)`, '#f59e0b', 'rgba(32,20,8,0.88)', 5.5);

  // 2. จุดขึ้นและจุดตก (ถ้าดาวขึ้น/ตกตามขอบฟ้า: |tan φ * tan δ| <= 1)
  const tanProd = Math.tan(phiRad) * Math.tan(dRad);
  if (Math.abs(tanProd) <= 1) {
    const H0 = Math.acos(-tanProd); // เรเดียน
    // จุดขึ้น (ตะวันออก E > 0: H = -H0)
    const riseE = -cosD * Math.sin(-H0);
    const riseN = sinD * cosPhi - cosD * Math.cos(-H0) * sinPhi;
    const risePos = new THREE.Vector3(riseE * R, 0, -riseN * R);
    riseMarker.visible = true;
    riseLabel.visible = labelsVisible && showDiurnal;
    riseMarker.position.copy(risePos);
    riseLabel.position.copy(risePos.clone().multiplyScalar(1.08));

    // จุดตก (ตะวันตก E < 0: H = +H0)
    const setE = -cosD * Math.sin(H0);
    const setN = sinD * cosPhi - cosD * Math.cos(H0) * sinPhi;
    const setPos = new THREE.Vector3(setE * R, 0, -setN * R);
    setMarker.visible = true;
    setLabel.visible = labelsVisible && showDiurnal;
    setMarker.position.copy(setPos);
    setLabel.position.copy(setPos.clone().multiplyScalar(1.08));
  } else {
    riseMarker.visible = false;
    riseLabel.visible = false;
    setMarker.visible = false;
    setLabel.visible = false;
  }
}

/** อัปเดตเส้นและมุมช่วยอ่านพิกัดศูนย์สูตร (RA/Dec) */
function updateRaDecVisuals(ra, dec) {
  // 1. วงกลมชั่วโมงผ่านดาว (Hour circle: จาก NCP ผ่านดาวไป SCP)
  const hourPts = [];
  for (let i = 0; i <= 64; i++) {
    const d = -90 + (i / 64) * 180;
    hourPts.push(skyPoint(ra, d, R * 0.998));
  }
  updateLinePoints(hourCircleLine, hourPts);

  // 2. ส่วนโค้งเดคลิเนชัน (Declination Arc, δ) จากศูนย์สูตรฟ้า (Dec 0) ไปหาดาว
  const decPts = [];
  const decSteps = 32;
  for (let i = 0; i <= decSteps; i++) {
    const d = (i / decSteps) * dec;
    decPts.push(skyPoint(ra, d, R * 1.004));
  }
  updateLinePoints(decArcLine, decPts);

  // 3. ส่วนโค้งไรต์แอสเซนชัน (RA Arc, α) จากจุดวสันตวิษุวัต (RA 0) ไปหา RA ของดาว
  const raPts = [];
  const raSteps = Math.max(12, Math.ceil(ra * 2.5));
  for (let i = 0; i <= raSteps; i++) {
    const r = (i / raSteps) * ra;
    raPts.push(skyPoint(r, 0, R * 1.004));
  }
  updateLinePoints(raArcLine, raPts);

  // 4. จุดตัดบนเส้นศูนย์สูตรฟ้า
  const eqFootPos = skyPoint(ra, 0, R);
  eqFootMarker.position.copy(eqFootPos);
  eqFootLabel.position.copy(skyPoint(ra, 0, R * 1.12));

  // 5. ป้ายกำกับ Dec δ และ RA α
  const midDecPos = skyPoint(ra, dec * 0.5, R * 1.12);
  decLabel.position.copy(midDecPos);
  updateLabel(decLabel, `เดคลิเนชัน δ = ${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°`, '#38bdf8', 'rgba(10,20,40,0.88)', 6.2);

  const midRaPos = skyPoint(ra * 0.5, 0, R * 1.12);
  raLabel.position.copy(midRaPos);
  updateLabel(raLabel, `ไรต์แอสเซนชัน α = ${ra.toFixed(2)} ชม. (${(ra * 15).toFixed(1)}°)`, '#818cf8', 'rgba(18,14,38,0.88)', 6.2);
}

/** ฟังก์ชันหลัก: อ่านค่า คำนวณ และแสดงผลทั้งหมด (รองรับทั้ง 2 โหมด) */
function recompute() {
  const lat = Math.max(-90, Math.min(90, parseFloat(latInput.value) || 0));
  const lon = Math.max(-180, Math.min(180, parseFloat(lonInput.value) || 0));

  const jd = jdFromDate(new Date(inputToUtcMs()));
  const gmst = gmstHours(jd);
  const lst = lstHours(jd, lon);

  let ra, dec, res, haSigned;

  if (currentInputMode === 'horizontal') {
    // โหมดระบุพิกัดขอบฟ้า (Alt/Az) → แปลงกลับเป็นพิกัดศูนย์สูตรฟ้า (RA/Dec)
    const alt = Math.max(-90, Math.min(90, parseFloat(altInput.value) || 0));
    const az = ((parseFloat(azInput.value) || 0) % 360 + 360) % 360;
    const inv = horizontalToEquatorial(alt, az, lat, lst);

    ra = inv.raHours;
    dec = inv.decDeg;
    const altRad = alt * D2R;
    const azRad = az * D2R;
    const E = Math.cos(altRad) * Math.sin(azRad);
    const N = Math.cos(altRad) * Math.cos(azRad);
    const U = Math.sin(altRad);
    res = { altDeg: alt, azDeg: az, E, N, U };
    haSigned = inv.haHours > 12 ? inv.haHours - 24 : inv.haHours;

    // ซิงค์ค่าไปยังช่อง RA/Dec เผื่อผู้ใช้สลับโหมดกลับ
    raInput.value = ra.toFixed(4);
    decInput.value = dec.toFixed(4);
  } else {
    // โหมดระบุพิกัดศูนย์สูตรฟ้า (RA/Dec) → แปลงเป็นพิกัดขอบฟ้า (Alt/Az)
    ra = ((parseFloat(raInput.value) || 0) % 24 + 24) % 24;
    dec = Math.max(-90, Math.min(90, parseFloat(decInput.value) || 0));
    res = equatorialToHorizontal(ra, dec, lat, lst);
    const ha = ((lst - ra) % 24 + 24) % 24;
    haSigned = ha > 12 ? ha - 24 : ha;

    // ซิงค์ค่าไปยังช่อง Alt/Az เผื่อผู้ใช้สลับโหมด
    altInput.value = res.altDeg.toFixed(2);
    azInput.value = (res.azDeg !== null ? res.azDeg : 0).toFixed(2);
  }

  updateSkyRotation(lst, lat);
  updateTargetPosition(ra, dec);
  updateAltAzVisuals(res);
  updateDiurnalPath(dec, lat);
  updateRaDecVisuals(ra, dec);

  const above = res.altDeg > 0;
  const col = above ? 0xf2c14e : 0xe86a6a;
  targetMesh.material.color.setHex(col);
  targetGlow.material.color.setHex(col);
  targetGlow.material.opacity = above ? 0.22 : 0.12;

  // อัปเดตแสดงผลตัวเลข
  $('lstOut').textContent = hoursToHMS(lst);
  $('gmstOut').textContent = `GMST ${hoursToHMS(gmst)}`;
  $('haOut').textContent = `${haSigned.toFixed(3)} ชม. (${(haSigned * 15).toFixed(1)}°)`;
  if (haSubOut) {
    haSubOut.textContent = haSigned < 0 ? 'ลบ = ซีกฟ้าตะวันออก (ยังไม่ถึงเมริเดียน)' : 'บวก = ซีกฟ้าตะวันตก (เลยเมริเดียนแล้ว)';
  }

  $('altOut').textContent = `${res.altDeg.toFixed(3)}°`;
  $('altDmsOut').textContent = degToDMS(res.altDeg);

  if (res.azDeg === null) {
    $('azOut').textContent = 'ไม่นิยาม';
    $('azDmsOut').textContent = 'ตรงจุดจอมฟ้าพอดี';
  } else {
    $('azOut').textContent = `${res.azDeg.toFixed(3)}°`;
    $('azDmsOut').textContent = `${degToDMS(res.azDeg)} (${azToCompass(res.azDeg)})`;
  }

  if (raResultOut) raResultOut.textContent = `${ra.toFixed(4)} ชม.`;
  if (raHmsOut) raHmsOut.textContent = hoursToHMS(ra);
  if (decResultOut) decResultOut.textContent = `${dec >= 0 ? '+' : ''}${dec.toFixed(4)}°`;
  if (decDmsOut) decDmsOut.textContent = degToDMS(dec);

  const maxAlt = 90 - Math.abs(lat - dec);
  $('maxAltOut').textContent = `${maxAlt.toFixed(1)}°`;

  const status = $('statusOut');
  if (above) {
    status.className = 'status-line';
    status.textContent = `อยู่เหนือขอบฟ้าเชิงเรขาคณิตที่มุมเงย ${res.altDeg.toFixed(1)}° (สามารถสังเกตเห็นได้)`;
  } else {
    status.className = 'status-line below';
    status.textContent = `ขณะนี้อยู่ใต้ระนาบขอบฟ้า (${res.altDeg.toFixed(1)}°) — ยังมองไม่เห็นจากตำแหน่งนี้`;
  }
}

/* =====================================================================
   ส่วนที่ 4 — ผูกแถบเครื่องมือควบคุมการแสดงผลและเดินเวลา
   สถานะเริ่มต้นออกแบบเพื่อความสบายตา (Anti-Clutter):
   - เปิดเฉพาะ Alt/Az, ระนาบขอบฟ้า, ป้ายกำกับ, และกริด
   - ปิด RA/Dec, เส้นทางดาว, และสุริยะวิถีไว้ก่อน (กดเปิดได้ทันทีที่ต้องการ)
   ===================================================================== */
let showAltAz = true;
let showRaDec = false;     // ปิดเริ่มต้น เพื่อไม่ให้รก
let showDiurnal = false;   // ปิดเริ่มต้น จะเปิดเมื่อกดเดินเวลา หรือคลิกดูทางเดินดาว
let showEcliptic = false;  // ปิดเริ่มต้น ซ่อนสุริยะวิถีไว้ก่อน
let showGround = true;     // เปิดเริ่มต้น
let showGrid = true;       // เปิดเริ่มต้น

// กำหนดการมองเห็นของแต่ละกลุ่มตามสถานะเริ่มต้น
altAzGroup.visible = showAltAz;
raDecGroup.visible = showRaDec;
diurnalGroup.visible = showDiurnal;
eclipticGroup.visible = showEcliptic;
groundSurfaceGroup.visible = showGround;
gridGroup.visible = showGrid;

const toggleAltAzBtn = $('toggleAltAz');
const toggleRaDecBtn = $('toggleRaDec');
const toggleDiurnalBtn = $('toggleDiurnalPath');
const toggleEclipticBtn = $('toggleEcliptic');
const toggleGroundBtn = $('toggleGround');
const toggleLabelsBtn = $('toggleLabels');
const toggleGridBtn = $('toggleGrid');
const toolBtnPlay = $('toolBtnPlay');
const btnResetView = $('btnResetView');

// ปุ่มเดินเวลาและการจำลองเวลา
const btnPlayPause = $('btnPlayPause');
const playIcon = $('playIcon');
const playText = $('playText');

let isTimeFlowing = false;
let animSpeed = 600; // ค่าเริ่มต้น: 600 เท่า (10 นาทีต่อ 1 วินาทีจริง)
let lastFrameTime = performance.now();

function updatePlayPauseUI() {
  if (btnPlayPause) {
    btnPlayPause.classList.toggle('playing', isTimeFlowing);
    if (playIcon) playIcon.textContent = isTimeFlowing ? '⏸' : '▶';
    if (playText) playText.textContent = isTimeFlowing ? 'หยุดเวลา' : 'เดินเวลา';
  }
  if (toolBtnPlay) {
    toolBtnPlay.classList.toggle('active', isTimeFlowing);
    toolBtnPlay.innerHTML = isTimeFlowing ? '<span>⏸</span> หยุดเวลา' : '<span>▶</span> เดินเวลา';
  }
}

function togglePlayPause() {
  isTimeFlowing = !isTimeFlowing;
  if (isTimeFlowing) {
    // หากเส้นทางดาวยังปิดอยู่ ให้เปิดให้อัตโนมัติเมื่อกดเดินเวลาเพื่อให้นักเรียนเห็นเส้นทางการเคลื่อนที่
    if (!showDiurnal) {
      showDiurnal = true;
      diurnalGroup.visible = true;
      if (toggleDiurnalBtn) {
        toggleDiurnalBtn.classList.add('active-amber');
        toggleDiurnalBtn.setAttribute('aria-pressed', 'true');
      }
    }
    if (liveCheck.checked) {
      liveCheck.checked = false;
      clearInterval(liveTimer);
      liveTimer = null;
      dtInput.disabled = false;
    }
    lastFrameTime = performance.now();
  }
  updatePlayPauseUI();
}

if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
if (toolBtnPlay) toolBtnPlay.addEventListener('click', togglePlayPause);

// ปุ่มเลือกความเร็วเดินเวลา
document.querySelectorAll('.chip-speed').forEach((btn) => {
  btn.addEventListener('click', () => {
    animSpeed = parseFloat(btn.dataset.speed) || 600;
    document.querySelectorAll('.chip-speed').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ปุ่มก้าวเวลาทีละสเต็ป
document.querySelectorAll('.chip-step').forEach((btn) => {
  btn.addEventListener('click', () => {
    const stepSec = parseFloat(btn.dataset.step) || 0;
    const currentMs = inputToUtcMs();
    setDtInputFromUtcMs(currentMs + stepSec * 1000);
    recompute();
  });
});

if (toggleAltAzBtn) {
  toggleAltAzBtn.addEventListener('click', () => {
    showAltAz = !showAltAz;
    altAzGroup.visible = showAltAz;
    toggleAltAzBtn.classList.toggle('active-green', showAltAz);
    toggleAltAzBtn.setAttribute('aria-pressed', String(showAltAz));
  });
}

if (toggleRaDecBtn) {
  toggleRaDecBtn.addEventListener('click', () => {
    showRaDec = !showRaDec;
    raDecGroup.visible = showRaDec;
    toggleRaDecBtn.classList.toggle('active-blue', showRaDec);
    toggleRaDecBtn.setAttribute('aria-pressed', String(showRaDec));
  });
}

if (toggleDiurnalBtn) {
  toggleDiurnalBtn.addEventListener('click', () => {
    showDiurnal = !showDiurnal;
    diurnalGroup.visible = showDiurnal;
    toggleDiurnalBtn.classList.toggle('active-amber', showDiurnal);
    toggleDiurnalBtn.setAttribute('aria-pressed', String(showDiurnal));
  });
}

if (toggleEclipticBtn) {
  toggleEclipticBtn.addEventListener('click', () => {
    showEcliptic = !showEcliptic;
    eclipticGroup.visible = showEcliptic;
    toggleEclipticBtn.classList.toggle('active-amber', showEcliptic);
    toggleEclipticBtn.setAttribute('aria-pressed', String(showEcliptic));
  });
}

if (toggleGroundBtn) {
  toggleGroundBtn.addEventListener('click', () => {
    showGround = !showGround;
    groundSurfaceGroup.visible = showGround;
    toggleGroundBtn.classList.toggle('active', showGround);
    toggleGroundBtn.setAttribute('aria-pressed', String(showGround));
  });
}

if (toggleLabelsBtn) {
  toggleLabelsBtn.addEventListener('click', () => {
    labelsVisible = !labelsVisible;
    allLabels.forEach((lbl) => {
      lbl.visible = labelsVisible;
    });
    toggleLabelsBtn.classList.toggle('active', labelsVisible);
    toggleLabelsBtn.setAttribute('aria-pressed', String(labelsVisible));
  });
}

if (toggleGridBtn) {
  toggleGridBtn.addEventListener('click', () => {
    showGrid = !showGrid;
    gridGroup.visible = showGrid;
    observerMeridian.visible = showGrid;
    toggleGridBtn.classList.toggle('active', showGrid);
    toggleGridBtn.setAttribute('aria-pressed', String(showGrid));
  });
}

if (btnResetView) {
  btnResetView.addEventListener('click', () => {
    camState.theta = DEFAULT_CAM.theta;
    camState.phi = DEFAULT_CAM.phi;
    camState.radius = DEFAULT_CAM.radius;
    applyCamera();
  });
}

/* ---- ควบคุมเมนูลิ้นชักด้านข้าง (YouTube-Style Side Drawer) ---- */
const menuToggle = $('menuToggle');
const drawerClose = $('drawerClose');
const drawerBackdrop = $('drawerBackdrop');
const btnBrowseAllSims = $('btnBrowseAllSims');
const btnQuickOverview = $('btnQuickOverview');

function openDrawer() {
  document.body.classList.add('drawer-open');
}
function closeDrawer() {
  document.body.classList.remove('drawer-open');
}

if (menuToggle) menuToggle.addEventListener('click', openDrawer);
if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
if (btnBrowseAllSims) btnBrowseAllSims.addEventListener('click', openDrawer);
if (btnQuickOverview) btnQuickOverview.addEventListener('click', closeDrawer);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) {
    closeDrawer();
  }
});

/* ---- ผูกเหตุการณ์สลับโหมดพิกัดสองทาง (Equatorial vs Horizontal) ---- */
function setInputMode(mode) {
  currentInputMode = mode;
  if (mode === 'equatorial') {
    if (modeEquatorial) modeEquatorial.classList.add('active');
    if (modeHorizontal) modeHorizontal.classList.remove('active');
    if (boxEquatorialInputs) boxEquatorialInputs.style.display = 'block';
    if (boxHorizontalInputs) boxHorizontalInputs.style.display = 'none';
    if (resBoxAlt) resBoxAlt.classList.add('highlight-calc');
    if (resBoxAz) resBoxAz.classList.add('highlight-calc');
    if (resBoxRa) resBoxRa.classList.remove('highlight-calc');
    if (resBoxDec) resBoxDec.classList.remove('highlight-calc');
  } else {
    if (modeHorizontal) modeHorizontal.classList.add('active');
    if (modeEquatorial) modeEquatorial.classList.remove('active');
    if (boxHorizontalInputs) boxHorizontalInputs.style.display = 'block';
    if (boxEquatorialInputs) boxEquatorialInputs.style.display = 'none';
    if (resBoxRa) resBoxRa.classList.add('highlight-calc');
    if (resBoxDec) resBoxDec.classList.add('highlight-calc');
    if (resBoxAlt) resBoxAlt.classList.remove('highlight-calc');
    if (resBoxAz) resBoxAz.classList.remove('highlight-calc');
  }
  recompute();
}

if (modeEquatorial) modeEquatorial.addEventListener('click', () => setInputMode('equatorial'));
if (modeHorizontal) modeHorizontal.addEventListener('click', () => setInputMode('horizontal'));

if (altInput) altInput.addEventListener('input', () => { if (currentInputMode === 'horizontal') recompute(); });
if (azInput) azInput.addEventListener('input', () => { if (currentInputMode === 'horizontal') recompute(); });

document.querySelectorAll('.chip-target[data-altaz]').forEach((chip) => {
  chip.addEventListener('click', () => {
    const [altVal, azVal] = chip.dataset.altaz.split(',').map(Number);
    altInput.value = altVal;
    azInput.value = azVal;
    setInputMode('horizontal');
  });
});

/* ---- ผูกเหตุการณ์ UI สำหรับฟอร์ม ---- */
for (const input of [raInput, decInput, latInput, lonInput]) {
  input.addEventListener('input', () => { starPreset.value = '-1'; recompute(); });
}
dtInput.addEventListener('input', recompute);
tzSelect.addEventListener('change', recompute);

starPreset.addEventListener('change', () => {
  const i = parseInt(starPreset.value, 10);
  if (i >= 0) {
    raInput.value = STARS[i].ra;
    decInput.value = STARS[i].dec;
  }
  recompute();
});

document.querySelectorAll('.chip[data-loc]').forEach((chip) => {
  chip.addEventListener('click', () => {
    const [la, lo] = chip.dataset.loc.split(',').map(Number);
    latInput.value = la;
    lonInput.value = lo;
    document.querySelectorAll('.chip[data-loc]').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    recompute();
  });
});

let liveTimer = null;
liveCheck.addEventListener('change', () => {
  if (liveCheck.checked) {
    if (isTimeFlowing) togglePlayPause();
    dtInput.disabled = true;
    liveTimer = setInterval(() => { dtInput.value = nowStringInZone(); recompute(); }, 1000);
  } else {
    dtInput.disabled = false;
    clearInterval(liveTimer);
    liveTimer = null;
  }
});

// โหมดสว่าง/มืด
(function () {
  const t = document.querySelector('[data-theme-toggle]');
  if (!t) return;
  let dark = true;
  document.documentElement.setAttribute('data-theme', 'dark');
  t.addEventListener('click', () => {
    dark = !dark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    t.setAttribute('aria-label', dark ? 'สลับไปโหมดสว่าง' : 'สลับไปโหมดมืด');
    groundDome.material.color.setHex(dark ? 0x0a0e1e : 0x9fb0cf);
    groundDome.material.opacity = dark ? 0.82 : 0.55;
  });
})();

/* =====================================================================
   ส่วนที่ 5 — ลูป Animation
   ===================================================================== */
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  if (isTimeFlowing) {
    const dtSec = (now - lastFrameTime) / 1000;
    const currentMs = inputToUtcMs();
    const nextMs = currentMs + dtSec * animSpeed * 1000;
    setDtInputFromUtcMs(nextMs);
    recompute();
  }
  lastFrameTime = now;
  renderer.render(scene, camera);
}

let appStarted = false;
function startOnce() {
  if (appStarted) return;
  appStarted = true;
  recompute();
  animate();
}

document.fonts.ready.then(startOnce);
setTimeout(startOnce, 1200);
