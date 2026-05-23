import React, { useState, useEffect, useMemo } from 'react';
import {
  Star, Plus, X, Navigation, Phone, Mail, Filter, Trash2, Edit3,
  Clock, Calendar, Home, ExternalLink, RefreshCw, MapPin,
} from 'lucide-react';

const API_URL = '/api/data';
const CACHE_KEY = 'charleston_rentals_cache_v2';

const STATUS_OPTIONS = [
  '✅ Tour CONFIRMED',
  '⏳ Tour pending',
  '⏳ Tour pending prequal',
  '📤 Tour requested - awaiting response',
  '💬 Responded - action needed',
  '📞 Phone tag',
  '⚠️ No response 6+ weeks',
  '❌ Passed',
  '✨ New - not contacted',
];

const STATUS_TINT = {
  '✅ Tour CONFIRMED': 'bg-emerald-50 text-emerald-900 border-emerald-200',
  '⏳ Tour pending': 'bg-amber-50 text-amber-900 border-amber-200',
  '⏳ Tour pending prequal': 'bg-amber-50 text-amber-900 border-amber-200',
  '📤 Tour requested - awaiting response': 'bg-stone-100 text-stone-800 border-stone-300',
  '💬 Responded - action needed': 'bg-orange-50 text-orange-900 border-orange-200',
  '📞 Phone tag': 'bg-stone-100 text-stone-800 border-stone-300',
  '⚠️ No response 6+ weeks': 'bg-stone-200 text-stone-700 border-stone-300',
  '❌ Passed': 'bg-stone-200 text-stone-600 border-stone-300',
  '✨ New - not contacted': 'bg-blue-50 text-blue-900 border-blue-200',
};

// Tour weekend: Saturday 5/23 and Sunday 5/24, 2026
const TOUR_DAYS = [
  { date: '2026-05-23', short: 'Sat 5/23', label: 'Saturday', long: 'Saturday, May 23' },
  { date: '2026-05-24', short: 'Sun 5/24', label: 'Sunday', long: 'Sunday, May 24' },
];
const DEFAULT_TOUR_DATE = '2026-05-23';
// Day metadata for a property's tourDate (falls back to Saturday for legacy rows)
const tourDayMeta = (date) => TOUR_DAYS.find((d) => d.date === date) || TOUR_DAYS[0];
// A property belongs to a tour day if it has a tourDate; legacy rows with only a
// tourTime are treated as Saturday so nothing scheduled disappears.
const effectiveTourDate = (p) => p.tourDate || (p.tourTime ? DEFAULT_TOUR_DATE : null);


