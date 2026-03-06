const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

interface DirectionsResult {
  duration: string;
  durationMinutes: number;
  mode: "driving" | "walking";
}

const cache = new Map<string, DirectionsResult>();

export async function getTransitDuration(
  origin: string,
  destination: string
): Promise<DirectionsResult | null> {
  const cacheKey = `${origin}|${destination}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  if (!API_KEY) return null;

  try {
    const encoded = (s: string) => encodeURIComponent(s);
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encoded(origin)}&destination=${encoded(destination)}&mode=driving&language=fr&key=${API_KEY}`;

    const res = await fetch(url);
    const json = await res.json();

    if (json.status !== "OK" || !json.routes?.length) return null;

    const leg = json.routes[0].legs[0];
    const durationMinutes = Math.round(leg.duration.value / 60);
    const distanceKm = leg.distance.value / 1000;

    let result: DirectionsResult;

    if (distanceKm < 2) {
      // Short distance: fetch walking directions
      const walkUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encoded(origin)}&destination=${encoded(destination)}&mode=walking&language=fr&key=${API_KEY}`;
      const walkRes = await fetch(walkUrl);
      const walkJson = await walkRes.json();

      if (walkJson.status === "OK" && walkJson.routes?.length) {
        const walkLeg = walkJson.routes[0].legs[0];
        const walkMinutes = Math.round(walkLeg.duration.value / 60);
        result = {
          duration: walkMinutes < 60 ? `${walkMinutes} min` : `${Math.floor(walkMinutes / 60)}h${String(walkMinutes % 60).padStart(2, "0")}`,
          durationMinutes: walkMinutes,
          mode: "walking",
        };
      } else {
        result = {
          duration: durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)}h${String(durationMinutes % 60).padStart(2, "0")}`,
          durationMinutes,
          mode: "driving",
        };
      }
    } else {
      result = {
        duration: durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)}h${String(durationMinutes % 60).padStart(2, "0")}`,
        durationMinutes,
        mode: "driving",
      };
    }

    cache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
