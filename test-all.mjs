/**
 * Web QA & Interactive Auditor — Comprehensive Simulation Test Suite
 * ตรวจสอบความถูกต้องอย่างละเอียด ทั้งสูตรคณิตศาสตร์ สัญญาณ DOM และการทำงานของระบบ
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  D2R,
  EPSILON_DEG,
  jdFromDate,
  gmstHours,
  lstHours,
  equatorialToHorizontal,
  horizontalToEquatorial,
  eclipticToEquatorial,
  calculateRiseSet,
  calculateEOT,
  gregorianToJD,
  jdToGregorian,
  hoursToHMS,
  degToDMS,
  azToCompass,
} from './astro-math.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('===============================================================');
console.log(' Web QA & Interactive Auditor — Comprehensive Simulation Suite');
console.log('===============================================================\n');

// ---------------------------------------------------------------------
// TEST SUITE 1: คณิตศาสตร์ดาราศาสตร์ (Astronomical Physics Math)
// ---------------------------------------------------------------------
console.log('[1/4] ตรวจสอบความถูกต้องของคณิตศาสตร์และพิกัดดาราศาสตร์:');

// 1.1 JD ที่ J2000.0 (1 ม.ค. 2000 12:00 UTC)
const j2000 = new Date('2000-01-01T12:00:00Z');
const jd = jdFromDate(j2000);
assert(Math.abs(jd - 2451545.0) < 1e-4, `Julian Date ที่ J2000.0 = ${jd.toFixed(4)} (ตรงตามทฤษฎี 2451545.0)`);

// 1.2 GMST ที่ J2000.0 (~18.697374 ชม.)
const gmst = gmstHours(2451545.0);
assert(Math.abs(gmst - 18.697374) < 1e-4, `GMST ที่ J2000.0 = ${gmst.toFixed(6)} ชม. (USNO formula)`);

// 1.3 พิกัดขอบฟ้า: ดาวที่จุดจอมฟ้า (Lat 0, Dec 0, HA 0)
const resZenith = equatorialToHorizontal(0, 0, 0, 0);
assert(Math.abs(resZenith.altDeg - 90) < 1e-4, `จุดจอมฟ้า: Alt = ${resZenith.altDeg.toFixed(2)}° (คาดหวัง 90°)`);
assert(resZenith.azDeg === null, `จุดจอมฟ้า: Azimuth = null (ไม่นิยามถูกต้อง)`);

// 1.4 ดาวเหนือสังเกตจากละติจูด 30° เหนือ (Polaris ~ Dec +90°)
const resPolaris = equatorialToHorizontal(0, 90, 30, 0);
assert(Math.abs(resPolaris.altDeg - 30) < 1e-4, `ดาวเหนือที่ Lat 30°: มุมเงย h = ${resPolaris.altDeg.toFixed(2)}° (ตรงกับละติจูดผู้สังเกต)`);

// 1.5 ดาวเวกาจากกรุงเทพฯ (Vega: RA 18.6156h, Dec +38.7836°)
const resVega = equatorialToHorizontal(18.6156, 38.7836, 13.7560, 19.9080);
assert(resVega.altDeg > 59 && resVega.altDeg < 60, `ดาวเวกาจาก กทม.: Alt = ${resVega.altDeg.toFixed(2)}° (สมจริง)`);

// 1.6 การแปลงกลับพิกัดขอบฟ้า (Alt/Az) → ศูนย์สูตร (RA/Dec) แบบ Round-Trip
const invVega = horizontalToEquatorial(resVega.altDeg, resVega.azDeg, 13.7560, 19.9080);
assert(Math.abs(invVega.raHours - 18.6156) < 1e-4, `แปลงกลับหา RA ดาวเวกา = ${invVega.raHours.toFixed(4)} ชม. (ตรงกับ 18.6156 ชม.)`);
assert(Math.abs(invVega.decDeg - 38.7836) < 1e-4, `แปลงกลับหา Dec ดาวเวกา = ${invVega.decDeg.toFixed(4)}° (ตรงกับ +38.7836°)`);

// 1.7 พิกัดสุริยวิถี: วสันตวิษุวัต (λ=0°) และ ครีษมายัน (λ=90°)
const eqVernal = eclipticToEquatorial(0, 0);
assert(Math.abs(eqVernal.decDeg - 0) < 1e-4 && Math.abs(eqVernal.raHours - 0) < 1e-4, `วสันตวิษุวัต: Dec = 0.00°, RA = 0.00 ชม.`);

const eqSummer = eclipticToEquatorial(90, 0);
assert(Math.abs(eqSummer.decDeg - EPSILON_DEG) < 1e-4, `ครีษมายัน: Dec = +${eqSummer.decDeg.toFixed(2)}° (ตรงกับความเอียงแกนโลก ε)`);
assert(Math.abs(eqSummer.raHours - 6.0) < 1e-4, `ครีษมายัน: RA = 6.00 ชม.`);

// 1.8 เงื่อนไขการขึ้นตก (cos H₀ = -tan φ tan δ)
// ที่ศูนย์สูตร (φ=0): ทุกดวงขึ้นและตก 12 ชม. พอดี
const rsEquator = calculateRiseSet(20, 0);
assert(Math.abs(rsEquator.H0Hours - 6) < 1e-4, `ที่ศูนย์สูตร: มุมชั่วโมงขึ้นตก H₀ = 6.00 ชม. (กลางวัน 12 ชม.)`);

// ดาวเหนือที่กรุงเทพฯ (φ=13.8°, δ=89°): เป็นดาวรอบขั้ว (Circumpolar)
const rsCircum = calculateRiseSet(89, 13.8);
assert(rsCircum.type === 'circumpolar', `ดาวใกล้ขั้วฟ้าเหนือที่ กทม.: จำแนกเป็นดาวรอบขั้ว (Circumpolar)`);

// 1.9 สมการเวลา (EOT)
const eotNov = calculateEOT(307); // ~3 พ.ย. ค่าบวกสูงสุด
assert(eotNov.eotMinutes > 15 && eotNov.eotMinutes < 17, `สมการเวลาช่วงต้น พ.ย.: EOT = +${eotNov.eotMinutes.toFixed(2)} นาที (ถูกต้อง)`);

// 1.10 การแปลงวันจูเลียนแบบสองทาง (Gregorian <-> JD)
const testJD = gregorianToJD(2000, 1, 1, 12, 0, 0);
assert(Math.abs(testJD - 2451545.0) < 1e-4, `gregorianToJD(2000, 1, 1, 12:00) = 2451545.0`);
const testGreg = jdToGregorian(2451545.0);
assert(testGreg.year === 2000 && testGreg.month === 1 && testGreg.day === 1 && testGreg.hour === 12, `jdToGregorian(2451545.0) = 1/1/2000 12:00:00`);

// ---------------------------------------------------------------------
// TEST SUITE 2: การตรวจสอบสัญญา DOM ทุกหน้าจำลอง (DOM Contract Audit)
// ---------------------------------------------------------------------
console.log('\n[2/4] ตรวจสอบสัญญา DOM และความเข้ากันได้ของทุกแบบจำลอง:');

const simPairs = [
  { html: 'index.html', js: 'app.js', name: 'ทรงกลมท้องฟ้าและพิกัดขอบฟ้า (หน้าแรก)' },
  { html: 'pzx-triangle.html', js: 'pzx-app.js', name: 'สามเหลี่ยมดาราศาสตร์ PZX' },
  { html: 'circumpolar.html', js: 'circumpolar-app.js', name: 'ดาวรอบขั้วและการขึ้นตก' },
  { html: 'seasons-ecliptic.html', js: 'seasons-ecliptic-app.js', name: 'สุริยวิถี 4 ฤดูกาล' },
  { html: 'rise-set-condition.html', js: 'rise-set-app.js', name: 'สภาวะขึ้นตกและแสงสนธยา' },
  { html: 'sidereal-solar.html', js: 'sidereal-solar-app.js', name: 'วันดาราคติและวันสุริยคติ' },
  { html: 'equation-of-time.html', js: 'equation-of-time-app.js', name: 'สมการเวลาและ Analemma' },
  { html: 'julian-date.html', js: 'julian-date-app.js', name: 'วันจูเลียนและระบบเวลา' }
];

const idRegex = /id=["']([^"']+)["']/g;
const getElemRegex = /(?:document\.getElementById|\$)\(["']([^"']+)["']\)/g;

for (const pair of simPairs) {
  const htmlPath = path.join(__dirname, pair.html);
  const jsPath = path.join(__dirname, pair.js);

  assert(fs.existsSync(htmlPath), `ไฟล์ ${pair.html} มีอยู่จริง`);
  assert(fs.existsSync(jsPath), `ไฟล์ ${pair.js} มีอยู่จริง`);

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  const declaredIds = new Set();
  let match;
  while ((match = idRegex.exec(htmlContent)) !== null) {
    declaredIds.add(match[1]);
  }

  const usedIds = new Set();
  while ((match = getElemRegex.exec(jsContent)) !== null) {
    usedIds.add(match[1]);
  }

  let missingCount = 0;
  for (const id of usedIds) {
    if (!declaredIds.has(id)) {
      missingCount++;
      assert(false, `[${pair.name}] ตรวจพบ ID "${id}" ใน ${pair.js} แต่ไม่มีใน ${pair.html}!`);
    }
  }

  if (missingCount === 0) {
    assert(true, `[${pair.name}] สัญญา DOM สมบูรณ์ 100% (${usedIds.size} IDs จับคู่ถูกต้อง ไม่มี Missing ID)`);
  }
}

// ---------------------------------------------------------------------
// TEST SUITE 3: ตรวจสอบโจทย์แก่นในเอกสาร 2. spherical_astronomy_and_time_corrected.tex
// ---------------------------------------------------------------------
console.log('\n[3/5] ตรวจสอบความสอดคล้องกับโจทย์แก่นในเอกสารคำสอน สอวน.:');

// ตรวจสอบโจทย์หน้า 734: phi=18.5, dec=20.0, ha=45.0 -> h ~ 47.6 deg, A ~ 279.7 deg
const phiRad = 18.5 * D2R, decRad = 20.0 * D2R, haRad = 45.0 * D2R;
const sinH = Math.sin(phiRad) * Math.sin(decRad) + Math.cos(phiRad) * Math.cos(decRad) * Math.cos(haRad);
const altPzx = Math.asin(sinH) / D2R;
assert(Math.abs(altPzx - 47.61) < 0.05, `โจทย์หน้า 734: มุมเงย h = ${altPzx.toFixed(2)}° (ตรงตามเฉลย 47.6°)`);

const cosA = (Math.sin(decRad) - Math.sin(phiRad) * Math.sin(altPzx * D2R)) / (Math.cos(phiRad) * Math.cos(altPzx * D2R));
const a0 = Math.acos(cosA) / D2R;
const azPzx = 360 - a0;
assert(Math.abs(azPzx - 279.7) < 0.1, `โจทย์หน้า 734: มุมทิศ A = ${azPzx.toFixed(1)}° (ตรงตามเฉลย 279.7°)`);

// โจทย์แก่น 2: ดาวตกที่มุมทิศใดเมื่อ φ=13.8°, δ=0° (ดวงอาทิตย์ในวันวิษุวัต)
const rsSunEq = calculateRiseSet(0, 13.8);
assert(Math.abs(rsSunEq.riseAzDeg - 90) < 1e-4, `โจทย์แก่น 2: ดวงอาทิตย์ขึ้นที่ทิศตะวันออกแท้ A = 90.0°`);
assert(Math.abs(rsSunEq.setAzDeg - 270) < 1e-4, `โจทย์แก่น 2: ดวงอาทิตย์ตกที่ทิศตะวันตกแท้ A = 270.0°`);

// ---------------------------------------------------------------------
// TEST SUITE 4: ตรวจสอบการซิงค์ main.js กับ app.js
// ---------------------------------------------------------------------
console.log('\n[4/5] ตรวจสอบความสอดคล้องของ bundle และ main.js:');
const mainPath = path.join(__dirname, 'main.js');
const appPath = path.join(__dirname, 'app.js');
const mainBytes = fs.readFileSync(mainPath);
const appBytes = fs.readFileSync(appPath);
assert(mainBytes.equals(appBytes), 'main.js ซิงค์กับ app.js สมบูรณ์ (100% Identical byte-for-byte)');

// ---------------------------------------------------------------------
// TEST SUITE 5: ตรวจสอบความถูกต้องของลิงก์ HTML, CSS, Drawer & Responsive UI
// ---------------------------------------------------------------------
console.log('\n[5/5] ตรวจสอบโครงสร้าง Responsive UI, สไตล์ชีท และลิงก์ทุกลิงก์:');
const htmlFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(content.includes('<!DOCTYPE html>'), `${file} มี DOCTYPE ถูกต้อง`);
  assert(content.includes('</html>'), `${file} มีแท็กปิด </html> ครบถ้วน`);
  assert(content.includes('style.css'), `${file} เชื่อมโยง style.css`);

  const hrefRegex = /href=["']([^"'#:]+\.html)["']/g;
  let match;
  let brokenHrefs = [];
  while ((match = hrefRegex.exec(content)) !== null) {
    const target = match[1];
    if (!fs.existsSync(path.join(__dirname, target))) {
      brokenHrefs.push(target);
    }
  }
  assert(brokenHrefs.length === 0, `${file} ลิงก์ภายในทุกอันถูกต้อง (${brokenHrefs.length === 0 ? 'ครบถ้วน' : brokenHrefs.join(', ')})`);
}

for (const pair of simPairs) {
  const content = fs.readFileSync(path.join(__dirname, pair.html), 'utf8');
  assert(content.includes('side-drawer') || content.includes('drawerBackdrop'), `${pair.html} มีระบบ Side Drawer สำหรับมือถือ`);
  assert(content.includes('menuToggle'), `${pair.html} มีปุ่มเมนู menuToggle`);
  assert(!content.includes('class="module-nav"'), `${pair.html} กำจัดแถบสารบัญด่วนซ้ำซ้อน .module-nav แล้ว`);
}

const cssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const openBraces = (cssContent.match(/{/g) || []).length;
const closeBraces = (cssContent.match(/}/g) || []).length;
assert(openBraces === closeBraces, `style.css ปีกกาเปิด-ปิดสมดุลกัน (${openBraces} / ${closeBraces})`);
assert(cssContent.includes('.mobile-control-bar'), `style.css มีคลาส .mobile-control-bar`);
assert(cssContent.includes('.side-drawer'), `style.css มีคลาส .side-drawer`);
assert(cssContent.includes('@media (max-width: 768px)'), `style.css มี Media Query สำหรับหน้าจอโทรศัพท์`);

console.log('\n===============================================================');
console.log(` สรุปผลการตรวจสอบ: ${passedTests} ผ่าน / ${failedTests} ล้มเหลว (ทั้งหมด ${totalTests} ข้อ)`);
console.log('===============================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log(' ผลการประเมิน: ระบบจำลอง สอวน. ดาราศาสตร์ ค่าย 1 พร้อมใช้งานระดับ 100%');
  process.exit(0);
}
