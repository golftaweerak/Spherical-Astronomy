/**
 * วันจูเลียนและระบบเวลาดาราศาสตร์ (Julian Date & Time Systems)
 * สอวน. ดาราศาสตร์ ค่าย 1
 */

import {
  gregorianToJD,
  jdToGregorian,
  gmstHours,
  lstHours,
  hoursToHMS
} from "./astro-math.js";

// ---------------- DOM Elements ----------------
const dom = {
  chipJ2000: document.getElementById("chipJ2000"),
  chipWakor: document.getElementById("chipWakor"),
  chipMjdEpoch: document.getElementById("chipMjdEpoch"),
  chipLeap2000: document.getElementById("chipLeap2000"),
  chipNoLeap1900: document.getElementById("chipNoLeap1900"),
  chipNow: document.getElementById("chipNow"),

  modeFromCalendar: document.getElementById("modeFromCalendar"),
  modeFromJD: document.getElementById("modeFromJD"),
  boxCalendarInput: document.getElementById("boxCalendarInput"),
  boxJDInput: document.getElementById("boxJDInput"),

  inpYear: document.getElementById("inpYear"),
  inpMonth: document.getElementById("inpMonth"),
  inpDay: document.getElementById("inpDay"),
  inpHour: document.getElementById("inpHour"),
  inpMin: document.getElementById("inpMin"),
  inpSec: document.getElementById("inpSec"),
  inpTimezone: document.getElementById("inpTimezone"),

  inpDirectJD: document.getElementById("inpDirectJD"),
  inpDirectMJD: document.getElementById("inpDirectMJD"),

  obsLon: document.getElementById("obsLon"),
  valObsLon: document.getElementById("valObsLon"),

  jdEpochBadge: document.getElementById("jdEpochBadge"),
  jdEpochDesc: document.getElementById("jdEpochDesc"),

  resJD: document.getElementById("resJD"),
  resMJD: document.getElementById("resMJD"),
  resUT: document.getElementById("resUT"),
  resThaiTime: document.getElementById("resThaiTime"),
  resGMST: document.getElementById("resGMST"),
  resLST: document.getElementById("resLST"),
  resDayOfWeek: document.getElementById("resDayOfWeek"),
  resLeapStatus: document.getElementById("resLeapStatus"),

  btnStepMinusDay: document.getElementById("btnStepMinusDay"),
  btnStepMinusHour: document.getElementById("btnStepMinusHour"),
  btnToggleLiveClock: document.getElementById("btnToggleLiveClock"),
  liveIcon: document.getElementById("liveIcon"),
  btnStepPlusHour: document.getElementById("btnStepPlusHour"),
  btnStepPlusDay: document.getElementById("btnStepPlusDay"),

  clockCanvas: document.getElementById("clockCanvas"),

  menuToggle: document.getElementById("menuToggle"),
  sideDrawer: document.getElementById("sideDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerClose: document.getElementById("drawerClose"),
  btnBrowseAllSims: document.getElementById("btnBrowseAllSims")
};

// ---------------- สถานะแบบจำลอง ----------------
const state = {
  currentJD: 2451545.0,
  obsLonDeg: 100.5, // กรุงเทพฯ
  isLiveClock: false,
  mode: "calendar" // 'calendar' หรือ 'jd'
};

const DAY_NAMES = [
  "วันจันทร์ (Monday)",
  "วันอังคาร (Tuesday)",
  "วันพุธ (Wednesday)",
  "วันพฤหัสบดี (Thursday)",
  "วันศุกร์ (Friday)",
  "วันเสาร์ (Saturday)",
  "วันอาทิตย์ (Sunday)"
];

function isLeapYear(y) {
  if (y % 400 === 0) return true;
  if (y % 100 === 0) return false;
  return y % 4 === 0;
}

// ---------------- การคำนวณและอัปเดตแบบจำลอง ----------------
function updateSimulation() {
  const jd = state.currentJD;
  const mjd = jd - 2400000.5;

  // แปลง JD เป็นวันเวลาเกรกอเรียน (UT)
  const gregUT = jdToGregorian(jd);

  // คำนวณเวลาไทย (UTC+7)
  const jdThai = jd + 7 / 24;
  const gregThai = jdToGregorian(jdThai);

  // วันในสัปดาห์: (floor(JD + 0.5)) mod 7 โดย 0 = จันทร์
  const dowIdx = Math.floor(jd + 0.5) % 7;
  const dowName = DAY_NAMES[dowIdx];

  // GMST และ LST
  const gmst = gmstHours(jd);
  const lst = lstHours(jd, state.obsLonDeg);

  // ตรวจสอบปีอธิกสุรทิน
  const leap = isLeapYear(gregUT.year);

  // อัปเดตกล่องผลลัพธ์
  dom.resJD.textContent = jd.toFixed(6);
  dom.resMJD.textContent = mjd.toFixed(6);

  const pad2 = (n) => String(n).padStart(2, "0");
  dom.resUT.textContent = `${pad2(gregUT.hour)}:${pad2(gregUT.minute)}:${pad2(gregUT.second)} UT (${gregUT.day}/${gregUT.month}/${gregUT.year})`;
  dom.resThaiTime.textContent = `${pad2(gregThai.hour)}:${pad2(gregThai.minute)}:${pad2(gregThai.second)} น. (${gregThai.day}/${gregThai.month}/${gregThai.year})`;

  dom.resGMST.textContent = `${gmst.toFixed(6)} ชม. (${hoursToHMS(gmst)})`;
  dom.resLST.textContent = `${lst.toFixed(6)} ชม. (${hoursToHMS(lst)})`;
  dom.resDayOfWeek.textContent = dowName;

  if (leap) {
    dom.resLeapStatus.textContent = `ปี ${gregUT.year} เป็นปีอธิกสุรทิน (กุมภาพันธ์มี 29 วัน)`;
    dom.resLeapStatus.style.color = "var(--color-accent)";
  } else {
    dom.resLeapStatus.textContent = `ปี ${gregUT.year} เป็นปีปกติสุรทิน (กุมภาพันธ์มี 28 วัน)`;
    dom.resLeapStatus.style.color = "var(--color-text)";
  }

  // ป้ายคำอธิบายพิเศษสำหรับยุคสำคัญ
  if (Math.abs(jd - 2451545.0) < 1e-4) {
    dom.jdEpochBadge.textContent = "ยุคอ้างอิงมาตรฐาน J2000.0";
    dom.jdEpochBadge.style.background = "#7dd6a8";
    dom.jdEpochDesc.textContent = "JD = 2451545.0 ตรงกับวันที่ 1 มกราคม 2000 เวลา 12:00:00 UT เป็นจุดเริ่มต้นของพิกัดดาราศาสตร์ยุคปัจจุบัน";
  } else if (Math.abs(jd - 2400000.5) < 1e-4) {
    dom.jdEpochBadge.textContent = "จุดเริ่มต้น Modified Julian Date (MJD 0.0)";
    dom.jdEpochBadge.style.background = "#4fa3e3";
    dom.jdEpochDesc.textContent = "MJD = 0.0 ตรงกับวันที่ 17 พฤศจิกายน 1858 เวลา 00:00:00 UT เพื่อลดทอนตัวเลขให้กะทัดรัดลง";
  } else {
    dom.jdEpochBadge.textContent = `วันจูเลียนลำดับที่ ${Math.floor(jd)}`;
    dom.jdEpochBadge.style.background = "#f6c445";
    dom.jdEpochDesc.textContent = `เศษส่วนของวัน ${(jd % 1).toFixed(4)} หมายถึงเวลาที่ผ่านไปนับตั้งแต่เที่ยงวันสากล (12:00 UT) ที่ผ่านมา`;
  }

  // อัปเดตอินพุตให้ตรงกันตามโหมด
  if (state.mode === "jd") {
    const tzOffset = parseInt(dom.inpTimezone.value);
    const targetGreg = tzOffset === 7 ? gregThai : gregUT;
    dom.inpYear.value = targetGreg.year;
    dom.inpMonth.value = targetGreg.month;
    dom.inpDay.value = targetGreg.day;
    dom.inpHour.value = targetGreg.hour;
    dom.inpMin.value = targetGreg.minute;
    dom.inpSec.value = targetGreg.second;
    dom.inpDirectJD.value = jd.toFixed(6);
    dom.inpDirectMJD.value = mjd.toFixed(6);
  }

  drawClockDial(gregThai, gregUT, gmst, lst);
}

// ---------------- วาดหน้าปัดนาฬิกาดาราศาสตร์ 4 ระบบ (Clock Canvas) ----------------
const canvas = dom.clockCanvas;
const ctx = canvas.getContext("2d");

function drawClockDial(thai, ut, gmst, lst) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.min(W, H) / 2 - 10;

  ctx.clearRect(0, 0, W, H);

  // วาดวงแหวนทั้ง 4 ชั้น
  // 1. วงแหวนนอกสุด: เวลาไทย UTC+7 (สีทอง รัศมี maxR)
  drawDialRing(cx, cy, maxR, maxR - 22, "#f6c445", "UTC+7", thai.hour + thai.minute / 60 + thai.second / 3600);

  // 2. วงแหวนที่สอง: เวลาสากล UT (สีฟ้า รัศมี maxR - 26)
  drawDialRing(cx, cy, maxR - 26, maxR - 48, "#4fa3e3", "UT", ut.hour + ut.minute / 60 + ut.second / 3600);

  // 3. วงแหวนที่สาม: เวลา GMST (สีเขียว รัศมี maxR - 52)
  drawDialRing(cx, cy, maxR - 52, maxR - 74, "#7dd6a8", "GMST", gmst);

  // 4. วงแหวนในสุด: เวลา LST (สีชมพู รัศมี maxR - 78)
  drawDialRing(cx, cy, maxR - 78, maxR - 100, "#ff758f", "LST", lst);

  // จุดศูนย์กลาง
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawDialRing(cx, cy, rOut, rIn, color, label, hours) {
  // พื้นหลังวงแหวน
  ctx.fillStyle = "rgba(11, 16, 32, 0.4)";
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.arc(cx, cy, rIn, Math.PI * 2, 0, true);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
  ctx.stroke();

  // ขีดบอกชั่วโมง 24 ช่องรอบวงแหวน (ด้านบน = 0h/24h)
  for (let h = 0; h < 24; h++) {
    const ang = (h / 24) * Math.PI * 2 - Math.PI / 2;
    const isMajor = h % 6 === 0;
    const tickLen = isMajor ? (rOut - rIn) * 0.5 : (rOut - rIn) * 0.25;

    const x1 = cx + Math.cos(ang) * rOut;
    const y1 = cy + Math.sin(ang) * rOut;
    const x2 = cx + Math.cos(ang) * (rOut - tickLen);
    const y2 = cy + Math.sin(ang) * (rOut - tickLen);

    ctx.strokeStyle = isMajor ? color : "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = isMajor ? 1.8 : 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // ตัวเลขสำหรับ 0, 6, 12, 18
    if (isMajor && rOut > 140) {
      const tx = cx + Math.cos(ang) * (rIn + (rOut - rIn) * 0.35);
      const ty = cy + Math.sin(ang) * (rIn + (rOut - rIn) * 0.35);
      ctx.fillStyle = color;
      ctx.font = "Bold 9px 'IBM Plex Sans Thai', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(h), tx, ty);
    }
  }

  // เข็มชี้เวลา
  const curAng = (hours / 24) * Math.PI * 2 - Math.PI / 2;
  const hx = cx + Math.cos(curAng) * (rOut - 2);
  const hy = cy + Math.sin(curAng) * (rOut - 2);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // ป้ายชื่อระบบเวลา
  const lblAng = -Math.PI / 2 + 0.15;
  const lx = cx + Math.cos(lblAng) * ((rOut + rIn) / 2);
  const ly = cy + Math.sin(lblAng) * ((rOut + rIn) / 2);
  ctx.fillStyle = color;
  ctx.font = "Bold 9px 'IBM Plex Sans Thai', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, lx, ly);
}

// ---------------- Event Listeners ----------------
function readFromCalendarInput() {
  state.mode = "calendar";
  const y = parseInt(dom.inpYear.value) || 2000;
  const m = parseInt(dom.inpMonth.value) || 1;
  const d = parseInt(dom.inpDay.value) || 1;
  const h = parseInt(dom.inpHour.value) || 0;
  const min = parseInt(dom.inpMin.value) || 0;
  const sec = parseFloat(dom.inpSec.value) || 0;
  const tzOffset = parseInt(dom.inpTimezone.value) || 0;

  // แปลงเป็น UT
  let utH = h - tzOffset;
  let utD = d;
  if (utH < 0) {
    utH += 24;
    utD -= 1;
  } else if (utH >= 24) {
    utH -= 24;
    utD += 1;
  }

  state.currentJD = gregorianToJD(y, m, utD, utH, min, sec);
  updateSimulation();
}

[dom.inpYear, dom.inpMonth, dom.inpDay, dom.inpHour, dom.inpMin, dom.inpSec, dom.inpTimezone].forEach((elem) => {
  elem.addEventListener("input", readFromCalendarInput);
});

dom.inpDirectJD.addEventListener("input", (e) => {
  state.mode = "jd";
  state.currentJD = parseFloat(e.target.value) || 2451545.0;
  updateSimulation();
});

dom.inpDirectMJD.addEventListener("input", (e) => {
  state.mode = "jd";
  const mjd = parseFloat(e.target.value) || 51544.5;
  state.currentJD = mjd + 2400000.5;
  updateSimulation();
});

dom.obsLon.addEventListener("input", (e) => {
  state.obsLonDeg = parseFloat(e.target.value);
  dom.valObsLon.textContent = `${state.obsLonDeg.toFixed(1)}° E`;
  updateSimulation();
});

// ชิปลองจิจูด
document.querySelectorAll("[data-lon]").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.obsLonDeg = parseFloat(btn.dataset.lon);
    dom.obsLon.value = state.obsLonDeg;
    dom.valObsLon.textContent = `${state.obsLonDeg.toFixed(1)}° E`;
    updateSimulation();
  });
});

