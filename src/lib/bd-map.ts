// Simplified Bangladesh outline in lon/lat, converted to a 0..100 viewBox space.
const LONLAT: Array<[number, number]> = [
  [88.0, 26.35],
  [88.7, 26.3],
  [89.0, 26.0],
  [89.8, 26.05],
  [89.9, 25.3],
  [90.5, 25.2],
  [91.0, 25.2],
  [92.1, 25.2],
  [92.5, 24.9],
  [92.2, 24.4],
  [91.4, 24.1],
  [91.6, 23.6],
  [92.3, 23.7],
  [92.6, 22.9],
  [92.3, 22.0],
  [92.6, 21.3],
  [92.0, 21.5],
  [91.8, 22.4],
  [91.3, 22.2],
  [90.6, 22.3],
  [90.0, 21.8],
  [89.1, 21.9],
  [88.9, 22.6],
  [88.9, 23.2],
  [89.8, 23.9],
  [89.7, 24.2],
  [88.7, 24.2],
  [88.1, 24.9],
  [88.9, 25.3],
  [88.4, 25.6],
  [88.7, 26.0],
];

const LON_MIN = 87.8;
const LON_MAX = 93.0;
const LAT_MIN = 20.9;
const LAT_MAX = 26.9;

export const BD_POINTS: Array<[number, number]> = LONLAT.map(([lon, lat]) => [
  ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 100,
  ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100,
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
    const x = 6 + Math.random() * 88;
    const y = 6 + Math.random() * 88;
    if (
      insideBD(x, y) &&
      insideBD(x + 3, y) &&
      insideBD(x - 3, y) &&
      insideBD(x, y + 3) &&
      insideBD(x, y - 3)
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
].map((c) => ({
  ...c,
  lon: ((c.lon - LON_MIN) / (LON_MAX - LON_MIN)) * 100,
  lat: ((LAT_MAX - c.lat) / (LAT_MAX - LAT_MIN)) * 100,
}));
