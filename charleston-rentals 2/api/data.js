import { Redis } from '@upstash/redis';

// Handles both Vercel Marketplace (KV_*) and direct Upstash (UPSTASH_*) env var naming
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = 'charleston_rentals_v2';

// Seed data (only used on very first GET when Redis is empty)
const SEED = {
  version: 2,
  properties: [
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
  ],
};

export default async function handler(req, res) {
  // CORS — safe to allow same-origin tools/clients
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      let data = await redis.get(KEY);
      if (!data) {
        await redis.set(KEY, SEED);
        data = SEED;
      }
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || !Array.isArray(body.properties)) {
        return res.status(400).json({ error: 'Invalid payload — missing properties array' });
      }
      await redis.set(KEY, body);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('API error:', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