// โหมดการสลับ
dom.modeFromCalendar.addEventListener("click", () => {
  state.mode = "calendar";
  dom.modeFromCalendar.classList.add("active");
  dom.modeFromJD.classList.remove("active");
  dom.boxCalendarInput.style.display = "block";
  dom.boxJDInput.style.display = "none";
});

dom.modeFromJD.addEventListener("click", () => {
  state.mode = "jd";
  dom.modeFromJD.classList.add("active");
  dom.modeFromCalendar.classList.remove("active");
  dom.boxCalendarInput.style.display = "none";
  dom.boxJDInput.style.display = "block";
});

// หมุดเหตุการณ์ประวัติศาสตร์
dom.chipJ2000.addEventListener("click", () => {
  state.currentJD = 2451545.0;
  state.mode = "jd";
  updateSimulation();
});

dom.chipWakor.addEventListener("click", () => {
  // 18 สิงหาคม 1868 เวลา ~11:00 น. ประเทศไทย (04:00 UT)
  state.currentJD = gregorianToJD(1868, 8, 18, 4, 0, 0);
  state.mode = "jd";
  updateSimulation();
});

dom.chipMjdEpoch.addEventListener("click", () => {
  state.currentJD = 2400000.5;
  state.mode = "jd";
  updateSimulation();
});

