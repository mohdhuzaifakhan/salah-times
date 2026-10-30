/**
 * Solar Astronomical Prayer Times Calculation Engine
 * Implements high-precision Jean Meeus solar position algorithms
 * aligned with the University of Islamic Sciences, Karachi (18° Fajr / 18° Isha)
 * and Indian Subcontinent Hanafi & Shafi'i standards.
 */

export interface CalculatedPrayerTimes {
  fajr: string;
  sunrise: string;
  ishraq: string;
  chasht: string;
  zawal: string;
  dhuhr: string;
  asrHanafi: string;
  asrShafii: string;
  maghrib: string;
  isha: string;
  tahajjud: string;
  sehri: string;
  iftar: string;
}

export interface CityCoords {
  lat: number;
  lng: number;
  tz: number;
}

export const KNOWN_CITIES: Record<string, CityCoords> = {
  // Uttar Pradesh - Primary Districts & Sub-Divisions
  rampur: { lat: 28.8154, lng: 79.025, tz: 5.5 },
  "rampur city": { lat: 28.8154, lng: 79.025, tz: 5.5 },
  tanda: { lat: 28.98, lng: 78.94, tz: 5.5 },
  dariyal: { lat: 28.995, lng: 79.015, tz: 5.5 },
  suar: { lat: 29.02, lng: 79.05, tz: 5.5 },
  maswasi: { lat: 29.05, lng: 79.08, tz: 5.5 },
  bilaspur: { lat: 28.88, lng: 79.27, tz: 5.5 },
  milak: { lat: 28.6186, lng: 79.1834, tz: 5.5 },
  shahabad: { lat: 28.56, lng: 79.01, tz: 5.5 },
  chamraua: { lat: 28.75, lng: 79.05, tz: 5.5 },

  moradabad: { lat: 28.8353, lng: 78.7747, tz: 5.5 },
  "moradabad city": { lat: 28.8353, lng: 78.7747, tz: 5.5 },
  kanth: { lat: 29.06, lng: 78.63, tz: 5.5 },
  thakurdwara: { lat: 29.19, lng: 78.86, tz: 5.5 },
  bilari: { lat: 28.63, lng: 78.8, tz: 5.5 },
  kundarki: { lat: 28.68, lng: 78.78, tz: 5.5 },

  bareilly: { lat: 28.367, lng: 79.4304, tz: 5.5 },
  "bareilly city": { lat: 28.367, lng: 79.4304, tz: 5.5 },
  aonla: { lat: 28.28, lng: 79.15, tz: 5.5 },
  baheri: { lat: 28.78, lng: 79.5, tz: 5.5 },
  faridpur: { lat: 28.21, lng: 79.54, tz: 5.5 },
  nawabganj: { lat: 28.54, lng: 79.63, tz: 5.5 },

  sambhal: { lat: 28.5834, lng: 78.5714, tz: 5.5 },
  amroha: { lat: 28.9044, lng: 78.4678, tz: 5.5 },
  badaun: { lat: 28.0381, lng: 79.1243, tz: 5.5 },
  shahjahanpur: { lat: 27.8817, lng: 79.9124, tz: 5.5 },
  pilibhit: { lat: 28.6293, lng: 79.8054, tz: 5.5 },
  lucknow: { lat: 26.8467, lng: 80.9462, tz: 5.5 },
  kanpur: { lat: 26.4499, lng: 80.3319, tz: 5.5 },
  delhi: { lat: 28.6139, lng: 77.209, tz: 5.5 },
  "new delhi": { lat: 28.6139, lng: 77.209, tz: 5.5 },
  noida: { lat: 28.5355, lng: 77.391, tz: 5.5 },
  ghaziabad: { lat: 28.6692, lng: 77.4538, tz: 5.5 },
  meerut: { lat: 28.9845, lng: 77.7064, tz: 5.5 },
  aligarh: { lat: 27.8974, lng: 78.088, tz: 5.5 },
  agra: { lat: 27.1767, lng: 78.0081, tz: 5.5 },
  deoband: { lat: 29.6953, lng: 77.6766, tz: 5.5 },
  saharanpur: { lat: 29.9679, lng: 77.551, tz: 5.5 },
  muzaffarnagar: { lat: 29.4727, lng: 77.7085, tz: 5.5 },
  varanasi: { lat: 25.3176, lng: 82.9739, tz: 5.5 },
  allahabad: { lat: 25.4358, lng: 81.8463, tz: 5.5 },
  prayagraj: { lat: 25.4358, lng: 81.8463, tz: 5.5 },
  gorakhpur: { lat: 26.7606, lng: 83.3732, tz: 5.5 },
  faizabad: { lat: 26.773, lng: 82.146, tz: 5.5 },
  ayodhya: { lat: 26.7922, lng: 82.1998, tz: 5.5 },

  // Other Major Cities in India
  mumbai: { lat: 19.076, lng: 72.8777, tz: 5.5 },
  bengaluru: { lat: 12.9716, lng: 77.5946, tz: 5.5 },
  bangalore: { lat: 12.9716, lng: 77.5946, tz: 5.5 },
  kolkata: { lat: 22.5726, lng: 88.3639, tz: 5.5 },
  hyderabad: { lat: 17.385, lng: 78.4867, tz: 5.5 },
  chennai: { lat: 13.0827, lng: 80.2707, tz: 5.5 },
  ahmedabad: { lat: 23.0225, lng: 72.5714, tz: 5.5 },
  jaipur: { lat: 26.9124, lng: 75.7873, tz: 5.5 },
  patna: { lat: 25.5941, lng: 85.1376, tz: 5.5 },
  bhopal: { lat: 23.2599, lng: 77.4126, tz: 5.5 },
  srinagar: { lat: 34.0837, lng: 74.7973, tz: 5.5 },
};

