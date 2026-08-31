// Simplified Bangladesh outline in lon/lat, converted to a 0..100 viewBox space.
const LONLAT: Array<[number, number]> = [
  [92.5759, 21.9776],
  [92.5759, 21.9776],
];

const LON_MIN = 92.48;
const LON_MAX = 92.68;
const LAT_MIN = 21.88;
const LAT_MAX = 22.08;

// Keep real-world proportions: longitude degrees are shorter at ~24N.
const X_SCALE = 0.916;
const X_OFFSET = (100 - 100 * X_SCALE) / 2;

const projX = (lon: number) => X_OFFSET + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 100 * X_SCALE;
const projY = (lat: number) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;

export const BD_POINTS: Array<[number, number]> = LONLAT.map(([lon, lat]) => [
  projX(lon),
  projY(lat),
]);

export const BD_PATH =
  BD_POINTS.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ") +
  " Z";

export function insideBD(x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = BD_POINTS.length - 1; i < BD_POINTS.length; j = i++) {
    const [xi, yi] = BD_POINTS[i]!;
    const [xj, yj] = BD_POINTS[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Random point comfortably inside the map (percent coords). */
export function randomSpot(): { x: number; y: number } {
  for (let i = 0; i < 400; i++) {
    const x = 4 + Math.random() * 92;
    const y = 6 + Math.random() * 88;
    if (
      insideBD(x, y) &&
      insideBD(x + 2.5, y) &&
      insideBD(x - 2.5, y) &&
      insideBD(x, y + 2.5) &&
      insideBD(x, y - 2.5)
    ) {
      return { x, y };
    }
  }
  return { x: 50, y: 50 };
}

export const BD_CITIES: Array<{ name: string; lon: number; lat: number }> = [
  { name: "ঢাকা", lon: 90.4, lat: 23.81 },
  { name: "চট্টগ্রাম", lon: 91.8, lat: 22.36 },
  { name: "রাজশাহী", lon: 88.6, lat: 24.37 },
  { name: "খুলনা", lon: 89.56, lat: 22.81 },
  { name: "সিলেট", lon: 91.87, lat: 24.9 },
  { name: "রংপুর", lon: 89.25, lat: 25.75 },
  { name: "বরিশাল", lon: 90.37, lat: 22.7 },
  { name: "ময়মনসিংহ", lon: 90.4, lat: 24.75 },
].map((c) => ({ ...c, lon: projX(c.lon), lat: projY(c.lat) }));
