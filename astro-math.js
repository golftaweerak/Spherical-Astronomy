/**
 * โมดูลคณิตศาสตร์ดาราศาสตร์ (Astronomical Mathematics Module)
 * สอวน. ดาราศาสตร์ — พิกัดศูนย์สูตรฟ้าและพิกัดขอบฟ้า
 */

export const D2R = Math.PI / 180;

/** แปลง JS Date (UTC) → Julian Date */
export function jdFromDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/** GMST เป็นชั่วโมง (สูตรประมาณของ USNO คลาดเคลื่อน < 0.1 วินาที/ศตวรรษ) */
export function gmstHours(jd) {
  const d = jd - 2451545.0;
  let g = 18.697374558 + 24.06570982441908 * d;
  g %= 24;
  if (g < 0) g += 24;
  return g;
}

/** LST (ชั่วโมง) = GMST + ลองจิจูดตะวันออก/15 */
export function lstHours(jd, lonDeg) {
  let l = gmstHours(jd) + lonDeg / 15;
  l %= 24;
  if (l < 0) l += 24;
  return l;
}

/**
 * แปลงพิกัดศูนย์สูตรฟ้า → พิกัดขอบฟ้า
 * @param raHours  RA เป็นชั่วโมง
 * @param decDeg   Dec เป็นองศา
 * @param latDeg   ละติจูดผู้สังเกต (องศา)
 * @param lstH     LST เป็นชั่วโมง
 * คืนค่า { altDeg, azDeg, E, N, U } โดย azDeg = null เมื่ออยู่จุดจอมฟ้าพอดี
 */
export function equatorialToHorizontal(raHours, decDeg, latDeg, lstH) {
  const H = (lstH - raHours) * 15 * D2R;  // มุมชั่วโมง (เรเดียน)
  const d = decDeg * D2R;
  const phi = latDeg * D2R;

  // องค์ประกอบทิศทางในกรอบ ตะวันออก(E)–เหนือ(N)–ขึ้น(U)
  const E = -Math.cos(d) * Math.sin(H);
  const N =  Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.cos(H) * Math.sin(phi);
  const U =  Math.sin(d) * Math.sin(phi) + Math.cos(d) * Math.cos(H) * Math.cos(phi);

  const altDeg = Math.atan2(U, Math.hypot(E, N)) / D2R;
  const horiz = Math.hypot(E, N);
  let azDeg = null;
  if (horiz > 1e-10) azDeg = (Math.atan2(E, N) / D2R + 360) % 360;

  return { altDeg, azDeg, E, N, U };
}

/**
 * แปลงพิกัดขอบฟ้า (Alt/Az) → พิกัดศูนย์สูตรฟ้า (RA/Dec)
 * @param altDeg   มุมเงย h (องศา)
 * @param azDeg    มุมทิศ A (องศา วัดตามเข็มจากทิศเหนือ)
 * @param latDeg   ละติจูดผู้สังเกต φ (องศา)
 * @param lstH     เวลาไซดีเรียลท้องถิ่น LST (ชั่วโมง)
 * คืนค่า { raHours, decDeg, haHours, haDeg }
 */
export function horizontalToEquatorial(altDeg, azDeg, latDeg, lstH) {
  const a = altDeg * D2R;
  const A = azDeg * D2R;
  const phi = latDeg * D2R;

  // คำนวณเดคลิเนชัน δ
  const sinD = Math.sin(a) * Math.sin(phi) + Math.cos(a) * Math.cos(A) * Math.cos(phi);
  const decDeg = Math.asin(Math.max(-1, Math.min(1, sinD))) / D2R;

  // คำนวณมุมชั่วโมง H
  const yH = -Math.cos(a) * Math.sin(A);
  const xH = Math.sin(a) * Math.cos(phi) - Math.cos(a) * Math.cos(A) * Math.sin(phi);

  const haRad = Math.atan2(yH, xH);
  const haDeg = (haRad / D2R + 360) % 360;
  const haHours = haDeg / 15;

  // ไรท์แอสเซนชัน α = LST - H
  const raHours = (lstH - haHours + 24) % 24;

  return { raHours, decDeg, haHours, haDeg };
}

/* ---------- ตัวช่วยจัดรูปแบบตัวเลข ---------- */
export const pad2 = (n) => String(n).padStart(2, "0");

