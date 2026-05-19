import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Star, Plus, X, Navigation, Phone, Mail, Filter, Trash2, Edit3,
  Clock, Calendar, Home, ExternalLink, Download, Upload,
} from 'lucide-react';

const STORAGE_KEY = 'charleston_rentals_v2';

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

const SEED_PROPERTIES = [
  { id: 'p1', address: '72 Logan St', type: 'Townhouse', br: 3, ba: 2.5, sqft: 1536, rent: 5500, neighborhood: 'Harleston Village', zip: '29401', status: '💬 Responded - action needed', contact: 'Southeastern Management Group', contactInfo: 'via Zillow chat (no chat)', nextStep: 'Watch email; call if silent by 5/19', notes: "Auto-reply only: 'not currently using chat, check email'. Available 6/1. No pets. Off-street parking." },
  { id: 'p2', address: '20 Limehouse St #AA', type: 'Apartment', br: 2, ba: 2, sqft: 1150, rent: 4000, neighborhood: '', zip: '29401', status: '💬 Responded - action needed', contact: 'Sandy', contactInfo: 'Zillow chat', nextStep: 'Decide whether to tour given sale risk', notes: "⚠️ RISK: 'special stipulations - unit will be on market.' Offered discount/free month if sells." },
  { id: 'p3', address: '28 Broad Street', type: 'Apt community', br: null, ba: null, sqft: 1560, rent: null, neighborhood: '', zip: '29401', status: '📞 Phone tag', contact: 'Sarah Etter', contactInfo: '📞 843-303-8588', nextStep: 'Call again 5/19 if no callback', notes: 'Elevator + rooftop deck building.' },
  { id: 'p4', address: '21 George St #403', type: 'Apartment', br: 3, ba: 2, sqft: 1306, rent: 5500, neighborhood: '', zip: '29401', status: '✅ Tour CONFIRMED', contact: 'Michael Riordan', contactInfo: 'mriordan2001@yahoo.com (direct) • phone/text', nextStep: 'Confirm exact 5/23 tour time via direct email', notes: "Tour scheduled 5/23 (time TBD). He's driving down. Direct email confirmed via earlier thread 4/20. Push 10am, 3pm, or 5:30pm.", tourTime: 'TBD', tourDate: '2026-05-23' },
  { id: 'p5', address: '655 East Bay', type: 'Apt community', br: null, ba: null, sqft: '748-2191', rent: '2261+', neighborhood: '', zip: '29401', status: '⚠️ No response 6+ weeks', contact: 'Leasing Agent (generic)', contactInfo: 'Zillow', nextStep: 'Final outreach via phone, then drop', notes: 'Inquired re: unit #659 on 4/4. Pet-friendly. 6+ wks silence.' },
  { id: 'p6', address: '5 Gadsdenboro St #411', type: 'Apartment', br: 2, ba: 2, sqft: 1154, rent: 5000, neighborhood: '', zip: '29401', status: '⚠️ No response 6+ weeks', contact: 'Charleston Daniel Ravenel R.E.', contactInfo: 'via Zillow (no chat)', nextStep: 'Call Daniel Ravenel office', notes: 'Asked for app 4/3. 6+ wks silence. Legit firm — listing may have rented.' },
  { id: 'p7', address: '70 Carolina St #301', type: 'Single-family', br: 3, ba: 3, sqft: 1415, rent: 5400, neighborhood: '', zip: '29403', status: '📤 Tour requested - awaiting response', contact: 'Garrett Henson', contactInfo: 'Zillow', nextStep: 'Drop if silent by 5/20', notes: 'Initial app request 3/28, no reply. Tour follow-up today.' },
  { id: 'p8', address: '69 Morris St #202', type: 'Apartment', br: 2, ba: 3, sqft: 1428, rent: 5750, neighborhood: '', zip: '29403', status: '📤 Tour requested - awaiting response', contact: '', contactInfo: 'Zillow', nextStep: 'Wait for response', notes: 'Morris Square (building name).' },
  { id: 'p9', address: '1 Vendue Range #36D', type: 'Apartment', br: 1, ba: 2, sqft: 950, rent: 6000, neighborhood: 'French Quarter', zip: '29401', status: '📤 Tour requested - awaiting response', contact: '', contactInfo: 'Zillow', nextStep: 'Wait for response', notes: 'Pricey for 1BR — waterfront premium.' },
  { id: 'p10', address: '31 Wentworth St', type: 'Single-family', br: 2, ba: 3, sqft: 1693, rent: 5400, neighborhood: '', zip: '29401', status: '⏳ Tour pending prequal', contact: 'Lois Lane Properties', contactInfo: 'Tenant Turner platform • email@tenantturnermail.com', nextStep: '🔴 COMPLETE PREQUAL ASAP — blocks 1pm tour', notes: 'Proposed: 5/23 @ 1pm. NOT confirmed until prequal done. Same mgr as 164 Queen — prequal may cover both.', tourTime: '1:00 PM', tourDate: '2026-05-23' },
  { id: 'p11', address: 'Society at Laurens', addressFull: '31 Laurens St', type: 'Apt community', br: null, ba: null, sqft: '696-1614', rent: '5395+', neighborhood: '', zip: '29403', status: '✅ Tour CONFIRMED', contact: 'Sloane A. (Southern Land Leasing)', contactInfo: 'sloane.a@southernland-leasing.com', nextStep: 'Capture details at tour', notes: '5/23 @ 12pm CONFIRMED via RentCafe. 31 Laurens St. Available 2BR/2BA 12-mo: Apt 2300 $5,395 1,344sqft 3rd fl.', tourTime: '12:00 PM', tourDate: '2026-05-23' },
  { id: 'p12', address: '35 Society St #1', type: 'Apartment', br: 2, ba: 1, sqft: 1157, rent: 4100, neighborhood: '', zip: '29401', status: '📤 Tour requested - awaiting response', contact: '', contactInfo: 'Zillow', nextStep: 'Wait for response', notes: '' },
  { id: 'p13', address: '33 Calhoun St #245', type: 'Apartment', br: 2, ba: 2, sqft: 1372, rent: 4300, neighborhood: '', zip: '29401', status: '✅ Tour CONFIRMED', contact: 'John Hale', contactInfo: 'halejf@gmail.com (direct, from calendar invite)', nextStep: '🟠 REPLY DIRECTLY to halejf@gmail.com with move-in date', notes: '5/23 @ 4:30pm CONFIRMED. Direct email = no need to go through Zillow proxy.', tourTime: '4:30 PM', tourDate: '2026-05-23' },
  { id: 'p14', address: '349 King St', type: 'Apartment', br: 2, ba: 2, sqft: 1150, rent: 4100, neighborhood: '', zip: '29401', status: '📤 Tour requested - awaiting response', contact: 'Kyle Erker', contactInfo: '📞 516-417-7279', nextStep: 'Wait for response - texted 5/16 to schedule', notes: "NOT Abercrombie bldg (that's 235 King). Kyle is the agent; tour will be with owners.", tourTime: 'TBD', tourDate: '2026-05-23' },
  { id: 'p15', address: '164 Queen St', type: 'Single-family', br: 2, ba: 3, sqft: 1188, rent: 4300, neighborhood: '', zip: '29401', status: '💬 Responded - action needed', contact: 'Lois Lane Properties', contactInfo: 'Tenant Turner platform', nextStep: '🟠 CLICK SCHEDULING LINK in email', notes: 'Available 7/1/2026. $4,300. Same mgr as 31 Wentworth — prequal may apply.' },
  { id: 'p16', address: '55 Hasell St #A', type: 'Single-family', br: 2, ba: 3, sqft: 1767, rent: 3850, neighborhood: '', zip: '29401', status: '❌ Passed', contact: '', contactInfo: 'Zillow', nextStep: '—', notes: 'Best $/sqft on list. Lease only 06/15/26-02/28/27 — too short.' },
  { id: 'p17', address: '94 Bogard St', type: 'Single-family', br: 3, ba: 4, sqft: 2772, rent: 5999, neighborhood: '', zip: '29403', status: '📤 Tour requested - awaiting response', contact: 'Proper Stays (AppFolio)', contactInfo: 'communications@properstays.mailer.appfolio.us', nextStep: 'Wait for response from Proper Stays', notes: 'Largest sqft on list. Same mgr as 234 Ashley.' },
  { id: 'p18', address: 'The Charleigh', addressFull: '441 Meeting St', type: 'Apt community', br: null, ba: null, sqft: '529-1328', rent: null, neighborhood: '', zip: '29403', status: '✅ Tour CONFIRMED', contact: '', contactInfo: 'Zillow', nextStep: '🟡 Fix calendar event (currently 11am, should be 11:15am)', notes: '5/23 @ 11:15am CONFIRMED. 441 Meeting St — apt community tour.', tourTime: '11:15 AM', tourDate: '2026-05-23' },
  { id: 'p19', address: 'Laurel, A Collective', addressFull: '635 King St', type: 'Apt community', br: null, ba: null, sqft: '464-1468', rent: null, neighborhood: '', zip: '29403', status: '📤 Tour requested - awaiting response', contact: '', contactInfo: 'Zillow', nextStep: 'Wait for response', notes: '635 King St.' },
  { id: 'p20', address: '234 Ashley Ave #A', type: 'Apartment', br: 2, ba: 2, sqft: 1600, rent: 4250, neighborhood: 'Westside', zip: '29403', status: '📤 Tour requested - awaiting response', contact: 'Proper Stays (AppFolio)', contactInfo: 'communications@properstays.mailer.appfolio.us', nextStep: 'Wait for response from Proper Stays', notes: 'Same mgr as 94 Bogard.' },
  { id: 'p21', address: '19 N Tracy St', type: 'Single-family', br: 3, ba: 2, sqft: 1181, rent: 5500, neighborhood: '', zip: '29403', status: '⏳ Tour pending', contact: 'Brittany Hagood', contactInfo: 'Zillow proxy (replies in inbox)', nextStep: "🟠 AWAIT BRITTANY'S 10AM CONFIRM", notes: 'Proposed 11am, you asked 10am to avoid Charleigh conflict. Awaiting confirm.', tourTime: '10:30 AM', tourDate: '2026-05-23' },
  { id: 'p22', address: '32 H St', type: 'Single-family', br: 2, ba: 2, sqft: 1189, rent: 4200, neighborhood: '', zip: '29403', status: '📤 Tour requested - awaiting response', contact: '', contactInfo: 'Zillow', nextStep: 'Wait for response', notes: '' },
  { id: 'p23', address: '278 King St #C-1', type: 'Apartment', br: 2, ba: 2, sqft: 1042, rent: 4200, neighborhood: '', zip: '29401', status: '📤 Tour requested - awaiting response', contact: '', contactInfo: 'Zillow', nextStep: 'Wait for response', notes: '' },
  { id: 'p24', address: '235 King St', type: 'Apt building', br: null, ba: null, sqft: null, rent: null, neighborhood: '', zip: '29401', status: '✅ Tour CONFIRMED', contact: '', contactInfo: 'Zillow', nextStep: 'Capture details at tour', notes: '5/23 @ 2pm CONFIRMED. The Abercrombie building. 9-unit conversion.', tourTime: '2:00 PM', tourDate: '2026-05-23' },
];

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
    return `https://www.google.com/maps/dir/?api=1&destination=${addrs[0]}&travelmode=driving`;
  }
  const origin = addrs[0];
  const destination = addrs[addrs.length - 1];
  const waypoints = addrs.slice(1, -1).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
};

