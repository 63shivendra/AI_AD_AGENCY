/* Seed the Growth Engine demo workspace with realistic Kanpur data. */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const rnd = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const pick = (arr, seed) => arr[Math.floor(rnd(seed) * arr.length)];
const day = 86400000;
const now = Date.now();

const CLIENTS = [
  {
    slug: "sharma-dental",
    name: "Sharma Dental & Smile Studio",
    niche: "Dental Clinic",
    area: "Swaroop Nagar",
    phone: "9876543210",
    address: "112/4, Swaroop Nagar, Near Moti Jheel, Kanpur",
    emoji: "🦷",
    color: "#4FD1C5",
    plan: "LOCAL",
    health: 92,
    contact: "Dr. Anil Sharma",
    proof: "Dr. Anil Sharma, 12+ years",
    notes: "Highest ticket client. 1 implant = ₹28k, so a single lead pays the retainer.",
    offers: [
      { title: "₹199 Full Checkup + X-Ray", description: "Digital X-ray, scaling estimate and a written treatment plan. No hidden charges.", price: "₹199", tag: "This week", primary: true },
      { title: "Braces EMI from ₹2,499/mo", description: "Metal, ceramic and clear aligners. 0% interest EMI on 6 months.", price: "₹2,499/mo", tag: "0% EMI" },
      { title: "Free Smile Consultation", description: "15-minute consult with Dr. Anil Sharma. Before/after photos shown.", price: "Free", tag: "New patients" },
    ],
    ads: [
      { hook: "Swaroop Nagar mein 6 mahine se daant ka dard?", title: "Toothache — same-day relief", score: 91, ctr: 2.9, roas: 4.2, status: "PUBLISHED", spend: 8400, leads: 61, revenue: 168000, views: 41200 },
      { hook: "₹199 mein full checkup — X-ray included", title: "₹199 checkup offer", score: 86, ctr: 2.4, roas: 3.1, status: "PUBLISHED", spend: 6100, leads: 38, revenue: 96000, views: 28400 },
      { hook: "Braces ki EMI ₹2,499 se shuru", title: "Braces EMI hook", score: 74, ctr: 1.7, roas: 2.2, status: "FATIGUED", spend: 5200, leads: 14, revenue: 42000, views: 33100 },
      { hook: "3 signs ignore mat karo — ₹199 full checkup", title: "Trend reel — 3 signs", score: 94, ctr: 3.4, roas: 4.8, status: "READY", spend: 0, leads: 0, revenue: 0, views: 0, format: "TREND" },
    ],
  },
  {
    slug: "birhana-bridal",
    name: "Birhana Bridal House",
    niche: "Bridal Boutique",
    area: "Birhana Road",
    phone: "9876500011",
    address: "Shop 14, Birhana Road, Kanpur",
    emoji: "👰",
    color: "#F472B6",
    plan: "LOCAL",
    health: 78,
    contact: "Meena Agarwal",
    proof: "3-din fitting guarantee",
    notes: "Wedding season spikes Nov–Feb. Push lehengas above ₹25k, ignore ₹8k stock.",
    offers: [
      { title: "Bridal Lehenga from ₹18,999", description: "Hand-embroidered, 3-day alteration, free dupatta styling.", price: "₹18,999", tag: "Wedding season", primary: true },
      { title: "3 Lehengas in 3 Days", description: "Pick, fit and take home before your mehendi.", price: "Express", tag: "Limited" },
      { title: "Free Trial + Photos", description: "Try 3 lehengas with jewellery, get 5 edited photos.", price: "Free", tag: "Appointment" },
    ],
    ads: [
      { hook: "Shaadi ki shopping Birhana Road pe — 40% off", title: "Wedding season 40% off", score: 88, ctr: 2.6, roas: 3.6, status: "PUBLISHED", spend: 7800, leads: 44, revenue: 132000, views: 52300 },
      { hook: "Kanpur mein bridal lehenga 3 din mein ready", title: "3-day alteration hook", score: 81, ctr: 2.1, roas: 2.9, status: "PUBLISHED", spend: 4300, leads: 22, revenue: 74000, views: 21800 },
      { hook: "Naye dulhan ka pehla look, ₹18,999 se", title: "First-look reel", score: 69, ctr: 1.5, roas: 1.8, status: "PAUSED", spend: 2900, leads: 8, revenue: 26000, views: 15400 },
    ],
  },
  {
    slug: "kakadeo-achievers",
    name: "Kakadeo Achievers Academy",
    niche: "NEET / JEE Coaching",
    area: "Kakadeo",
    phone: "9876511122",
    address: "Plot 7, Kakadeo Main Road, Kanpur",
    emoji: "🎯",
    color: "#A78BFA",
    plan: "GROWTH",
    monthlyFee: 14999,
    health: 95,
    contact: "Rakesh Pandey",
    proof: "42 NEET selections last year",
    notes: "Admission worth ₹85k. Never discount fees — give free demo class instead.",
    offers: [
      { title: "Free NEET Demo Class", description: "Sunday 11 AM, 90 minutes with the physics HOD. Parents welcome.", price: "Free", tag: "Sunday", primary: true },
      { title: "Scholarship Test — up to 60% off", description: "Test on 2nd of every month. Result same evening on WhatsApp.", price: "₹100", tag: "Monthly" },
      { title: "Dropper Batch 2027", description: "300+ marks jump track record. 42 selections last year.", price: "₹85,000/yr", tag: "Limited seats" },
    ],
    ads: [
      { hook: "NEET 2027: 1 saal mein 300 marks ka jump", title: "300 marks jump", score: 94, ctr: 3.4, roas: 5.1, status: "PUBLISHED", spend: 12400, leads: 96, revenue: 480000, views: 68800 },
      { hook: "Kakadeo ka wo coaching jiske 42 students select hue", title: "42 selections proof", score: 89, ctr: 2.8, roas: 4.0, status: "PUBLISHED", spend: 9100, leads: 58, revenue: 290000, views: 47100 },
      { hook: "Free demo class — Sunday 11 baje", title: "Sunday demo CTA", score: 76, ctr: 1.9, roas: 2.4, status: "PUBLISHED", spend: 3800, leads: 21, revenue: 85000, views: 19200 },
    ],
  },
  {
    slug: "jajmau-leather",
    name: "Jajmau Leather Exports",
    niche: "Leather Manufacturer (B2B)",
    area: "Jajmau",
    phone: "9876522233",
    address: "Plot 22, Leather Industrial Estate, Jajmau, Kanpur",
    emoji: "🧳",
    color: "#F59E0B",
    plan: "SCALE",
    monthlyFee: 24999,
    health: 84,
    contact: "Imran Qureshi",
    proof: "Dubai & EU export buyers",
    notes: "B2B export leads. One container = ₹18L. Lead value is 40x a retail lead.",
    offers: [
      { title: "MOQ 500 pcs, 21-day dispatch", description: "Full-grain saddlery leather, EU REACH compliant.", price: "MOQ 500", tag: "Export", primary: true },
      { title: "Free Sample Kit", description: "3 swatches + spec sheet couriered anywhere in India.", price: "Free", tag: "B2B" },
    ],
    ads: [
      { hook: "Kanpur leather, Dubai shelves tak", title: "Kanpur to Dubai", score: 83, ctr: 1.8, roas: 6.2, status: "PUBLISHED", spend: 15600, leads: 27, revenue: 936000, views: 24300 },
      { hook: "CNC-grade saddlery, 21 din mein export dispatch", title: "21-day dispatch", score: 79, ctr: 1.6, roas: 4.8, status: "PUBLISHED", spend: 8200, leads: 12, revenue: 384000, views: 12800 },
    ],
  },
  {
    slug: "gupta-jewellers",
    name: "Gupta Jewellers",
    niche: "Jewellery",
    area: "Civil Lines",
    phone: "9876533344",
    address: "18/4, Civil Lines, Near Phool Bagh, Kanpur",
    emoji: "💎",
    color: "#FBBF24",
    plan: "LOCAL",
    health: 71,
    contact: "Sandeep Gupta",
    proof: "40 saal purani family shop",
    notes: "Making charges 0% is the only hook that works. Festival spikes are huge.",
    offers: [
      { title: "0% Making Charges", description: "22K hallmarked gold, all designs. Only on pre-booked visits.", price: "0%", tag: "This month", primary: true },
      { title: "Dhanteras Token ₹5,000", description: "Lock today's rate with a ₹5,000 token. Adjustable in final bill.", price: "₹5,000", tag: "Rate lock" },
    ],
    ads: [
      { hook: "Civil Lines mein 22K gold — making charges 0%", title: "0% making charges", score: 87, ctr: 2.3, roas: 3.4, status: "PUBLISHED", spend: 6900, leads: 33, revenue: 112000, views: 29800 },
      { hook: "Dhanteras booking shuru — ₹5,000 token", title: "Dhanteras rate lock", score: 72, ctr: 1.4, roas: 1.9, status: "FATIGUED", spend: 4800, leads: 11, revenue: 54000, views: 21400 },
    ],
  },
  {
    slug: "royal-grand-banquet",
    name: "Royal Grand Banquet",
    niche: "Banquet Hall",
    area: "GT Road",
    phone: "9876544455",
    address: "Milestone 12, GT Road, Kanpur",
    emoji: "🎪",
    color: "#60A5FA",
    plan: "LOCAL",
    health: 66,
    contact: "Vikas Yadav",
    proof: "800-guest hall, valet",
    notes: "₹499/plate is below market — margins are thin. Push December dates urgency.",
    offers: [
      { title: "₹499/plate, 800 guests", description: "AC hall, valet, 4-hour decor window. Off-season pricing.", price: "₹499/plate", tag: "Off-season", primary: true },
      { title: "Free Venue Visit + Tasting", description: "Come see the hall lit up, taste 6 dishes. No booking pressure.", price: "Free", tag: "Weekends" },
    ],
    ads: [
      { hook: "GT Road pe 800 guest ki shaadi, ₹499/plate se", title: "800 guests ₹499/plate", score: 78, ctr: 1.9, roas: 2.6, status: "PUBLISHED", spend: 5600, leads: 19, revenue: 76000, views: 18700 },
      { hook: "December dates khatam ho rahi hain", title: "December urgency", score: 61, ctr: 1.1, roas: 1.4, status: "PAUSED", spend: 3100, leads: 6, revenue: 24000, views: 11200 },
    ],
  },
  {
    slug: "panki-precision",
    name: "Panki Precision Works",
    niche: "CNC / Industrial (B2B)",
    area: "Panki",
    phone: "9876555566",
    address: "D-14, Panki Industrial Area, Kanpur",
    emoji: "⚙️",
    color: "#94A3B8",
    plan: "GROWTH",
    monthlyFee: 14999,
    health: 88,
    contact: "A. K. Srivastava",
    proof: "ISO 9001:2015, 0.01mm tolerance",
    notes: "Vendor approval cycle is 30–45 days. Track leads as WON only after PO.",
    offers: [
      { title: "0.01mm Tolerance CNC Parts", description: "5-axis milling, ISO 9001:2015, 7-day vendor approval.", price: "RFQ", tag: "ISO", primary: true },
      { title: "Vendor Approval in 7 Days", description: "Send drawings, get a quote and audit slot in a week.", price: "Free audit", tag: "B2B" },
    ],
    ads: [
      { hook: "CNC parts, 0.01mm tolerance, Panki se", title: "0.01mm tolerance", score: 80, ctr: 1.5, roas: 5.4, status: "PUBLISHED", spend: 7200, leads: 14, revenue: 420000, views: 9800 },
    ],
  },
  {
    slug: "mehta-ivf",
    name: "Dr. Mehta IVF Centre",
    niche: "IVF / Fertility",
    area: "Mall Road",
    phone: "9876566677",
    address: "Mall Road, Near Bada Chauraha, Kanpur",
    emoji: "👶",
    color: "#F87171",
    plan: "PROSPECT",
    status: "PROSPECT",
    health: 0,
    contact: "Dr. Sunita Mehta",
    proof: "Embryologist-led consult",
    notes: "Spec demo sent on WhatsApp. 1 IVF cycle = ₹1.4L — highest LTV in the city.",
    offers: [
      { title: "₹0 IVF Consultation", description: "First consult with the embryologist, no charges.", price: "Free", tag: "Spec demo", primary: true },
    ],
    ads: [],
  },
  {
    slug: "naveen-sweets",
    name: "Naveen Sweets & Namkeen",
    niche: "Sweets / Namkeen",
    area: "Naveen Market",
    phone: "9876577788",
    address: "Naveen Market, Kanpur",
    emoji: "🍬",
    color: "#FDBA74",
    plan: "LOCAL",
    status: "PAUSED",
    health: 34,
    contact: "Ramesh Halwai",
    proof: "40 saal purani dukaan",
    notes: "Paused — low ticket size, can't cover retainer. Keep for a case study only.",
    offers: [
      { title: "Diwali Gift Box from ₹349", description: "Kaju katli, motichoor and dry fruit boxes.", price: "₹349", tag: "Festive", primary: true },
    ],
    ads: [
      { hook: "Naveen Market ki 40 saal purani mithai", title: "40-year legacy", score: 64, ctr: 1.2, roas: 1.1, status: "PAUSED", spend: 2400, leads: 7, revenue: 8400, views: 13100 },
    ],
  },
];