export function hoursToHMS(h) {
  h = ((h % 24) + 24) % 24;
  const m = (h - Math.floor(h)) * 60;
  const s = (m - Math.floor(m)) * 60;
  return `${Math.floor(h)}ชม. ${pad2(Math.floor(m))}นาที ${s.toFixed(1).padStart(4, "0")}วิ.`;
}

export function degToDMS(deg) {
  const sign = deg < 0 ? "−" : "";
  const a = Math.abs(deg);
  const m = (a - Math.floor(a)) * 60;
  const s = (m - Math.floor(m)) * 60;
  return `${sign}${Math.floor(a)}° ${pad2(Math.floor(m))}′ ${s.toFixed(1).padStart(4, "0")}″`;
}

export function azToCompass(az) {
  const dirs = ["เหนือ", "ตะวันออกเฉียงเหนือ", "ตะวันออก", "ตะวันออกเฉียงใต้", "ใต้", "ตะวันตกเฉียงใต้", "ตะวันตก", "ตะวันตกเฉียงเหนือ"];
  const idx = Math.round(az / 45) % 8;
  return dirs[idx];
}

/* ==========================================================================
   ส่วนเพิ่มเติมสำหรับหลักสูตร สอวน. ดาราศาสตร์ ค่าย 1
   ========================================================================== */

/** ความเอียงของระนาบสุริยวิถีเทียบกับศูนย์สูตรฟ้า (Obliquity of Ecliptic) J2000 */
export const EPSILON_DEG = 23.4392911;

/**
 * แปลงพิกัดสุริยวิถี (Ecliptic: λ, β) → พิกัดศูนย์สูตรฟ้า (Equatorial: α, δ)
 * @param lambdaDeg ลองจิจูดสุริยวิถี λ (องศา)
 * @param betaDeg ละติจูดสุริยวิถี β (องศา, ดวงอาทิตย์ β = 0)
 * @param epsDeg ความเอียงของแกนโลก ε (องศา)
 * คืนค่า { raHours, decDeg, raDeg }
 */
export function eclipticToEquatorial(lambdaDeg, betaDeg = 0, epsDeg = EPSILON_DEG) {
  const l = lambdaDeg * D2R;
  const b = betaDeg * D2R;
  const eps = epsDeg * D2R;

  // sin δ = sin β cos ε + cos β sin ε sin λ
  const sinDec = Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l);
  const decDeg = Math.asin(Math.max(-1, Math.min(1, sinDec))) / D2R;

  // cos α cos δ = cos β cos λ
  // sin α cos δ = -sin β sin ε + cos β cos ε sin λ
  const y = -Math.sin(b) * Math.sin(eps) + Math.cos(b) * Math.cos(eps) * Math.sin(l);
  const x = Math.cos(b) * Math.cos(l);
  let raDeg = (Math.atan2(y, x) / D2R + 360) % 360;
  const raHours = raDeg / 15;

  return { raHours, decDeg, raDeg };
}

/**
 * คำนวณเงื่อนไขและมุมชั่วโมงขึ้น-ตก (Rising/Setting Hour Angle)
 * cos H₀ = (sin h₀ - sin φ sin δ) / (cos φ cos δ)
 * @param decDeg เดคลิเนชัน δ (องศา)
 * @param latDeg ละติจูดผู้สังเกต φ (องศา)
 * @param alt0Deg มุมเงย ณ ขอบฟ้า h₀ (ปกติ 0° หรือ -0.833° สำหรับดวงอาทิตย์รวมหักเหแสง)
 */
