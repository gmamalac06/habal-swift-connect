import { useEffect, useRef } from 'react';

type Props = {
  center?: { lat: number; lng: number } | null;
  markers?: Array<{ id: string; lat: number; lng: number; color?: string; label?: string }>;
  height?: number;
};

// Minimal, library-free map placeholder using an iframe to Google Maps with markers encoded in the URL.
// For production-grade maps, integrate Leaflet/Mapbox. This placeholder avoids adding heavy deps.
export default function LiveMap({ center, markers = [], height = 280 }: Props) {
  const ref = useRef<HTMLIFrameElement | null>(null);

  const url = (() => {
    const c = center ?? markers[0] ?? { lat: 7.2045, lng: 124.2407 };
    const base = 'https://maps.google.com/maps';
    const q = markers.length > 0
      ? markers.map(m => `${m.lat},${m.lng}(${encodeURIComponent(m.label ?? m.id)})`).join('|')
      : `${c.lat},${c.lng}`;
    const params = new URLSearchParams({ q, t: 'm', z: '14', output: 'embed' });
    return `${base}?${params.toString()}`;
  })();

  useEffect(() => {
    if (ref.current) {
      // reload when URL changes
      ref.current.src = url;
    }
  }, [url]);

  return (
    <div className="w-full overflow-hidden rounded-md border" style={{ height }}>
      <iframe ref={ref} title="Live Map" src={url} className="h-full w-full" loading="lazy" />
    </div>
  );
}



