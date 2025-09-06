import React, { useState } from 'react';

export default function GeocodeSearch({ onPick }: { onPick: (lat: number, lon: number, label: string) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
      const r = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await r.json();
      setRes(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search places…"
          className="rounded-lg border px-3 py-2 w-full"
        />
        <button onClick={search} className="rounded-lg bg-black text-white px-3 py-2">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      <div className="text-sm">
        {res.map((r) => (
          <div key={r.place_id} className="p-2 hover:bg-black/5 rounded cursor-pointer"
               onClick={() => onPick(parseFloat(r.lat), parseFloat(r.lon), r.display_name)}>
            {r.display_name}
          </div>
        ))}
      </div>
    </div>
  );
}