dom.chipLeap2000.addEventListener("click", () => {
  state.currentJD = gregorianToJD(2000, 2, 29, 12, 0, 0);
  state.mode = "jd";
  updateSimulation();
});

dom.chipNoLeap1900.addEventListener("click", () => {
  state.currentJD = gregorianToJD(1900, 2, 28, 12, 0, 0);
  state.mode = "jd";
  updateSimulation();
});

dom.chipNow.addEventListener("click", () => {
  const now = new Date();
  state.currentJD = now.getTime() / 86400000 + 2440587.5;
  state.mode = "jd";
  updateSimulation();
});

// ปุ่มก้าวเวลา
dom.btnStepMinusDay.addEventListener("click", () => {
  state.currentJD -= 1.0;
  state.mode = "jd";
  updateSimulation();
});

dom.btnStepPlusDay.addEventListener("click", () => {
  state.currentJD += 1.0;
  state.mode = "jd";
  updateSimulation();
});

dom.btnStepMinusHour.addEventListener("click", () => {
  state.currentJD -= 1.0 / 24;
  state.mode = "jd";
  updateSimulation();
});

dom.btnStepPlusHour.addEventListener("click", () => {
  state.currentJD += 1.0 / 24;
  state.mode = "jd";
  updateSimulation();
});

dom.btnToggleLiveClock.addEventListener("click", () => {
  state.isLiveClock = !state.isLiveClock;
  dom.liveIcon.textContent = state.isLiveClock ? "⏸" : "⏱️";
  dom.btnToggleLiveClock.classList.toggle("primary", !state.isLiveClock);
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
  updateSimulation();
});

const ro = new ResizeObserver(() => {
  updateSimulation();
});
const stageEl = document.getElementById("stage");
if (stageEl) ro.observe(stageEl);
window.addEventListener("resize", () => {
  updateSimulation();
});

// ---------------- Live Animation Loop ----------------
function liveLoop() {
  if (state.isLiveClock) {
    const now = new Date();
    state.currentJD = now.getTime() / 86400000 + 2440587.5;
    state.mode = "jd";
    updateSimulation();
  }
  requestAnimationFrame(liveLoop);
}

// เริ่มต้นระบบ
updateSimulation();
requestAnimationFrame(liveLoop);