export function calculateRiseSet(decDeg, latDeg, alt0Deg = 0) {
  const phi = latDeg * D2R;
  const delta = decDeg * D2R;
  const h0 = alt0Deg * D2R;

  const cosPhi = Math.cos(phi);
  const cosDelta = Math.cos(delta);

  // กรณีพิเศษที่ขั้วโลก
  if (Math.abs(cosPhi) < 1e-7 || Math.abs(cosDelta) < 1e-7) {
    const isCircum = (latDeg >= 0 && decDeg >= 0) || (latDeg < 0 && decDeg < 0);
    return {
      type: isCircum ? "circumpolar" : "never_rise",
      canRiseSet: false,
      H0Deg: isCircum ? 180 : 0,
      H0Hours: isCircum ? 12 : 0,
      dayLengthHours: isCircum ? 24 : 0,
      riseAzDeg: null,
      setAzDeg: null,
      cosH0: isCircum ? -1 : 1
    };
  }

  const cosH0 = (Math.sin(h0) - Math.sin(phi) * Math.sin(delta)) / (cosPhi * cosDelta);

  if (cosH0 <= -1) {
    // เป็นดาวรอบขั้ว (ไม่ตกเลยตลอดวัน)
    return {
      type: "circumpolar",
      canRiseSet: false,
      H0Deg: 180,
      H0Hours: 12,
      dayLengthHours: 24,
      riseAzDeg: null,
      setAzDeg: null,
      cosH0
    };
  } else if (cosH0 >= 1) {
    // ไม่ขึ้นเลยตลอดวัน
    return {
      type: "never_rise",
      canRiseSet: false,
      H0Deg: 0,
      H0Hours: 0,
      dayLengthHours: 0,
      riseAzDeg: null,
      setAzDeg: null,
      cosH0
    };
  } else {
    // ขึ้นและตกตามปกติ
    const H0Rad = Math.acos(cosH0);
    const H0Deg = H0Rad / D2R;
    const H0Hours = H0Deg / 15;
    const dayLengthHours = H0Hours * 2;

    // มุมทิศขณะขึ้น/ตก: cos A_rise = sin δ / cos φ (กรณี h₀ = 0)
    // หรือคำนวณจากสูตรสามเหลี่ยมทั่วไป
    let cosA = Math.sin(delta) / Math.cos(phi);
    cosA = Math.max(-1, Math.min(1, cosA));
    const A_rise = Math.acos(cosA) / D2R; // วัดจากทิศเหนือ (0° ถึง 180°) ตะวันออก
    const A_set = 360 - A_rise;

    return {
      type: "rise_set",
      canRiseSet: true,
      H0Deg,
      H0Hours,
      dayLengthHours,
      riseAzDeg: A_rise,
      setAzDeg: A_set,
      cosH0
    };
  }
}

/**
 * คำนวณสมการเวลา (Equation of Time: EOT) เป็นนาที
 * EOT = LAT - LMT = E_eccentricity + E_obliquity
 * @param dayOfYear วันที่ในรอบปี N (1 ถึง 365.25)
 */
export function calculateEOT(dayOfYear) {
  const N = dayOfYear;
  const B = ((360 * (N - 81)) / 365.25) * D2R; // มุมโคจรเฉลี่ยจากวสันตวิษุวัต

  // องค์ประกอบจากความรีของวงโคจร (Eccentricity effect, e = 0.0167)
  const M = ((360 * (N - 2)) / 365.24) * D2R; // มุมอนอมาลีเฉลี่ยจากพรีฮีเลียน (~2 มกราคม)
  const eTerm = -7.659 * Math.sin(M);

  // องค์ประกอบจากความเอียงแกนโลก (Obliquity effect, ε = 23.44°)
  const epsTerm = 9.863 * Math.sin(2 * M + 3.5932 * D2R);

  // สูตรประมาณแม่นยำสูงมาตรฐาน
  const eotMinutes = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // เดคลิเนชันของดวงอาทิตย์โดยประมาณ
  const sunDecDeg = Math.asin(Math.sin(23.44 * D2R) * Math.sin(B)) / D2R;

  return {
    dayOfYear: N,
    eotMinutes,
    eTerm,
    epsTerm,
    sunDecDeg
  };
}

/**
 * แปลงปี เดือน วัน เวลา → Julian Date (ครอบคลุมปฏิทินเกรกอเรียน)
 */
export function gregorianToJD(year, month, day, hour = 0, minute = 0, second = 0) {
  let Y = year;
  let M = month;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFraction = day + (hour + minute / 60 + second / 3600) / 24;
  const jd = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + dayFraction + B - 1524.5;
  return jd;
}

/**
 * แปลง Julian Date → วัน เดือน ปี เวลา (เกรกอเรียน)
 */
export function jdToGregorian(jd) {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const dayWithFraction = B - D - Math.floor(30.6001 * E) + F;
  const day = Math.floor(dayWithFraction);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayFraction = dayWithFraction - day;
  const totalSeconds = Math.round(dayFraction * 86400);
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  return { year, month, day, hour, minute, second };
}

