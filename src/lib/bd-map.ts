// Simplified Bangladesh outline in lon/lat, converted to a 0..100 viewBox space.
const LONLAT: Array<[number, number]> = [
  [92.6727, 22.0412],
  [92.6523, 21.324],
  [92.3032, 21.4755],
  [92.3686, 20.6709],
  [92.0829, 21.1922],
  [92.0252, 21.7016],
  [91.8349, 22.1829],
  [91.4171, 22.765],
  [90.496, 22.805],
  [90.587, 22.3928],
  [90.273, 21.8364],
  [89.8475, 22.0391],
  [89.702, 21.8571],
  [89.4189, 21.9662],
  [89.032, 22.0557],
  [88.8763, 22.8791],
  [88.5298, 23.6311],
  [88.6999, 24.2337],
  [88.0844, 24.5017],
  [88.3064, 24.8661],
  [88.9316, 25.2387],
  [88.2098, 25.7681],
  [88.563, 26.4465],
  [89.3551, 26.0144],
  [89.8325, 25.9651],
  [89.9207, 25.2697],
  [90.8722, 25.1326],
  [91.7996, 25.1474],
  [92.3762, 24.9767],
  [91.9151, 24.1304],
  [91.4677, 24.0726],
  [91.159, 23.5035],
  [91.7065, 22.9853],
  [91.8699, 23.6243],
  [92.146, 23.6275],
  [92.6727, 22.0412],
];

const LON_MIN = 87.93;
const LON_MAX = 92.82;
const LAT_MIN = 20.52;
const LAT_MAX = 26.60;

// Keep real-world proportions: longitude degrees are shorter at ~24N.
const X_SCALE = 0.74;
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