export const DEFAULT_COORDS: CityCoords = {
  lat: 28.8154,
  lng: 79.025,
  tz: 5.5,
};

export function getCoordsForCity(cityName?: string | null): CityCoords {
  if (!cityName) return DEFAULT_COORDS;
  const clean = cityName.trim().toLowerCase();
  if (KNOWN_CITIES[clean]) {
    return KNOWN_CITIES[clean];
  }

  // Substring match
  for (const [key, coords] of Object.entries(KNOWN_CITIES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }

  return DEFAULT_COORDS;
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

function rad2deg(r: number): number {
  return (r * 180) / Math.PI;
}

function normalizeHours(h: number): number {
  let val = h % 24;
  if (val < 0) val += 24;
  return val;
}

/**
 * Calculates solar prayer times for any given Gregorian Date and geographic location
 */
export function calculateSolarPrayerTimes(
  date: Date,
  coords: CityCoords = DEFAULT_COORDS
): CalculatedPrayerTimes {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const { lat, lng, tz } = coords;

  // 1. Julian Date
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jd =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  const d = jd - 2451545.0;

  // 2. Mean anomaly of the sun (degrees)
  let M = (357.529 + 0.98560028 * d) % 360;
  if (M < 0) M += 360;

  // 3. Mean longitude of the sun (degrees)
  let L = (280.459 + 0.98564736 * d) % 360;
  if (L < 0) L += 360;

  // 4. Apparent ecliptic longitude (degrees)
  let lambda =
    (L + 1.915 * Math.sin(deg2rad(M)) + 0.02 * Math.sin(deg2rad(2 * M))) % 360;
  if (lambda < 0) lambda += 360;

  // 5. Obliquity of the ecliptic
  const ob = 23.439 - 0.00000036 * d;

  // 6. Sun declination
  const sinDec = Math.sin(deg2rad(ob)) * Math.sin(deg2rad(lambda));
  const dec = rad2deg(Math.asin(sinDec));

  // 7. Right ascension
  const ra =
    rad2deg(
      Math.atan2(
        Math.cos(deg2rad(ob)) * Math.sin(deg2rad(lambda)),
        Math.cos(deg2rad(lambda))
      )
    ) / 15;

  // 8. Equation of time (in minutes)
  let eqt = (L / 15 - ra) * 60;
  while (eqt > 20) eqt -= 60;
  while (eqt < -20) eqt += 60;

  // 9. Solar Noon (transit) in hours
  const noon = 12 + tz - lng / 15 - eqt / 60;

  // 10. Hour angle helper
  const hourAngle = (altitudeAngle: number): number | null => {
    const cosH =
      (Math.sin(deg2rad(altitudeAngle)) -
        Math.sin(deg2rad(lat)) * Math.sin(deg2rad(dec))) /
      (Math.cos(deg2rad(lat)) * Math.cos(deg2rad(dec)));
    if (cosH > 1 || cosH < -1) return null;
    return rad2deg(Math.acos(cosH));
  };

  // Sunrise and Sunset: altitude = -0.8333 degrees
  const hSun = hourAngle(-0.8333) ?? 90;
  const sunrise = noon - hSun / 15;
  const sunset = noon + hSun / 15;

  // Fajr: 18° depression below horizon (Karachi / Indian subcontinent standard)
  const hFajr = hourAngle(-18.0) ?? 108;
  const fajr = noon - hFajr / 15;

  // Isha: 18° depression below horizon
  const hIsha = hourAngle(-18.0) ?? 108;
  const isha = noon + hIsha / 15;

  // Asr altitude formulas
  const noonShadowAngle = Math.abs(lat - dec);
  const asrAltShafii = rad2deg(
    Math.atan(1 / (1 + Math.tan(deg2rad(noonShadowAngle))))
  );
  const asrAltHanafi = rad2deg(
    Math.atan(1 / (2 + Math.tan(deg2rad(noonShadowAngle))))
  );

  const hAsrShafii = hourAngle(asrAltShafii) ?? 45;
  const hAsrHanafi = hourAngle(asrAltHanafi) ?? 55;
  const asrShafii = noon + hAsrShafii / 15;
  const asrHanafi = noon + hAsrHanafi / 15;

  // Nawafil & Extra Timings
  const ishraq = sunrise + 15 / 60; // 15 mins post-sunrise
  const chasht = sunrise + (noon - sunrise) * 0.45; // Mid-morning Duha
  const zawal = noon - 10 / 60; // 10 min Makrooh zenith before Dhuhr
  const sehri = fajr - 2 / 60; // 2 min safety buffer
  const iftar = sunset + 1 / 60; // 1 min safety buffer

  // Tahajjud: Last 1/3 of the night
  const nightLength = (fajr + 24 - sunset) % 24;
  const tahajjud = (sunset + (nightLength * 2) / 3) % 24;

  const toTimeStr = (hFloat: number): string => {
    const norm = normalizeHours(hFloat);
    const totalMins = Math.round(norm * 60);
    const hrs = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  return {
    sehri: toTimeStr(sehri),
    fajr: toTimeStr(fajr),
    sunrise: toTimeStr(sunrise),
    ishraq: toTimeStr(ishraq),
    chasht: toTimeStr(chasht),
    zawal: toTimeStr(zawal),
    dhuhr: toTimeStr(noon),
    asrHanafi: toTimeStr(asrHanafi),
    asrShafii: toTimeStr(asrShafii),
    maghrib: toTimeStr(sunset),
    iftar: toTimeStr(iftar),
    isha: toTimeStr(isha),
    tahajjud: toTimeStr(tahajjud),
  };
}

/**
 * Formats a 24-hour HH:mm string to a friendly 12-hour hh:mm AM/PM string
 */
export function formatTo12Hour(timeStr?: string): string {
  if (!timeStr || !timeStr.includes(":")) return "--:--";
  const parts = timeStr.trim().split(":");
  const hour = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}

