// Test the equatorial -> horizontal conversion math before wiring the GUI.
const D2R = Math.PI / 180;

function jdFromDate(date) {
  // date: JS Date (UTC-based) -> Julian Date
  return date.getTime() / 86400000 + 2440587.5;
}

function gmstHours(jd) {
  // USNO approximate formula (hours), good to ~0.1s/century
  const d = jd - 2451545.0;
  let gmst = 18.697374558 + 24.06570982441908 * d;
  gmst = gmst % 24;
  if (gmst < 0) gmst += 24;
  return gmst;
}

function equatorialToHorizontal({ raHours, decDeg, latDeg, lstHours }) {
  const H = ((lstHours - raHours) * 15) * D2R; // hour angle in radians
  const d = decDeg * D2R;
  const phi = latDeg * D2R;

  const E = -Math.cos(d) * Math.sin(H);
  const N = Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.cos(H) * Math.sin(phi);
  const U = Math.sin(d) * Math.sin(phi) + Math.cos(d) * Math.cos(H) * Math.cos(phi);

  const altDeg = Math.atan2(U, Math.hypot(E, N)) / D2R;
  let azDeg;
  const horiz = Math.hypot(E, N);
  if (horiz < 1e-10) {
    azDeg = null; // undefined at zenith/nadir
  } else {
    azDeg = (Math.atan2(E, N) / D2R + 360) % 360;
  }
  return { altDeg, azDeg, E, N, U };
}

const cases = [
  { name: 'lat 0, dec 0, H 0 -> zenith', latDeg: 0, decDeg: 0, lst: 10, ra: 10, expAlt: 90, expAz: null },
  { name: 'lat 0, dec 0, H -90 -> east horizon', latDeg: 0, decDeg: 0, ra: 12, lst: 6, expAlt: 0, expAz: 90 },
  { name: 'lat 0, dec 0, H +90 -> west horizon', latDeg: 0, decDeg: 0, ra: 6, lst: 12, expAlt: 0, expAz: 270 },
  { name: 'lat 45, dec 0, H 0 -> south, alt 45', latDeg: 45, decDeg: 0, ra: 12, lst: 12, expAlt: 45, expAz: 180 },
  { name: 'lat 30, dec +90 (pole star) -> alt 30, az 0', latDeg: 30, decDeg: 90, ra: 3, lst: 15, expAlt: 30, expAz: 0 },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const r = equatorialToHorizontal({ raHours: c.ra, decDeg: c.decDeg, latDeg: c.latDeg, lstHours: c.lst });
  const okAlt = Math.abs(r.altDeg - c.expAlt) < 1e-6;
  const okAz = c.expAz === null ? r.azDeg === null : (r.azDeg !== null && Math.abs(r.azDeg - c.expAz) < 1e-6);
  if (okAlt && okAz) { pass++; console.log(`PASS  ${c.name}  alt=${r.altDeg.toFixed(4)} az=${r.azDeg === null ? 'undef' : r.azDeg.toFixed(2)}`); }
  else { fail++; console.log(`FAIL  ${c.name}  got alt=${r.altDeg} az=${r.azDeg} expected alt=${c.expAlt} az=${c.expAz}`); }
}

// JD check: 2000-01-01T12:00:00Z must be JD 2451545.0
const jd = jdFromDate(new Date('2000-01-01T12:00:00Z'));
console.log(`JD(J2000) = ${jd}  ->  ${Math.abs(jd - 2451545.0) < 1e-9 ? 'PASS' : 'FAIL'}`);

// GMST sanity: at J2000 epoch (2000-01-01 12:00 UTC), GMST ~ 18.697 h
console.log(`GMST(J2000) = ${gmstHours(jd).toFixed(6)} h (expect ~18.697374)`);

// Real-world check: Vega (RA 18h36m56s, Dec +38°47m) from Bangkok (13.75N, 100.5E)
// 2026-10-09 12:00 UTC
const t = new Date('2026-10-09T12:00:00Z');
const jd2 = jdFromDate(t);
const gmst = gmstHours(jd2);
const lst = ((gmst + 100.5 / 15) % 24 + 24) % 24;
const vega = equatorialToHorizontal({ raHours: 18.61556, decDeg: 38.78361, latDeg: 13.75, lstHours: lst });
console.log(`GMST=${gmst.toFixed(4)}h LST=${lst.toFixed(4)}h`);
console.log(`Vega from Bangkok: alt=${vega.altDeg.toFixed(2)} az=${vega.azDeg === null ? 'undef' : vega.azDeg.toFixed(2)}`);

console.log(`\n${pass} passed, ${fail} failed`);