const HOOK_POOL = [
  "Kanpur mein is hafte sabse zyada poochha ja raha hai",
  "Aapke area mein log yahan kyun aa rahe hain?",
  "Ye 3 second dekh lo, paisa bachega",
  "Sirf 12 slots is mahine — phir wait karna padega",
];

const CTA_POOL = ["WhatsApp karo", "Slot book karo", "Aaj hi aao", "Call karo abhi"];

const CLIENT_HOURS = {
  "birhana-bridal": "10 AM – 8:30 PM",
  "kakadeo-achievers": "8 AM – 8 PM",
  "jajmau-leather": "9 AM – 6 PM",
  "gupta-jewellers": "10:30 AM – 8 PM",
  "royal-grand-banquet": "10 AM – 10 PM",
  "panki-precision": "9 AM – 6 PM",
  "mehta-ivf": "9 AM – 7 PM",
  "naveen-sweets": "8 AM – 10 PM",
  "sharma-dental": "10 AM – 8 PM",
};

const REVIEW_COPY = {
  dental: {
    tags: ["Painless treatment", "Polite staff", "Clean clinic"],
    texts: [
      "Swaroop Nagar mein itni clean clinic milna mushkil hai. Doctor ne pura treatment samjhaya aur billing mein koi surprise nahi tha. Staff bhi bahut polite hai.",
      "Braces ka treatment karwaya, har visit pe proper guidance mili. Appointment time pe hi hota hai, lambi wait nahi karni padti.",
      "Root canal hua tha, bilkul painless. X-ray dikha kar exact problem batayi aur charges bhi pehle hi clear kar diye.",
    ],
  },
  bridal: {
    tags: ["Great collection", "Perfect fitting", "Helpful staff"],
    texts: [
      "Birhana Road pe itni variety dekh kar confuse ho gayi thi, lekin Meena ji ne patiently 5 lehenga dikhaye. 3 din mein fitting ready ho gayi.",
      "Shaadi ke liye lehenga liya, dupatta styling bhi free ki. Rush ke bawajood staff ne time diya aur koi pressure nahi banaya.",
      "Fitting ekdum perfect thi, ek bhi alteration dobara nahi karwana pada. Family ne bhi yahi se shopping ki.",
    ],
  },
  coaching: {
    tags: ["Experienced teachers", "Regular tests", "Doubt clearing"],
    texts: [
      "Kakadeo mein best coaching. Physics ke sir doubt session mein har question solve karte hain. Mera mock test score 2 mahine mein 120 marks badha.",
      "Regular tests aur parent updates ki wajah se discipline bana raha. Teachers personally follow up karte hain.",
      "Free demo class ke baad hi admission liya. Study material concise hai, ratna nahi padta.",
    ],
  },
  leather: {
    tags: ["Export quality", "On-time delivery", "Clear communication"],
    texts: [
      "Jajmau se export karwana easy nahi hota, par yahan ka team samples se dispatch tak sab track karta hai. 21 din mein order ship ho gaya.",
      "REACH compliance papers pehle hi clear kar diye, isliye EU buyer ko submit karne mein dikkat nahi aayi. Packing export standard.",
      "Small trial order se shuru kiya, quality consistent rahi. Ab regular 500 pcs ka order dete hain.",
    ],
  },
  jewellery: {
    tags: ["Trustworthy", "No hidden charges", "Hallmarked"],
    texts: [
      "Civil Lines ki bhaag-daud mein Gupta Jewellers ka 0% making charges offer sach nikla. Bill mein exactly wahi likha tha jo pehle bataya gaya.",
      "Purani family shop hai, isliye trust tha. Hallmarking aur exchange policy dono clear batayi.",
      "Dhanteras pe token book kiya tha, rate lock ho gaya. Delivery ke din koi hidden charge nahi laga.",
    ],
  },
  banquet: {
    tags: ["Beautiful venue", "Great food", "Smooth management"],
    texts: [
      "GT Road pe 800 guests ki shaadi manage karna huge tha, par team ne parking se catering tak sab sambhala. Guests ne khana specially praise kiya.",
      "Hall ki lighting aur decor window bahut helpful rahi. Management ne har call pe response diya.",
      "Off-season rate mila, isliye budget mein sab fit ho gaya. Valet aur AC dono kaam ke the.",
    ],
  },
  cnc: {
    tags: ["Precision quality", "On-time delivery", "Easy vendor process"],
    texts: [
      "Panki ki is unit se 0.01mm tolerance wale parts liye. Inspection report ke saath material mila, rejection almost zero.",
      "Vendor approval 7 din mein ho gaya. Drawing bhejne ke baad quote aur audit slot dono jaldi mila.",
      "Delivery dates consistent hain. Emergency order bhi time pe dispatch kiya, communication clear raha.",
    ],
  },
  ivf: {
    tags: ["Caring staff", "Clear explanation", "Confidential"],
    texts: [
      "Consultation ke time embryologist ne har step detail mein samjhaya. Koi jaldi ya pressure nahi tha.",
      "Staff bahut caring hai aur privacy ka pura dhyan rakhte hain. Reports WhatsApp pe time pe milti hain.",
      "Treatment plan written mein mila, isliye cost ka clarity tha. Emotional support bhi accha mila.",
    ],
  },
  sweets: {
    tags: ["Fresh mithai", "Good packaging", "Fair pricing"],
    texts: [
      "Naveen Market ki purani dukaan hai, mithai hamesha fresh milti hai. Packaging bhi gift ke liye acchi hai.",
      "Diwali box order kiya tha, time pe delivery hui aur taste sabko pasand aaya.",
      "Rate reasonable hai aur staff behaviour accha. Namkeen bhi crisp rehta hai.",
    ],
  },
};

