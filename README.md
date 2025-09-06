# Weather & Map Add-on

Plug-and-play folder to add a **weather panel** (Open‑Meteo) and a **map** (Leaflet + react‑leaflet) to your existing React app (Vite or CRA).

## Quick install
```bash
npm i leaflet react-leaflet
npm i -D @types/leaflet
```

Import Leaflet CSS once in your bootstrap file (e.g., `src/main.tsx` or `src/index.tsx`):
```ts
import 'leaflet/dist/leaflet.css';
```

### Add components
- Copy the `src/components` folder into your project (or merge files into your components dir).
- Use them, e.g. in `App.tsx`:
```tsx
import WeatherWidget from './components/WeatherWidget';
import MapView from './components/MapView';

export default function App() {
  return (
    <div className="max-w-5xl mx-auto p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Field Journal</h1>
      <WeatherWidget />
      <MapView />
    </div>
  );
}
```

### Service worker (offline caching for tiles + weather)
- Copy `public/sw.js` into your project’s `public/` directory (root-level public).
- Register it once (see `register-sw-snippet.ts`), or add equivalent to your existing SW registration.

**Note:** If you already have a service worker, merge the `fetch` handlers from `sw.js` into yours.

### Optional: place search
If you want geocoding/search, also copy `GeocodeSearch.tsx` and wire it into `MapView` (instructions inside that file). Nominatim usage should be gentle; in a production app, add a proper `User-Agent`/Referer via a proxy or server.

## Files in this bundle
- `src/components/WeatherWidget.tsx` – Weather panel using Open‑Meteo
- `src/components/MapView.tsx` – Map (Leaflet + react‑leaflet) with locate and click‑to‑add pins
- `src/components/GeocodeSearch.tsx` – Optional search bar (Nominatim)
- `public/sw.js` – Service worker caching for OpenStreetMap tiles and Open‑Meteo responses
- `register-sw-snippet.ts` – Copy/paste snippet for registering the SW
- `package-snippets.md` – Commands & import snippets