// ============== Helpers ==============
const fmtRent = (r) => {
  if (r === null || r === undefined || r === '') return '—';
  if (typeof r === 'string') return r.startsWith('$') ? r : `$${r}`;
  return `$${r.toLocaleString()}`;
};
const fmtSqft = (s) => {
  if (s === null || s === undefined || s === '') return '—';
  if (typeof s === 'string') return s;
  return s.toLocaleString();
};
const fmtBrBa = (br, ba) => {
  if (!br && !ba) return '—';
  return `${br || '?'} BR / ${ba || '?'} BA`;
};
const pricePerSqft = (rent, sqft) => {
  if (typeof rent !== 'number' || typeof sqft !== 'number') return null;
  return (rent / sqft).toFixed(2);
};
const mapsForAddress = (addr) => {
  const q = encodeURIComponent(`${addr}, Charleston, SC`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
};
// Google Street View Static image of the building (set VITE_GOOGLE_MAPS_API_KEY to enable)
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const streetViewUrl = (addr, w = 640, h = 360) => {
  if (!GMAPS_KEY || !addr) return null;
  const loc = encodeURIComponent(`${addr}, Charleston, SC`);
  return `https://maps.googleapis.com/maps/api/streetview?size=${w}x${h}&location=${loc}&fov=80&source=outdoor&key=${GMAPS_KEY}`;
};
const tourTimeToMinutes = (t) => {
  if (!t || t === 'TBD') return 99999;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 99999;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};
const buildRouteUrl = (tourProps) => {
  if (tourProps.length === 0) return null;
  const sorted = [...tourProps].sort((a, b) => tourTimeToMinutes(a.tourTime) - tourTimeToMinutes(b.tourTime));
  const addrs = sorted.map((p) => encodeURIComponent(`${p.addressFull || p.address}, Charleston, SC`));
  if (addrs.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${addrs[0]}&travelmode=walking`;
  }
  const origin = addrs[0];
  const destination = addrs[addrs.length - 1];
  const waypoints = addrs.slice(1, -1).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
};
// Interactive embedded map (Maps Embed API). Directions route for 2+ timed
// stops, a single place pin for one, null when there's nothing to plot.
const addrParam = (p) => encodeURIComponent(`${p.addressFull || p.address}, Charleston, SC`);
const placeEmbedUrl = (addr) => GMAPS_KEY ? `https://www.google.com/maps/embed/v1/place?key=${GMAPS_KEY}&q=${encodeURIComponent(`${addr}, Charleston, SC`)}` : null;
// Walking route through the day's timed stops. When `origin` (a "lat,lng" from
// the user's live location) is given, the path starts from there and threads
// through every remaining stop in time order — so it tracks where you are and
// what's next. Otherwise it shows the full stop-to-stop walking path.
const routeEmbedUrl = (tourProps, origin = null) => {
  if (!GMAPS_KEY) return null;
  const stops = [...tourProps]
    .filter((p) => p.tourTime && p.tourTime !== 'TBD')
    .sort((a, b) => tourTimeToMinutes(a.tourTime) - tourTimeToMinutes(b.tourTime));
  if (stops.length === 0) {
    return origin ? `https://www.google.com/maps/embed/v1/view?key=${GMAPS_KEY}&center=${encodeURIComponent(origin)}&zoom=15` : null;
  }
  const pts = stops.map(addrParam);
  const base = `https://www.google.com/maps/embed/v1/directions?key=${GMAPS_KEY}&mode=walking`;
  if (origin) {
    const destination = pts[pts.length - 1];
    const waypoints = pts.slice(0, -1).join('|');
    let url = `${base}&origin=${encodeURIComponent(origin)}&destination=${destination}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    return url;
  }
  if (stops.length === 1) return `https://www.google.com/maps/embed/v1/place?key=${GMAPS_KEY}&q=${pts[0]}`;
  const destination = pts[pts.length - 1];
  const waypoints = pts.slice(1, -1).join('|');
  let url = `${base}&origin=${pts[0]}&destination=${destination}`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
};
// Real Zillow listing URLs from the source tracker spreadsheet, keyed by property id.
// Backfills the 24 seeded properties (whose live records predate the zillowUrl field).
const ZILLOW_LINKS = {
  p1: 'https://www.zillow.com/homedetails/72-Logan-St-Charleston-SC-29401/10903769_zpid/',
  p2: 'https://www.zillow.com/homedetails/20-Limehouse-St-AA-Charleston-SC-29401/2065582515_zpid/',
  p3: 'https://www.zillow.com/apartments/charleston-sc/28-broad-street/9Bn2Vw/',
  p4: 'https://www.zillow.com/homedetails/21-George-St-APT-403-Charleston-SC-29401/88975939_zpid/',
  p5: 'https://www.zillow.com/apartments/charleston-sc/655-east-bay/CkBRrD/',
  p6: 'https://www.zillow.com/homedetails/5-Gadsdenboro-St-UNIT-411-Charleston-SC-29401/333564598_zpid/',
  p7: 'https://www.zillow.com/homedetails/70-Carolina-St-301-Charleston-SC-29403/456567473_zpid/',
  p8: 'https://www.zillow.com/homedetails/69-Morris-St-APT-202-Charleston-SC-29403/92383626_zpid/',
  p9: 'https://www.zillow.com/homedetails/1-Vendue-Range-36D-Charleston-SC-29401/2054436696_zpid/',
  p10: 'https://www.zillow.com/homedetails/31-Wentworth-St-Charleston-SC-29401/10905058_zpid/',
  p11: 'https://www.zillow.com/apartments/charleston-sc/society-at-laurens/BMtN2x/',
  p12: 'https://www.zillow.com/homedetails/35-Society-St-1-Charleston-SC-29401/10904952_zpid/',
  p13: 'https://www.zillow.com/homedetails/33-Calhoun-St-Charleston-SC-29401/82543675_zpid/',
  p14: 'https://www.zillow.com/homedetails/349-King-St-Charleston-SC-29401/2091226206_zpid/',
  p15: 'https://www.zillow.com/homedetails/164-Queen-St-Charleston-SC-29401/10903653_zpid/',
  p16: 'https://www.zillow.com/homedetails/55-Hasell-St-APT-A-Charleston-SC-29401/10905030_zpid/',
  p17: 'https://www.zillow.com/homedetails/94-Bogard-St-Charleston-SC-29403/10907350_zpid/',
  p18: 'https://www.zillow.com/apartments/charleston-sc/the-charleigh/5XqvtD/',
  p19: 'https://www.zillow.com/apartments/charleston-sc/laurel-a-collective/CqHxPt/',
  p20: 'https://www.zillow.com/homedetails/234-Ashley-Ave-A-Charleston-SC-29403/2067011147_zpid/',
  p21: 'https://www.zillow.com/homedetails/19-N-Tracy-St-Charleston-SC-29403/10906650_zpid/',
  p22: 'https://www.zillow.com/homedetails/32-H-St-Charleston-SC-29403/10910507_zpid/',
  p23: 'https://www.zillow.com/homedetails/278-King-St-C-1-Charleston-SC-29401/455720165_zpid/',
  p24: 'https://www.zillow.com/b/lease-only-235-king-street-charleston-sc-5jC4WR/',
};
// Zillow link: the property's own saved URL wins, then the known listing for a
// seeded property, then a Zillow search for the address as a last resort.
const zillowUrlFor = (p) =>
  (p.zillowUrl && p.zillowUrl.trim())
    ? p.zillowUrl.trim()
    : (ZILLOW_LINKS[p.id]
        || `https://www.zillow.com/homes/${encodeURIComponent(`${p.addressFull || p.address}, Charleston, SC`)}_rb/`);

// ============== UI Components ==============
// Street View photo of the building, with a graceful placeholder when there's
// no API key or Google has no imagery for the address.
function PropertyPhoto({ p, w, h, className = '' }) {
  const url = streetViewUrl(p.addressFull || p.address, w, h);
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className={`flex items-center justify-center bg-stone-200/70 text-stone-400 ${className}`}>
        <Home size={26} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={`Street view of ${p.address}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover bg-stone-200 ${className}`}
    />
  );
}

function StarRow({ value, onChange, person, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.15em] text-stone-600 w-14 font-medium">{person}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={(e) => { e.stopPropagation(); onChange(value === n ? 0 : n); }}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              size={18}
              strokeWidth={1.5}
              className={n <= value ? `${color} fill-current` : 'text-stone-300'}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const tint = STATUS_TINT[status] || 'bg-stone-100 text-stone-800 border-stone-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${tint}`}>
      {status}
    </span>
  );
}

function VerdictPill({ verdict, onChange }) {
  const options = [
    { v: 'yes', label: 'Yes', cls: 'bg-emerald-600 text-white border-emerald-700' },
    { v: 'maybe', label: 'Maybe', cls: 'bg-amber-500 text-white border-amber-600' },
    { v: 'no', label: 'No', cls: 'bg-stone-600 text-white border-stone-700' },
  ];
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={(e) => { e.stopPropagation(); onChange(verdict === o.v ? null : o.v); }}
          className={`px-3 py-1 rounded text-xs font-medium border transition ${
            verdict === o.v ? o.cls : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PropertyCard({ p, onUpdate, onOpen }) {
  const verdictDot = p.verdict === 'yes' ? 'bg-emerald-500' : p.verdict === 'maybe' ? 'bg-amber-500' : p.verdict === 'no' ? 'bg-stone-400' : null;
  const ppsf = pricePerSqft(p.rent, p.sqft);

  return (
    <div
      onClick={() => onOpen(p.id)}
      className="bg-[#FAF6EE] border border-stone-300/60 hover:border-[#A14B3B]/40 hover:shadow-md transition-all rounded-lg p-4 cursor-pointer relative"
    >
      <div className="-mx-4 -mt-4 mb-3 h-36 overflow-hidden rounded-t-lg">
        <PropertyPhoto p={p} w={640} h={300} className="w-full h-full" />
      </div>
      {verdictDot && <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ring-2 ring-white shadow ${verdictDot}`} />}
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[19px] leading-tight text-stone-900 truncate">{p.address}</h3>
          {p.addressFull && p.addressFull !== p.address && (
            <p className="text-[12px] text-stone-500 mt-0.5 truncate">{p.addressFull}</p>
          )}
          <p className="text-[12px] text-stone-600 mt-0.5">{p.neighborhood ? `${p.neighborhood} · ` : ''}{p.zip}</p>
        </div>
      </div>

      <div className="flex items-baseline gap-4 mb-2.5">
        <span className="font-display text-2xl text-[#A14B3B] font-medium tracking-tight">
          {fmtRent(p.rent)}
          {typeof p.rent === 'number' && <span className="text-sm text-stone-500 font-sans">/mo</span>}
        </span>
        {ppsf && <span className="text-[12px] text-stone-500">${ppsf}/sqft</span>}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-stone-700 mb-3">
        <span>{fmtBrBa(p.br, p.ba)}</span>
        <span className="text-stone-400">·</span>
        <span>{fmtSqft(p.sqft)} sqft</span>
        <span className="text-stone-400">·</span>
        <span>{p.type}</span>
      </div>

      <div className="mb-3"><StatusBadge status={p.status} /></div>

      {p.tourTime && (
        <div className="flex items-center gap-1.5 mb-3 text-[12px] text-emerald-800 bg-emerald-50/70 border border-emerald-200/60 px-2 py-1 rounded">
          <Clock size={12} />
          <span className="font-medium">{tourDayMeta(p.tourDate).short}</span>
          <span>·</span>
          <span>{p.tourTime}</span>
        </div>
      )}

      <div className="space-y-1.5 pt-2 border-t border-stone-200/70">
        <StarRow value={p.ratings?.nicole || 0} onChange={(v) => onUpdate(p.id, { ratings: { ...(p.ratings || {}), nicole: v } })} person="Nicole" color="text-rose-500" />
        <StarRow value={p.ratings?.daniel || 0} onChange={(v) => onUpdate(p.id, { ratings: { ...(p.ratings || {}), daniel: v } })} person="Daniel" color="text-[#A14B3B]" />
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-stone-200/70">
        <a
          href={mapsForAddress(p.addressFull || p.address)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 text-[12px] bg-stone-900 text-[#F5EFE6] py-1.5 px-2 rounded hover:bg-stone-800 transition"
        >
          <Navigation size={13} />
          Directions
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}
          className="flex items-center justify-center gap-1.5 text-[12px] bg-[#F5EFE6] text-stone-800 py-1.5 px-3 rounded hover:bg-stone-200 transition border border-stone-300"
        >
          <Edit3 size={13} />
          Details
        </button>
      </div>
    </div>
  );
}

function PropertyModal({ p, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p);

  useEffect(() => { setDraft(p); }, [p?.id]);
  if (!p) return null;

  const tn = p.tourNotes || {};
  const updateTN = (field, val) => onUpdate(p.id, { tourNotes: { ...tn, [field]: val } });
  const saveEdits = () => {
    const { id, ratings, tourNotes, verdict, ...rest } = draft;
    onUpdate(p.id, rest);
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6" onClick={onClose}>
      <div className="bg-[#FAF6EE] rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-300" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#FAF6EE] border-b border-stone-300 px-5 py-3 flex justify-between items-center z-10">
          <h2 className="font-display text-xl text-stone-900 truncate pr-2">{p.address}</h2>
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(!editing)} className="p-2 hover:bg-stone-200 rounded text-stone-700" title="Edit">
              <Edit3 size={16} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded text-stone-700" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {!editing && (
            <>
              {streetViewUrl(p.addressFull || p.address) && (
                <div className="-mx-5 -mt-5 mb-1 h-52 overflow-hidden">
                  <PropertyPhoto p={p} w={900} h={400} className="w-full h-full" />
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500">Rent</div>
                  <div className="font-display text-xl text-[#A14B3B] font-medium">{fmtRent(p.rent)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500">BR / BA</div>
                  <div className="font-display text-xl text-stone-900">{fmtBrBa(p.br, p.ba)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500">SqFt</div>
                  <div className="font-display text-xl text-stone-900">{fmtSqft(p.sqft)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500">Type</div>
                  <div className="font-display text-xl text-stone-900">{p.type}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={p.status} />
                {p.neighborhood && <span className="text-xs text-stone-600">{p.neighborhood}</span>}
                {p.zip && <span className="text-xs text-stone-600">· {p.zip}</span>}
              </div>

              {p.tourTime && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-emerald-700 font-medium mb-1">Tour Scheduled</div>
                  <div className="font-display text-lg text-emerald-900">{tourDayMeta(p.tourDate).long} · {p.tourTime}</div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <a
                  href={mapsForAddress(p.addressFull || p.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-stone-900 text-[#F5EFE6] px-4 py-2 rounded-lg text-sm hover:bg-stone-800 transition"
                >
                  <Navigation size={15} />
                  Google Maps
                </a>
                <a
                  href={zillowUrlFor(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#006AFF] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0055cc] transition"
                  title={(p.zillowUrl || ZILLOW_LINKS[p.id]) ? 'Open the Zillow listing' : 'Search this address on Zillow'}
                >
                  <Home size={15} />
                  Zillow
                  <ExternalLink size={12} className="opacity-70" />
                </a>
                {p.contactInfo?.includes('@') && (
                  <a
                    href={`mailto:${p.contactInfo.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || ''}`}
                    className="flex items-center gap-2 bg-white border border-stone-300 text-stone-800 px-4 py-2 rounded-lg text-sm hover:bg-stone-100 transition"
                  >
                    <Mail size={15} />
                    Email
                  </a>
                )}
                {p.contactInfo?.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) && (
                  <a
                    href={`tel:${p.contactInfo.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)[0].replace(/\D/g, '')}`}
                    className="flex items-center gap-2 bg-white border border-stone-300 text-stone-800 px-4 py-2 rounded-lg text-sm hover:bg-stone-100 transition"
                  >
                    <Phone size={15} />
                    Call
                  </a>
                )}
              </div>

              {placeEmbedUrl(p.addressFull || p.address) && (
                <div className="rounded-lg overflow-hidden border border-stone-300/60 bg-stone-200">
                  <iframe
                    title={`Map of ${p.address}`}
                    src={placeEmbedUrl(p.addressFull || p.address)}
                    className="w-full h-56 block"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              {(p.contact || p.contactInfo) && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium mb-1">Contact</div>
                  <div className="text-sm text-stone-800">{p.contact}</div>
                  <div className="text-sm text-stone-600">{p.contactInfo}</div>
                </div>
              )}

              {p.nextStep && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium mb-1">Next Step</div>
                  <div className="text-sm text-stone-800 bg-amber-50 border border-amber-200 rounded p-2">{p.nextStep}</div>
                </div>
              )}

              {p.notes && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium mb-1">Listing Notes</div>
                  <div className="text-sm text-stone-700 whitespace-pre-wrap">{p.notes}</div>
                </div>
              )}

              <div className="border-t border-stone-200 pt-4 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium">Ratings</div>
                <StarRow value={p.ratings?.nicole || 0} onChange={(v) => onUpdate(p.id, { ratings: { ...(p.ratings || {}), nicole: v } })} person="Nicole" color="text-rose-500" />
                <StarRow value={p.ratings?.daniel || 0} onChange={(v) => onUpdate(p.id, { ratings: { ...(p.ratings || {}), daniel: v } })} person="Daniel" color="text-[#A14B3B]" />
                <div className="pt-1">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium mb-1.5">Verdict</div>
                  <VerdictPill verdict={p.verdict} onChange={(v) => onUpdate(p.id, { verdict: v })} />
                </div>
              </div>

              <div className="border-t border-stone-200 pt-4 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium">Tour Notes</div>
                {[
                  { k: 'vibe', label: 'Vibe (first impression)' },
                  { k: 'liked', label: 'What you liked' },
                  { k: 'bugged', label: 'What bugged you' },
                  { k: 'dealbreakers', label: 'Dealbreakers spotted?' },
                ].map(({ k, label }) => (
                  <div key={k}>
                    <label className="text-xs text-stone-600 mb-1 block">{label}</label>
                    <textarea
                      value={tn[k] || ''}
                      onChange={(e) => updateTN(k, e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#A14B3B] focus:ring-1 focus:ring-[#A14B3B]/20"
                      rows={2}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-200 pt-4">
                <button
                  onClick={() => {
                    if (confirm(`Delete ${p.address}? This can't be undone.`)) {
                      onDelete(p.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-700 hover:text-red-900"
                >
                  <Trash2 size={12} />
                  Delete property
                </button>
              </div>
            </>
          )}

          {editing && (
            <div className="space-y-3">
              {[
                { k: 'address', label: 'Address' },
                { k: 'addressFull', label: 'Full address (if different)' },
                { k: 'type', label: 'Type' },
                { k: 'br', label: 'Bedrooms', type: 'number' },
                { k: 'ba', label: 'Bathrooms', type: 'number' },
                { k: 'sqft', label: 'SqFt' },
                { k: 'rent', label: 'Rent ($)' },
                { k: 'neighborhood', label: 'Neighborhood' },
                { k: 'zip', label: 'ZIP' },
                { k: 'contact', label: 'Contact name' },
                { k: 'contactInfo', label: 'Contact info' },
                { k: 'nextStep', label: 'Next step' },
                { k: 'tourTime', label: 'Tour time (e.g. "11:15 AM" or "TBD")' },
                { k: 'zillowUrl', label: 'Zillow listing URL (optional)' },
              ].map(({ k, label, type }) => (
                <div key={k}>
                  <label className="text-xs text-stone-600 mb-1 block">{label}</label>
                  <input
                    type={type || 'text'}
                    value={draft[k] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [k]: type === 'number' ? (e.target.value === '' ? null : parseFloat(e.target.value)) : e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#A14B3B] focus:ring-1 focus:ring-[#A14B3B]/20"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-stone-600 mb-1 block">Tour day</label>
                <select
                  value={draft.tourDate || ''}
                  onChange={(e) => setDraft({ ...draft, tourDate: e.target.value || null })}
                  className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#A14B3B]"
                >
                  <option value="">No tour scheduled</option>
                  {TOUR_DAYS.map((d) => <option key={d.date} value={d.date}>{d.long}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-600 mb-1 block">Status</label>
                <select
                  value={draft.status || ''}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#A14B3B]"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-600 mb-1 block">Notes</label>
                <textarea
                  value={draft.notes || ''}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#A14B3B] focus:ring-1 focus:ring-[#A14B3B]/20"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveEdits} className="flex-1 bg-[#A14B3B] text-[#F5EFE6] py-2 rounded font-medium hover:bg-[#8a3e30] transition">
                  Save
                </button>
                <button onClick={() => { setEditing(false); setDraft(p); }} className="flex-1 bg-white border border-stone-300 text-stone-700 py-2 rounded hover:bg-stone-100 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddPropertyModal({ onClose, onAdd }) {
  const [d, setD] = useState({
    address: '', type: 'Apartment', br: '', ba: '', sqft: '', rent: '',
    neighborhood: '', zip: '29401', status: '✨ New - not contacted',
    contact: '', contactInfo: '', nextStep: '', notes: ''
  });

  const submit = () => {
    if (!d.address.trim()) { alert('Address required'); return; }
    const id = 'p' + Date.now();
    onAdd({
      id,
      ...d,
      br: d.br ? parseFloat(d.br) : null,
      ba: d.ba ? parseFloat(d.ba) : null,
      sqft: d.sqft ? (isNaN(parseFloat(d.sqft)) ? d.sqft : parseFloat(d.sqft)) : null,
      rent: d.rent ? (isNaN(parseFloat(d.rent)) ? d.rent : parseFloat(d.rent)) : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6" onClick={onClose}>
      <div className="bg-[#FAF6EE] rounded-xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-300" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#FAF6EE] border-b border-stone-300 px-5 py-3 flex justify-between items-center">
          <h2 className="font-display text-xl text-stone-900">Add Property</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-stone-600 mb-1 block">Address *</label>
            <input value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#A14B3B]" placeholder="e.g. 45 Beaufain St" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-600 mb-1 block">Type</label>
              <select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm">
                <option>Apartment</option>
                <option>Single-family</option>
                <option>Townhouse</option>
                <option>Apt community</option>
                <option>Apt building</option>
                <option>Condo</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-600 mb-1 block">Rent ($/mo)</label>
              <input type="number" value={d.rent} onChange={(e) => setD({ ...d, rent: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-stone-600 mb-1 block">BR</label>
              <input type="number" value={d.br} onChange={(e) => setD({ ...d, br: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-stone-600 mb-1 block">BA</label>
              <input type="number" step="0.5" value={d.ba} onChange={(e) => setD({ ...d, ba: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-stone-600 mb-1 block">SqFt</label>
              <input value={d.sqft} onChange={(e) => setD({ ...d, sqft: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-stone-600 mb-1 block">ZIP</label>
              <input value={d.zip} onChange={(e) => setD({ ...d, zip: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-600 mb-1 block">Neighborhood</label>
            <input value={d.neighborhood} onChange={(e) => setD({ ...d, neighborhood: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-stone-600 mb-1 block">Status</label>
            <select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-600 mb-1 block">Contact</label>
            <input value={d.contact} onChange={(e) => setD({ ...d, contact: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" placeholder="Agent / listing name" />
          </div>
          <div>
            <label className="text-xs text-stone-600 mb-1 block">Contact info</label>
            <input value={d.contactInfo} onChange={(e) => setD({ ...d, contactInfo: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" placeholder="email / phone / channel" />
          </div>
          <div>
            <label className="text-xs text-stone-600 mb-1 block">Notes</label>
            <textarea value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-sm" rows={3} />
          </div>
          <button onClick={submit} className="w-full bg-[#A14B3B] text-[#F5EFE6] py-2.5 rounded font-medium hover:bg-[#8a3e30] transition mt-2">
            Add Property
          </button>
        </div>
      </div>
    </div>
  );
}

function TourDayView({ properties, onOpen }) {
  const [selectedDay, setSelectedDay] = useState(DEFAULT_TOUR_DATE);
  const [tracking, setTracking] = useState(false);
  const [myLoc, setMyLoc] = useState(null); // "lat,lng" from geolocation
  const [geoError, setGeoError] = useState('');

  // Live location: while tracking, follow the user and update the route origin,
  // but only when they've moved enough (~30m) so the map isn't constantly reloading.
  useEffect(() => {
    if (!tracking) { setMyLoc(null); setGeoError(''); return; }
    if (!('geolocation' in navigator)) { setGeoError('Location not supported on this device'); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError('');
        const next = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
        setMyLoc((prev) => {
          if (!prev) return next;
          const [pa, pb] = prev.split(',').map(Number);
          const [na, nb] = next.split(',').map(Number);
          const dLat = (na - pa) * 111000;
          const dLng = (nb - pb) * 111000 * Math.cos((pa * Math.PI) / 180);
          return Math.hypot(dLat, dLng) > 30 ? next : prev;
        });
      },
      (err) => setGeoError(err.code === 1 ? 'Location permission denied' : (err.message || 'Location unavailable')),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [tracking]);

  // Group every scheduled property by its tour day, sorted by time within each day
  const byDay = useMemo(() => {
    const map = {};
    for (const d of TOUR_DAYS) map[d.date] = [];
    for (const p of properties) {
      const date = effectiveTourDate(p);
      if (date && map[date]) map[date].push(p);
    }
    for (const date of Object.keys(map)) {
      map[date].sort((a, b) => tourTimeToMinutes(a.tourTime) - tourTimeToMinutes(b.tourTime));
    }
    return map;
  }, [properties]);

  const tours = byDay[selectedDay] || [];
  const dayMeta = tourDayMeta(selectedDay);
  const routeUrl = buildRouteUrl(tours.filter((t) => t.tourTime && t.tourTime !== 'TBD'));
  const routeMap = routeEmbedUrl(tours, tracking ? myLoc : null);
  const confirmed = tours.filter((t) => t.status === '✅ Tour CONFIRMED').length;
  const pending = tours.filter((t) => t.status?.includes('pending') || t.status?.includes('action needed')).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 bg-[#FAF6EE] border border-stone-300/60 rounded-lg p-1">
        {TOUR_DAYS.map((d) => {
          const count = (byDay[d.date] || []).length;
          const active = selectedDay === d.date;
          return (
            <button
              key={d.date}
              onClick={() => setSelectedDay(d.date)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                active ? 'bg-stone-900 text-[#F5EFE6]' : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              {d.long}
              <span className={`text-[11px] rounded-full px-1.5 py-0.5 leading-none ${active ? 'bg-[#A14B3B] text-white' : 'bg-stone-300/70 text-stone-700'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-stone-900 text-[#F5EFE6] rounded-xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#A14B3B]/20 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#A14B3B] mb-2 font-medium">{dayMeta.long} · 2026</div>
          <h2 className="font-display text-3xl sm:text-4xl mb-3 leading-tight">Tour Day</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-300 mb-5">
            <span><span className="text-emerald-400 font-medium">{confirmed}</span> confirmed</span>
            <span><span className="text-amber-400 font-medium">{pending}</span> pending</span>
            <span><span className="text-stone-200 font-medium">{tours.length}</span> total stops</span>
          </div>
          {routeUrl && (
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#A14B3B] hover:bg-[#8a3e30] text-[#F5EFE6] px-5 py-2.5 rounded-lg font-medium text-sm transition"
            >
              <Navigation size={16} />
              Walk {dayMeta.label}'s Route in Google Maps
              <ExternalLink size={13} className="opacity-70" />
            </a>
          )}
        </div>
      </div>

      {routeMap && (
        <div className="rounded-xl overflow-hidden border border-stone-300/60 shadow-sm bg-stone-200">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FAF6EE] border-b border-stone-300/60">
            <div className="text-[12px] text-stone-600 min-w-0 truncate">
              {tracking && myLoc
                ? `Walking from your location through ${dayMeta.label}'s stops`
                : `${dayMeta.label}'s full walking route`}
            </div>
            <button
              onClick={() => setTracking((t) => !t)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                tracking ? 'bg-[#A14B3B] text-[#F5EFE6] border-[#A14B3B]' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
              title="Use your live location as the route's starting point"
            >
              <MapPin size={13} className={tracking && !myLoc ? 'animate-pulse' : ''} />
              {tracking ? (myLoc ? 'Tracking you' : 'Locating…') : 'Track me'}
            </button>
          </div>
          <iframe
            title={`${dayMeta.label} tour route`}
            src={routeMap}
            className="w-full h-72 sm:h-96 block"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
          {geoError && (
            <div className="px-3 py-1.5 text-[11px] text-red-700 bg-red-50 border-t border-red-200">{geoError}</div>
          )}
        </div>
      )}

      {tours.length === 0 ? (
        <div className="text-center py-12 text-stone-500">No tours scheduled for {dayMeta.label} yet.</div>
      ) : (
      <div className="space-y-3">
        {tours.map((p) => (
          <div
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="bg-[#FAF6EE] border border-stone-300/60 hover:border-[#A14B3B]/40 hover:shadow-md transition rounded-lg p-4 cursor-pointer flex gap-3 sm:gap-4 items-start"
          >
            <div className="text-center w-14 sm:w-20 flex-shrink-0">
              <div className="font-display text-base sm:text-lg text-[#A14B3B] font-medium leading-tight">{p.tourTime || 'TBD'}</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">{tourDayMeta(p.tourDate).short}</div>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden rounded-md">
              <PropertyPhoto p={p} w={160} h={160} className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg text-stone-900 truncate">{p.address}</h3>
              {p.addressFull && p.addressFull !== p.address && (
                <p className="text-[12px] text-stone-500">{p.addressFull}</p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                <StatusBadge status={p.status} />
                {typeof p.rent === 'number' && (
                  <span className="text-[12px] text-stone-700">${p.rent.toLocaleString()}/mo</span>
                )}
                {p.br && <span className="text-[12px] text-stone-600">· {fmtBrBa(p.br, p.ba)}</span>}
              </div>
              {p.nextStep && p.nextStep !== 'Capture details at tour' && (
                <div className="mt-2 text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  {p.nextStep}
                </div>
              )}
              <div className="mt-2 flex gap-3 items-center">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} size={12} strokeWidth={1.5} className={n <= (p.ratings?.nicole || 0) ? 'text-rose-500 fill-current' : 'text-stone-300'} />
                  ))}
                  <span className="text-[10px] text-stone-500 ml-1">N</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} size={12} strokeWidth={1.5} className={n <= (p.ratings?.daniel || 0) ? 'text-[#A14B3B] fill-current' : 'text-stone-300'} />
                  ))}
                  <span className="text-[10px] text-stone-500 ml-1">D</span>
                </div>
              </div>
            </div>
            <a
              href={mapsForAddress(p.addressFull || p.address)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 bg-stone-900 text-[#F5EFE6] p-2.5 rounded-lg hover:bg-stone-800 transition"
              title="Directions"
            >
              <Navigation size={15} />
            </a>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

// ============== Main App ==============
export default function App() {
  const [data, setData] = useState({ properties: [] });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('tour');
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('loading'); // loading | synced | syncing | error
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('rent');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async (showSpinner = true) => {
    if (showSpinner) setSyncStatus('syncing');
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d && Array.isArray(d.properties)) {
        setData(d);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch {}
        setSyncStatus('synced');
      } else {
        throw new Error('Invalid response');
      }
    } catch (e) {
      console.error('Fetch failed', e);
      setSyncStatus('error');
      // Fall back to cache if available
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) setData(JSON.parse(cached));
      } catch {}
    }
  };

  // Initial load
  useEffect(() => {
    (async () => {
      // Try cache first for instant render
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) setData(JSON.parse(cached));
      } catch {}
      await fetchData(true);
      setLoading(false);
    })();
  }, []);

  // Refetch when window regains focus (so the other person's edits show up)
  useEffect(() => {
    const onFocus = () => fetchData(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Debounced server save
  const saveTimerRef = React.useRef(null);
  const saveData = (newData) => {
    setData(newData); // optimistic
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(newData)); } catch {}
    setSyncStatus('syncing');

    // Debounce server writes so rapid star-tapping doesn't spam the API
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newData),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSyncStatus('synced');
      } catch (e) {
        console.error('Save failed', e);
        setSyncStatus('error');
      }
    }, 400);
  };

  const updateProperty = (id, patch) => {
    const newProps = data.properties.map((p) => (p.id === id ? { ...p, ...patch } : p));
    saveData({ ...data, properties: newProps });
  };

  const addProperty = (newProp) => {
    saveData({ ...data, properties: [...data.properties, newProp] });
  };

  const deleteProperty = (id) => {
    saveData({ ...data, properties: data.properties.filter((p) => p.id !== id) });
  };

  const selected = data.properties.find((p) => p.id === selectedId);

  const filteredProps = useMemo(() => {
    let ps = [...data.properties];
    if (view === 'all') ps = ps.filter((p) => p.status !== '❌ Passed');
    else if (view === 'closed') ps = ps.filter((p) => p.status === '❌ Passed');
    if (filterStatus !== 'all') ps = ps.filter((p) => p.status === filterStatus);

    if (sortBy === 'rent') {
      ps.sort((a, b) => (typeof a.rent === 'number' ? a.rent : 99999) - (typeof b.rent === 'number' ? b.rent : 99999));
    } else if (sortBy === 'rent-desc') {
      ps.sort((a, b) => (typeof b.rent === 'number' ? b.rent : -1) - (typeof a.rent === 'number' ? a.rent : -1));
    } else if (sortBy === 'sqft') {
      ps.sort((a, b) => (typeof b.sqft === 'number' ? b.sqft : 0) - (typeof a.sqft === 'number' ? a.sqft : 0));
    } else if (sortBy === 'ppsf') {
      ps.sort((a, b) => {
        const ap = typeof a.rent === 'number' && typeof a.sqft === 'number' ? a.rent / a.sqft : 99999;
        const bp = typeof b.rent === 'number' && typeof b.sqft === 'number' ? b.rent / b.sqft : 99999;
        return ap - bp;
      });
    } else if (sortBy === 'rating') {
      ps.sort((a, b) => ((b.ratings?.nicole || 0) + (b.ratings?.daniel || 0)) - ((a.ratings?.nicole || 0) + (a.ratings?.daniel || 0)));
    }
    return ps;
  }, [data.properties, view, filterStatus, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center">
        <div className="text-stone-600 font-display text-xl">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      <header className="sticky top-0 z-30 bg-[#F5EFE6]/95 backdrop-blur-sm border-b border-stone-300/60">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="font-display text-2xl sm:text-3xl text-stone-900 leading-none">Charleston</h1>
              <span className="text-[10px] uppercase tracking-[0.25em] text-stone-500">rental finder</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="text-[11px] text-stone-500">Nicole & Daniel</div>
              <span className="text-stone-300 text-[10px]">·</span>
              <button
                onClick={() => fetchData(true)}
                className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-800 transition"
                title="Refresh from server"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus === 'synced' ? 'bg-emerald-500' :
                    syncStatus === 'syncing' || syncStatus === 'loading' ? 'bg-amber-500 animate-pulse' :
                    'bg-red-500'
                  }`}
                />
                <span>
                  {syncStatus === 'synced' && 'Synced'}
                  {syncStatus === 'syncing' && 'Syncing…'}
                  {syncStatus === 'loading' && 'Loading…'}
                  {syncStatus === 'error' && 'Offline'}
                </span>
              </button>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => fetchData(true)}
              className="flex items-center gap-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium transition"
              title="Pull latest from server"
            >
              <RefreshCw size={14} className={syncStatus === 'syncing' || syncStatus === 'loading' ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 bg-[#A14B3B] hover:bg-[#8a3e30] text-[#F5EFE6] px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Property</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 -mt-0.5">
          {[
            { v: 'tour', label: 'Tour Day', icon: Calendar },
            { v: 'all', label: 'All Properties', icon: Home },
            { v: 'closed', label: 'Closed', icon: X },
          ].map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm border-b-2 transition ${
                view === v ? 'border-[#A14B3B] text-stone-900 font-medium' : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-6 pb-20">
        {view === 'tour' && (
          <TourDayView properties={data.properties} onOpen={setSelectedId} />
        )}

        {(view === 'all' || view === 'closed') && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="text-stone-600 text-sm">
                <span className="font-display text-xl text-stone-900 mr-1.5">{filteredProps.length}</span>
                {view === 'closed' ? 'closed properties' : 'active properties'}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-stone-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#A14B3B]"
                >
                  <option value="rent">Sort: Rent ↑</option>
                  <option value="rent-desc">Sort: Rent ↓</option>
                  <option value="sqft">Sort: SqFt ↓</option>
                  <option value="ppsf">Sort: $/sqft ↑</option>
                  <option value="rating">Sort: Rating ↓</option>
                </select>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 border rounded px-2.5 py-1.5 text-sm transition ${
                    filterStatus !== 'all' ? 'bg-[#A14B3B] text-[#F5EFE6] border-[#A14B3B]' : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Filter size={13} />
                  Filter
                  {filterStatus !== 'all' && <span className="ml-1 bg-white/20 rounded px-1 text-[10px]">1</span>}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-[#FAF6EE] border border-stone-300 rounded-lg p-3 mb-4 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded text-xs border ${filterStatus === 'all' ? 'bg-stone-900 text-[#F5EFE6] border-stone-900' : 'bg-white border-stone-300 text-stone-700'}`}
                >
                  All statuses
                </button>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded text-xs border ${filterStatus === s ? 'bg-stone-900 text-[#F5EFE6] border-stone-900' : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProps.map((p) => (
                <PropertyCard key={p.id} p={p} onUpdate={updateProperty} onOpen={setSelectedId} />
              ))}
            </div>

            {filteredProps.length === 0 && (
              <div className="text-center py-12 text-stone-500">No properties match.</div>
            )}
          </div>
        )}
      </main>

      {selected && (
        <PropertyModal p={selected} onClose={() => setSelectedId(null)} onUpdate={updateProperty} onDelete={deleteProperty} />
      )}

      {addOpen && <AddPropertyModal onClose={() => setAddOpen(false)} onAdd={addProperty} />}
    </div>
  );
}
