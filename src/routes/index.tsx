import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { BD_CITIES, BD_PATH, HOLES } from "@/lib/bd-map";
import { CATCH_MESSAGES, MISS_MESSAGES, rank, toBn } from "@/lib/game-text";

const TITLE = "টুকু আসে টুকু যায়, কতক্ষণ থাকে বোঝা মুশকিল";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "টুকু আসে টুকু যায় — বিদ্যুৎ প্যারোডি গেম" },
      {
        name: "description",
        content:
          "লোডশেডিং নিয়ে মজার প্যারোডি গেম। বাংলাদেশের মানচিত্রের গর্ত থেকে উঁকি দেওয়া টুকুকে ধরুন, বিদ্যুৎ ফিরিয়ে আনুন।",
      },
      { property: "og:title", content: "টুকু আসে টুকু যায় — বিদ্যুৎ প্যারোডি গেম" },
      {
        property: "og:description",
        content: "৩০ সেকেন্ড, ১ মিনিট বা ২ মিনিট — গর্ত থেকে উঁকি দেওয়া টুকু ধরার চ্যালেঞ্জ।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

type Phase = "menu" | "playing" | "over";
type Floater = { id: number; x: number; y: number; text: string; good: boolean };

const DURATIONS = [30, 60, 120];

function label(sec: number) {
  if (sec === 30) return "৩০ সেকেন্ড";
  if (sec === 60) return "১ মিনিট";
  return "২ মিনিট";
}

// The SVG (viewBox -7..107) renders as a centred square inside the 4:5 board,
// so overlay coordinates need the same mapping.
const VB_MIN = -3;
const VB_SIZE = 106;
const mapX = (x: number) => ((x - VB_MIN) / VB_SIZE) * 100;
const mapY = (y: number) => 10 + ((y - VB_MIN) / VB_SIZE) * 80;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function Game() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [duration, setDuration] = useState(60);
  const [left, setLeft] = useState(60);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [tukuHole, setTukuHole] = useState(0);
  const [decoys, setDecoys] = useState<number[]>([]);
  const [hidden, setHidden] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [hopKey, setHopKey] = useState(0);

  const caughtRef = useRef(0);
  const holeRef = useRef(0);
  const fid = useRef(0);
  const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const size = Math.max(30, 56 - caught * 1.3); // shrinks as you get better
  const hopMs = Math.max(400, 1100 - caught * 55);

  const addFloater = useCallback((x: number, y: number, text: string, good: boolean) => {
    const id = ++fid.current;
    setFloaters((f) => [...f, { id, x, y, text, good }]);
    setTimeout(() => setFloaters((f) => f.filter((i) => i.id !== id)), 900);
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1400);
  }, []);

  const hop = useCallback(() => {
    let next = holeRef.current;
    while (next === holeRef.current && HOLES.length > 1) {
      next = Math.floor(Math.random() * HOLES.length);
    }
    holeRef.current = next;
    setTukuHole(next);
    setHopKey((k) => k + 1);

    const others = HOLES.map((h) => h.id).filter((id) => id !== next);
    const n = 2 + Math.floor(Math.random() * 3);
    setDecoys(others.sort(() => Math.random() - 0.5).slice(0, n));

    // occasional load-shedding: Tuku is briefly untouchable
    if (Math.random() < 0.22) {
      setHidden(true);
      setTimeout(() => setHidden(false), 240 + Math.random() * 260);
    }
  }, []);

  // hop loop
  useEffect(() => {
    if (phase !== "playing") return;
    hopTimer.current = setTimeout(hop, hopMs);
    return () => {
      if (hopTimer.current) clearTimeout(hopTimer.current);
    };
  }, [phase, hopKey, hopMs, hop]);

  // countdown
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setPhase("over");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const start = (sec: number) => {
    setDuration(sec);
    setLeft(sec);
    setCaught(0);
    caughtRef.current = 0;
    setMissed(0);
    setStreak(0);
    setBest(0);
    setFloaters([]);
    setToast(null);
    setHidden(false);
    holeRef.current = Math.floor(Math.random() * HOLES.length);
    setTukuHole(holeRef.current);
    setDecoys([]);
    setPhase("playing");
    setHopKey((k) => k + 1);
  };

  const registerMiss = (x: number, y: number) => {
    setMissed((m) => m + 1);
    setStreak(0);
    addFloater(x, y, "মিস! ⚡", false);
    showToast(pick(MISS_MESSAGES));
    setShake((s) => s + 1);
  };

  const onCatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (phase !== "playing") return;
    const spot = HOLES[tukuHole]!;
    if (hidden) {
      registerMiss(mapX(spot.x), mapY(spot.y));
      return;
    }
    caughtRef.current += 1;
    setCaught(caughtRef.current);
    setStreak((s) => {
      const ns = s + 1;
      setBest((b) => Math.max(b, ns));
      return ns;
    });
    addFloater(mapX(spot.x), mapY(spot.y), pick(CATCH_MESSAGES), true);
    hop();
  };

  const onDecoy = (e: React.MouseEvent, x: number, y: number) => {
    e.stopPropagation();
    if (phase !== "playing") return;
    registerMiss(x, y);
  };

  const onBoardMiss = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== "playing") return;
    const r = e.currentTarget.getBoundingClientRect();
    registerMiss(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };

  const taps = caught + missed;
  const accuracy = taps ? Math.round((caught / taps) * 100) : 0;
  const megawatt = caught * 12;
  const result = rank(caught, accuracy);

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--gradient-sky)" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8 pt-6">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-widest text-accent">প্যারোডি গেম ⚡</p>
          <h1 className="mt-1 text-2xl font-bold leading-snug text-foreground">{TITLE}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            গর্ত থেকে উঁকি দেয়, চোখের পলকেই হাওয়া — ধরতে পারলে লাইন ফিরবে!
          </p>
        </header>

        {phase === "playing" && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="সময়" value={`${toBn(left)}s`} />
            <Stat label="ধরা" value={toBn(caught)} />
            <Stat label="মেগাওয়াট" value={toBn(megawatt)} />
          </div>
        )}

        {/* Map board */}
        <div
          key={shake}
          onClick={onBoardMiss}
          className={`relative mt-4 aspect-[4/5] w-full select-none overflow-hidden rounded-3xl border border-border bg-card ${
            phase === "playing" ? "anim-shake cursor-crosshair" : ""
          }`}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <svg viewBox="-3 -3 106 106" className="map-glow absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="bdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.93 0.06 150)" />
                <stop offset="100%" stopColor="oklch(0.87 0.09 150)" />
              </linearGradient>
            </defs>
            <path
              d={BD_PATH}
              fill="url(#bdFill)"
              fillRule="evenodd"
              stroke="oklch(0.55 0.13 158)"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            {BD_CITIES.map((c) => (
              <g key={c.name}>
                <circle cx={c.lon} cy={c.lat} r="0.7" fill="oklch(0.45 0.09 158)" opacity="0.5" />
                <text
                  x={c.lon + 1.4}
                  y={c.lat + 0.8}
                  fontSize="2.4"
                  fill="oklch(0.42 0.06 158)"
                  opacity="0.7"
                >
                  {c.name}
                </text>
              </g>
            ))}
          </svg>

          {/* burrows */}
          {HOLES.map((h) => (
            <div
              key={h.id}
              className="pointer-events-none absolute"
              style={{
                left: `${mapX(h.x)}%`,
                top: `${mapY(h.y)}%`,
                width: 46,
                height: 21,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="hole-lip absolute inset-0 rounded-[50%]" />
              <div className="hole-pit absolute inset-x-1 inset-y-[3px] rounded-[50%]" />
            </div>
          ))}

          {phase === "playing" && (
            <>
              {decoys.map((id) => {
                const h = HOLES[id]!;
                return (
                  <button
                    key={id}
                    onClick={(e) => onDecoy(e, mapX(h.x), mapY(h.y))}
                    aria-label="নিভে যাওয়া বাল্ব"
                    className="anim-rise absolute grid place-items-center rounded-full border border-border bg-muted opacity-80"
                    style={{
                      left: `${mapX(h.x)}%`,
                      top: `${mapY(h.y)}%`,
                      width: size * 0.78,
                      height: size * 0.78,
                      transform: "translate(-50%, -72%)",
                      fontSize: size * 0.38,
                    }}
                  >
                    🕯️
                  </button>
                );
              })}

              <button
                key={`tuku-${hopKey}`}
                onClick={onCatch}
                aria-label="টুকু ধরুন"
                className={`tuku-spark anim-rise absolute grid place-items-center rounded-full ${
                  hidden ? "opacity-20" : "anim-flicker"
                }`}
                style={{
                  left: `${mapX(HOLES[tukuHole]!.x)}%`,
                  top: `${mapY(HOLES[tukuHole]!.y)}%`,
                  width: size,
                  height: size,
                  transform: "translate(-50%, -72%)",
                  fontSize: size * 0.5,
                }}
              >
                💡
              </button>
            </>
          )}

          {floaters.map((f) => (
            <span
              key={f.id}
              className={`anim-float-up pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${
                f.good ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"
              }`}
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            >
              {f.text}
            </span>
          ))}

          {phase === "menu" && (
            <Overlay>
              <h2 className="text-xl font-bold text-foreground">সময় বেছে নিন</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                মানচিত্রের গর্ত থেকে টুকু উঁকি দেবে — ধরা কিন্তু সহজ না!
              </p>
              <div className="mt-4 grid w-full gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={(e) => {
                      e.stopPropagation();
                      start(d);
                    }}
                    className="w-full rounded-xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground transition-transform active:scale-95"
                    style={{ boxShadow: "var(--shadow-glow)" }}
                  >
                    {label(d)}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                মোমবাতিতে চাপ দিলে মিস — কিন্তু ভয় নেই, পয়েন্ট কাটা যাবে না।
              </p>
            </Overlay>
          )}

          {phase === "over" && (
            <Overlay>
              <p className="text-xs font-semibold tracking-widest text-accent">চূড়ান্ত ফলাফল</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">{result.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{result.note}</p>
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                <Stat label="টুকু ধরা" value={toBn(caught)} />
                <Stat label="মিস" value={toBn(missed)} />
                <Stat label="নির্ভুলতা" value={`${toBn(accuracy)}%`} />
                <Stat label="সেরা স্ট্রিক" value={toBn(best)} />
                <Stat label="উৎপাদন" value={`${toBn(megawatt)} MW`} />
                <Stat label="সময়" value={label(duration)} />
              </div>
              <div className="mt-4 grid w-full gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    start(duration);
                  }}
                  className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground active:scale-95"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  আবার খেলুন
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhase("menu");
                  }}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 font-semibold text-foreground active:scale-95"
                >
                  সময় বদলান
                </button>
              </div>
            </Overlay>
          )}
        </div>

        {/* funny miss toast */}
        <div className="mt-3 min-h-12">
          {toast ? (
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-center text-sm font-medium text-foreground">
              {toast}
            </div>
          ) : (
            phase === "playing" && (
              <div className="rounded-xl border border-dashed border-border px-3 py-2 text-center text-sm text-muted-foreground">
                স্ট্রিক: {toBn(streak)} ⚡ | জ্বলজ্বলে বাল্বটাই টুকু
              </div>
            )
          )}
        </div>

        <footer className="mt-auto pt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          এটি নিছক ব্যঙ্গ-রসিকতা। বাস্তব কোনো ব্যক্তি বা প্রতিষ্ঠানের সাথে মিল কাকতালীয়। ⚡
        </footer>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-0 grid place-items-center bg-background/85 p-5 backdrop-blur-sm"
    >
      <div className="w-full text-center">{children}</div>
    </div>
  );
}