function reviewKey(niche) {
  const n = niche.toLowerCase();
  return Object.keys(REVIEW_COPY).find((k) => n.includes(k)) ?? "dental";
}

const LEAD_NAMES = [
  "Rohit Verma", "Priya Gupta", "Ankit Yadav", "Sneha Mishra", "Mohd Faizan",
  "Pooja Singh", "Deepak Tiwari", "Neha Agarwal", "Abhishek Sahu", "Ritu Pandey",
  "Saurabh Jain", "Kavita Devi", "Arjun Nigam", "Shalini Dubey", "Wasim Khan",
  "Anjali Rathore", "Manish Katiyar", "Preeti Bajpai", "Harsh Vardhan", "Saba Anwar",
];

async function main() {
  console.log("• clearing old demo data");
  await db.event.deleteMany();
  await db.job.deleteMany();
  await db.metricDaily.deleteMany();
  await db.review.deleteMany();
  await db.lead.deleteMany();
  await db.adVariant.deleteMany();
  await db.ad.deleteMany();
  await db.offer.deleteMany();
  await db.client.deleteMany();

  const clientRecords = [];

  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i];
    const status = c.status || "ACTIVE";
    const client = await db.client.create({
      data: {
        slug: c.slug,
        name: c.name,
        niche: c.niche,
        area: c.area,
        phone: c.phone,
        hours: CLIENT_HOURS[c.slug] ?? "10 AM – 8 PM",
        address: c.address,
        emoji: c.emoji,
        brandColor: c.color,
        plan: c.plan,
        status,
        monthlyFee: c.monthlyFee ?? 9999,
        setupFee: 4999,
        contactName: c.contact,
        notes: c.notes,
        proof: c.proof,
        health: c.health,
        googleReviewUrl: `https://search.google.com/local/writereview?placeid=demo-${c.slug}`,
        mapUrl: `https://maps.google.com/?q=${encodeURIComponent(c.name + " " + c.area + " Kanpur")}`,
        createdAt: new Date(now - (60 + i * 9) * day),
        offers: {
          create: c.offers.map((o, idx) => ({
            title: o.title,
            description: o.description,
            price: o.price,
            tag: o.tag,
            isPrimary: Boolean(o.primary),
            sort: idx,
          })),
        },
      },
      include: { offers: true },
    });
    clientRecords.push(client);

    // ── Ads + variants + daily metrics ──────────────────────────
    for (let a = 0; a < c.ads.length; a++) {
      const ad = c.ads[a];
      const isTrend = ad.format === "TREND";
      const created = new Date(now - (28 - a * 7) * day);
      const script = {
        scenes: [
          { label: "Hook", text: ad.hook, sub: `${c.area}, ${"Kanpur"}` },
          { label: "Offer", text: c.offers[0].title, sub: c.offers[0].description.slice(0, 78) },
          { label: "CTA", text: "Aaj hi WhatsApp karo", sub: `+91 ${c.phone}` },
        ],
        ...(isTrend
          ? {
              angle: "Trend — 3 signs",
              trend: "dental",
              voiceScript:
                "Swaroop Nagar walo, teen signs ignore mat karo. Sensitivity, bleeding, ya dard? 199 mein full checkup, X-ray free. WhatsApp karo.",
              offerText: "Rs 199 FULL CHECKUP + X-RAY",
              price: "Rs 199",
              doctor: "DR. ANIL SHARMA",
              proof: "12+ YEARS",
              presenterMode: "auto",
              presenterKind: "stock",
            }
          : {}),
      };
      const record = await db.ad.create({
        data: {
          clientId: client.id,
          title: ad.title,
          hook: ad.hook,
          script: JSON.stringify(script),
          format: ad.format || "REEL",
          platform: a % 3 === 2 ? "TIKTOK" : "META",
          status: ad.status,
          hitScore: ad.score,
          predictedCtr: ad.ctr,
          predictedRoas: ad.roas,
          durationSec: isTrend ? 13 : 12,
          views: ad.views,
          clicks: Math.round(ad.views * (ad.ctr / 100)),
          leads: ad.leads,
          spend: ad.spend,
          revenue: Math.round(ad.spend * ad.roas),
          createdAt: created,
          publishedAt: ad.status === "PUBLISHED" ? created : null,
        },
      });

      const labels = ["Hook A — problem", "Hook B — price", "Hook C — proof"];
      for (let v = 0; v < 3; v++) {
        await db.adVariant.create({
          data: {
            adId: record.id,
            label: labels[v],
            hookText:
              v === 0
                ? ad.hook
                : v === 1
                  ? c.offers[0].title + " — sirf " + c.area + " mein"
                  : pick(HOOK_POOL, i * 10 + v + a),
            cta: pick(CTA_POOL, i + v + a),
            score: Math.max(41, Math.min(97, ad.score - v * 6 + Math.round(rnd(i + v) * 5))),
            isWinner: v === 0,
          },
        });
      }
    }

    // 30 days of metrics for active clients
    if (status === "ACTIVE") {
      for (let d = 29; d >= 0; d--) {
        const seed = i * 100 + d;
        const weekday = new Date(now - d * day).getDay();
        const weekendBoost = weekday === 0 || weekday === 6 ? 1.35 : 1;
        const spend = Math.round((240 + rnd(seed) * 380) * weekendBoost);
        const impressions = Math.round(spend * (14 + rnd(seed + 1) * 11));
        const clicks = Math.round(impressions * (0.014 + rnd(seed + 2) * 0.018));
        const leads = Math.max(1, Math.round(clicks * (0.09 + rnd(seed + 3) * 0.1)));
        await db.metricDaily.create({
          data: {
            clientId: client.id,
            date: new Date(now - d * day),
            spend,
            impressions,
            clicks,
            leads,
            // Revenue is attributed from WON leads (CRM truth), not platform-reported.
            revenue: 0,
          },
        });
      }
    }

    // ── Leads ──────────────────────────────────────────────────
    if (status !== "PROSPECT") {
      const count = status === "PAUSED" ? 5 : 9 + Math.round(rnd(i * 7) * 8);
      for (let l = 0; l < count; l++) {
        const seed = i * 50 + l;
        // Separate multipliers per field so name / age / status don't move together.
        const ageDays = rnd(seed * 1.37 + 3.1) * 29;
        const statusRoll = rnd(seed * 2.11 + 41);
        const leadStatus =
          status === "PAUSED"
            ? "LOST"
            : statusRoll > 0.72
              ? "WON"
              : statusRoll > 0.45
                ? "CONTACTED"
                : "NEW";
        await db.lead.create({
          data: {
            clientId: client.id,
            name: pick(LEAD_NAMES, seed * 3.71 + 11),
            phone: `9${Math.floor(700000000 + rnd(seed * 5.1 + 23) * 99999999)}`,
            intent: pick(
              ["Price poochha", "Slot chahiye", "Aaj aa sakta hoon?", "EMI options?", "Bulk order enquiry", "Aapka address?"],
              seed * 1.9 + 5
            ),
            source: pick(["WHATSAPP", "WHATSAPP", "WHATSAPP", "CALL", "WALKIN"], seed * 2.3 + 7),
            status: leadStatus,
            value: leadStatus === "WON" ? 8000 + Math.round(rnd(seed * 4.3 + 19) * 40000) : 0,
            createdAt: new Date(now - ageDays * day),
          },
        });
      }
    }

    // ── Reviews ────────────────────────────────────────────────
    if (status === "ACTIVE") {
      const copy = REVIEW_COPY[reviewKey(c.niche)];
      for (let r = 0; r < 3; r++) {
        const seed = i * 30 + r;
        await db.review.create({
          data: {
            clientId: client.id,
            customer: pick(LEAD_NAMES, seed + 11),
            rating: r === 2 ? 4 : 5,
            tags: JSON.stringify(copy.tags),
            text: copy.texts[r % copy.texts.length],
            status: "POSTED",
            createdAt: new Date(now - rnd(seed) * 12 * day),
          },
        });
      }
    }

    // ── Job history ────────────────────────────────────────────
    if (c.ads.length) {
      const renderSec = Number((1.6 + rnd(i * 13 + 5) * 0.9).toFixed(1));
      const startedAt = new Date(now - (4 + i) * day);
      await db.job.create({
        data: {
          clientId: client.id,
          type: "RENDER",
          status: "DONE",
          progress: 100,
          payload: JSON.stringify({ adTitle: c.ads[0].title, engine: "ffmpeg-h264" }),
          result: JSON.stringify({ seconds: renderSec, sizeMb: 4.1 }),
          createdAt: startedAt,
          finishedAt: new Date(startedAt.getTime() + renderSec * 1000),
        },
      });
    }
  }

  // ── Activity feed ────────────────────────────────────────────
  const events = [
    { type: "ALERT", title: "Creative fatigue detected", detail: "Gupta Jewellers — Dhanteras ad CTR dropped 22% in 48h. 3 fresh hooks queued." },
    { type: "LEAD", title: "New WhatsApp lead", detail: "Rohit Verma asked about braces EMI at Sharma Dental." },
    { type: "REVIEW", title: "5-star review posted", detail: "Birhana Bridal House — review velocity +3 this week." },
    { type: "AD", title: "Variants published", detail: "Kakadeo Achievers — 5 hook variants live on Meta Advantage+." },
    { type: "RENDER", title: "4 ads rendered", detail: "Jajmau Leather — 1080p vertical, avg 1.9s per render." },
    { type: "ALERT", title: "Competitor radar", detail: "Smile Care Dental has run the same ad for 47 days. Counter-ad ready." },
    { type: "SYSTEM", title: "Weekly report sent", detail: "7 clients received Friday 6 PM WhatsApp reports automatically." },
    { type: "LEAD", title: "Lead marked WON", detail: "Panki Precision — PO confirmed after a 32-day vendor approval." },
    { type: "REVIEW", title: "Review QR scanned", detail: "Sharma Dental — counter standee scanned 11 times today." },
  ];
  for (let e = 0; e < events.length; e++) {
    await db.event.create({
      data: {
        type: events[e].type,
        title: events[e].title,
        detail: events[e].detail,
        clientId: clientRecords[e % clientRecords.length]?.id,
        createdAt: new Date(now - e * 3.4 * 3600000),
      },
    });
  }

  const counts = {
    clients: await db.client.count(),
    ads: await db.ad.count(),
    leads: await db.lead.count(),
    reviews: await db.review.count(),
    metrics: await db.metricDaily.count(),
  };
  console.log("✓ seeded", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