// ============== UI Components ==============
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
      {verdictDot && <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${verdictDot}`} />}
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
          <span className="font-medium">Sat 5/23</span>
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
                  <div className="font-display text-lg text-emerald-900">Saturday 5/23 · {p.tourTime}</div>
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

function SyncModal({ data, onClose, onImport }) {
  const [importText, setImportText] = useState('');
  const json = JSON.stringify(data, null, 2);

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charleston-rentals-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      alert('Copied! Paste it into a note or message to Nicole.');
    } catch {
      alert('Copy failed — long-press the text below to copy manually.');
    }
  };

  const doImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.properties || !Array.isArray(parsed.properties)) {
        alert('Invalid format — no properties array found.');
        return;
      }
      if (!confirm(`Replace current data with ${parsed.properties.length} properties? This overwrites everything on this device.`)) return;
      onImport(parsed);
      onClose();
    } catch (e) {
      alert('Could not parse JSON: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6" onClick={onClose}>
      <div className="bg-[#FAF6EE] rounded-xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-300" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#FAF6EE] border-b border-stone-300 px-5 py-3 flex justify-between items-center">
          <h2 className="font-display text-xl text-stone-900">Sync with Nicole</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="text-sm text-stone-600">
            Data lives in this browser's localStorage. To share with Nicole's phone, export here and paste into hers — and vice versa.
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium mb-2">Export</div>
            <div className="flex gap-2 mb-2">
              <button onClick={download} className="flex items-center gap-1.5 bg-stone-900 text-[#F5EFE6] px-3 py-2 rounded text-sm hover:bg-stone-800 transition">
                <Download size={14} /> Download JSON
              </button>
              <button onClick={copy} className="flex items-center gap-1.5 bg-white border border-stone-300 text-stone-800 px-3 py-2 rounded text-sm hover:bg-stone-100 transition">
                Copy to clipboard
              </button>
            </div>
            <textarea readOnly value={json} className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-[11px] font-mono" rows={6} onClick={(e) => e.target.select()} />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-medium mb-2">Import (replaces current data)</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON from Nicole's export here…"
              className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-[#A14B3B]"
              rows={6}
            />
            <button onClick={doImport} disabled={!importText.trim()} className="mt-2 flex items-center gap-1.5 bg-[#A14B3B] text-[#F5EFE6] px-3 py-2 rounded text-sm hover:bg-[#8a3e30] transition disabled:opacity-40">
              <Upload size={14} /> Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TourDayView({ properties, onOpen }) {
  const tours = useMemo(() => {
    return properties
      .filter((p) => p.tourDate === '2026-05-23' || p.tourTime)
      .sort((a, b) => tourTimeToMinutes(a.tourTime) - tourTimeToMinutes(b.tourTime));
  }, [properties]);

  const routeUrl = buildRouteUrl(tours.filter((t) => t.tourTime && t.tourTime !== 'TBD'));
  const confirmed = tours.filter((t) => t.status === '✅ Tour CONFIRMED').length;
  const pending = tours.filter((t) => t.status?.includes('pending') || t.status?.includes('action needed')).length;

  return (
    <div className="space-y-4">
      <div className="bg-stone-900 text-[#F5EFE6] rounded-xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#A14B3B]/20 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#A14B3B] mb-2 font-medium">Saturday, May 23 · 2026</div>
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
              Route All Stops in Google Maps
              <ExternalLink size={13} className="opacity-70" />
            </a>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {tours.map((p) => (
          <div
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="bg-[#FAF6EE] border border-stone-300/60 hover:border-[#A14B3B]/40 hover:shadow-md transition rounded-lg p-4 cursor-pointer flex gap-4 items-start"
          >
            <div className="text-center w-20 flex-shrink-0">
              <div className="font-display text-lg text-[#A14B3B] font-medium leading-tight">{p.tourTime || 'TBD'}</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">Sat 5/23</div>
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
  const [syncOpen, setSyncOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('rent');
  const [showFilters, setShowFilters] = useState(false);

  // Load on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(JSON.parse(raw));
      } else {
        const seed = { properties: SEED_PROPERTIES, version: 2 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        setData(seed);
      }
    } catch (e) {
      console.error('Load failed', e);
      const seed = { properties: SEED_PROPERTIES, version: 2 };
      setData(seed);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveData = (newData) => {
    setData(newData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error('Save failed', e);
    }
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

  const importData = (newData) => saveData(newData);

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
            <div className="text-[11px] text-stone-500 mt-0.5">Nicole & Daniel</div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSyncOpen(true)}
              className="flex items-center gap-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium transition"
              title="Sync with Nicole"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Sync</span>
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
      {syncOpen && <SyncModal data={data} onClose={() => setSyncOpen(false)} onImport={importData} />}
    </div>
  );
}
