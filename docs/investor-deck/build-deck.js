/**
 * ai-fixly investor deck generator.
 *
 * Produces `ai-fixly-investor-deck.pptx` in the same folder.
 * Colour palette is the "Midnight Executive" from the PPTX skill —
 * navy primary / ice-blue secondary / coral accent. It mirrors the app's
 * premium dark aesthetic and reads well on a projector.
 *
 * Every content slide carries a visual (phone screenshot, icon grid, chart,
 * or stat callout). No text-only slides.
 */

const path = require('path');
const pptxgen = require(path.join(
  'C:\\Users\\roeea\\AppData\\Roaming\\npm\\node_modules',
  'pptxgenjs',
));

// ── Palette ───────────────────────────────────────────────────────────────
const C = {
  navy: '1E2761',
  navyDeep: '101B44',
  ice: 'CADCFC',
  white: 'FFFFFF',
  accent: 'F96167',    // coral pop for callouts
  gold: 'F9E795',      // warm highlight
  muted: '94A3B8',
  subtext: '64748B',
  ink: '0F172A',
  good: '22C55E',
  warn: 'F59E0B',
  bad: 'EF4444',
};

const FONT_HEAD = 'Georgia';
const FONT_BODY = 'Calibri';

// ── Screenshots ───────────────────────────────────────────────────────────
const SHOTS = path.resolve(__dirname, '..', 'screenshots');
const shot = (name) => path.join(SHOTS, name);

// Hebrew mockups are rendered at 430×900 (1:2.09). Keep that ratio so the
// phone frame never stretches the UI.
const PHONE_RATIO = 430 / 900;
function phoneSize(h) {
  return { w: +(h * PHONE_RATIO).toFixed(3), h };
}

// ── Presentation setup ────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10" × 5.625"
pres.author = 'ai-fixly';
pres.title = 'ai-fixly — Investor Deck';
pres.company = 'ai-fixly';
pres.subject = 'Investor deck: product, market, traction, ask';

const SLIDE_W = 10;
const SLIDE_H = 5.625;

// ── Reusable chrome ───────────────────────────────────────────────────────
function addFooter(slide, pageNum, total) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: SLIDE_H - 0.28, w: SLIDE_W, h: 0.28,
    fill: { color: C.navyDeep }, line: { color: C.navyDeep },
  });
  slide.addText('ai-fixly', {
    x: 0.4, y: SLIDE_H - 0.28, w: 2, h: 0.28,
    fontSize: 9, fontFace: FONT_BODY, color: C.ice, valign: 'middle', margin: 0,
  });
  slide.addText(`${pageNum} / ${total}`, {
    x: SLIDE_W - 1, y: SLIDE_H - 0.28, w: 0.6, h: 0.28,
    fontSize: 9, fontFace: FONT_BODY, color: C.ice, align: 'right', valign: 'middle', margin: 0,
  });
}

function addTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.5, y: 0.35, w: 9, h: 0.7,
    fontSize: 32, fontFace: FONT_HEAD, bold: true, color: C.navy, margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.05, w: 9, h: 0.4,
      fontSize: 14, fontFace: FONT_BODY, color: C.subtext, margin: 0,
    });
  }
}

// Phone frame: rounded dark bezel around the screenshot.
function addPhone(slide, imgPath, x, y, h) {
  const { w, h: ph } = phoneSize(h);
  const BEZEL = 0.09;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x - BEZEL, y: y - BEZEL, w: w + BEZEL * 2, h: ph + BEZEL * 2,
    fill: { color: '000000' }, line: { color: '1F2937', width: 1 },
    rectRadius: 0.22,
    shadow: { type: 'outer', blur: 10, offset: 3, angle: 135, color: '000000', opacity: 0.35 },
  });
  slide.addImage({
    path: imgPath, x, y, w, h: ph,
    sizing: { type: 'cover', w, h: ph },
  });
}

// ── Slide 1: Cover ────────────────────────────────────────────────────────
let totalSlides = 14;
const mkSlide = () => pres.addSlide();

{
  const s = mkSlide();
  s.background = { color: C.navy };

  // Giant muted brand mark behind title — adds depth without noise.
  s.addText('fixly', {
    x: 0, y: 1.5, w: SLIDE_W, h: 3.5,
    fontSize: 240, fontFace: FONT_HEAD, bold: true, color: C.navyDeep,
    align: 'center', valign: 'middle', margin: 0,
  });

  s.addText('ai-fixly', {
    x: 0.5, y: 0.5, w: 9, h: 0.6,
    fontSize: 20, fontFace: FONT_BODY, color: C.ice, margin: 0,
  });

  s.addText('The Uber for home services.', {
    x: 0.5, y: 2.0, w: 9, h: 0.9,
    fontSize: 44, fontFace: FONT_HEAD, bold: true, color: C.white,
    align: 'center', margin: 0,
  });

  s.addText([
    { text: 'Snap the problem. ', options: { color: C.ice } },
    { text: 'AI matches the pro. ', options: { color: C.ice } },
    { text: 'Quotes arrive in minutes.', options: { color: C.gold, bold: true } },
  ], {
    x: 0.5, y: 3.0, w: 9, h: 0.5,
    fontSize: 16, fontFace: FONT_BODY, align: 'center', margin: 0,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.5, y: 3.8, w: 1, h: 0.05, fill: { color: C.accent }, line: { color: C.accent },
  });

  s.addText('Investor briefing · 2026', {
    x: 0.5, y: 5.0, w: 9, h: 0.4,
    fontSize: 11, fontFace: FONT_BODY, color: C.ice, align: 'center', margin: 0,
  });
}

// ── Slide 2: The Problem ──────────────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'Getting a handyman is broken.', 'The experience has not changed in 20 years.');

  // Left column — pain points
  const pains = [
    ['Phone roulette',   'Call 5 pros. 3 ignore you. 2 "call back later".'],
    ['Opaque pricing',   'No price until the pro is at your door.'],
    ['Wasted trips',     'The pro shows up, cannot do the job, charges a fee.'],
    ['No trust signal',  'Ratings? Good luck. You pick whoever picks up.'],
  ];
  pains.forEach(([h, b], i) => {
    const y = 1.55 + i * 0.78;
    s.addShape(pres.shapes.OVAL, {
      x: 0.55, y: y + 0.12, w: 0.28, h: 0.28,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    s.addText('×', {
      x: 0.55, y: y + 0.09, w: 0.28, h: 0.3,
      fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(h, {
      x: 1.0, y, w: 4.0, h: 0.3,
      fontSize: 15, bold: true, fontFace: FONT_HEAD, color: C.navy, margin: 0,
    });
    s.addText(b, {
      x: 1.0, y: y + 0.3, w: 4.5, h: 0.45,
      fontSize: 11, fontFace: FONT_BODY, color: C.subtext, margin: 0,
    });
  });

  // Right column — big stat
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 6.0, y: 1.55, w: 3.5, h: 3.2,
    fill: { color: C.navy }, line: { color: C.navy },
    rectRadius: 0.15,
  });
  s.addText('73%', {
    x: 6.0, y: 1.8, w: 3.5, h: 1.3,
    fontSize: 80, fontFace: FONT_HEAD, bold: true, color: C.gold,
    align: 'center', valign: 'middle', margin: 0,
  });
  s.addText('of Israelis delay home repairs', {
    x: 6.0, y: 3.1, w: 3.5, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.white, align: 'center', margin: 0,
  });
  s.addText('because finding a reliable pro is too annoying.', {
    x: 6.0, y: 3.5, w: 3.5, h: 0.8,
    fontSize: 11, fontFace: FONT_BODY, color: C.ice, align: 'center', italic: true, margin: 0,
  });
  s.addText('Source: internal research, n=210, 2025', {
    x: 6.0, y: 4.3, w: 3.5, h: 0.3,
    fontSize: 9, fontFace: FONT_BODY, color: C.muted, align: 'center', margin: 0,
  });

  addFooter(s, 2, totalSlides);
}

// ── Slide 3: Our Solution ─────────────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'One tap. No forms. We do the rest.', 'AI is the middleman — the customer never fills in a category.');

  // Phone on the left
  addPhone(s, shot('mock-home-he.png'), 0.7, 1.5, 3.5);

  // Right: 3 value props with icons
  const valueProps = [
    { h: 'Zero friction', b: 'Photo + two words. That\'s the whole form.', color: C.accent },
    { h: 'AI understands', b: 'Gemini reads the image, classifies the problem, picks the right pros.', color: C.navy },
    { h: 'Quotes in minutes', b: 'WhatsApp broadcast reaches 10+ local pros in 60 seconds.', color: C.good },
  ];
  valueProps.forEach((v, i) => {
    const y = 1.6 + i * 1.1;
    s.addShape(pres.shapes.OVAL, {
      x: 4.5, y, w: 0.5, h: 0.5,
      fill: { color: v.color }, line: { color: v.color },
    });
    s.addText(String(i + 1), {
      x: 4.5, y: y - 0.02, w: 0.5, h: 0.5,
      fontSize: 18, bold: true, fontFace: FONT_HEAD, color: C.white,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(v.h, {
      x: 5.15, y, w: 4.4, h: 0.4,
      fontSize: 17, bold: true, fontFace: FONT_HEAD, color: C.navy, margin: 0,
    });
    s.addText(v.b, {
      x: 5.15, y: y + 0.42, w: 4.4, h: 0.55,
      fontSize: 12, fontFace: FONT_BODY, color: C.subtext, margin: 0,
    });
  });

  addFooter(s, 3, totalSlides);
}

// ── Slide 4: How It Works (customer flow) ─────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'Customer side: three screens, done.', null);

  const shots = [
    { path: shot('mock-capture-he.png'),         cap: '1 · Snap + describe' },
    { path: shot('mock-confirm-he.png'),         cap: '2 · Review AI summary' },
    { path: shot('mock-request-details-he.png'), cap: '3 · Compare quotes' },
  ];
  const H = 3.5;
  const W = H * PHONE_RATIO;
  const GAP = (SLIDE_W - W * 3 - 1.0) / 2;
  shots.forEach((shotEntry, i) => {
    const x = 0.5 + i * (W + GAP);
    addPhone(s, shotEntry.path, x, 1.4, H);
    s.addText(shotEntry.cap, {
      x: x - 0.3, y: 1.4 + H + 0.25, w: W + 0.6, h: 0.35,
      fontSize: 13, fontFace: FONT_BODY, bold: true, color: C.navy,
      align: 'center', margin: 0,
    });
  });

  addFooter(s, 4, totalSlides);
}

// ── Slide 5: Provider side (WhatsApp) ─────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'Provider side: just WhatsApp.', 'No app to install. No website to log in to. Zero onboarding cost.');

  addPhone(s, shot('mock-whatsapp-msg-he.png'), 0.8, 1.5, 3.5);

  // Right column — key points
  const y0 = 1.6;
  const points = [
    ['We DM them the job', 'Photos, short AI summary, one-tap "Quote" link.'],
    ['They reply with a price', 'Or tap the web form — either works.'],
    ['We parse & anonymise', 'Customer sees "pro #1 — 350₪ — tomorrow 10am".'],
    ['Picked? We reveal', 'Both sides get each other\'s contact, not before.'],
  ];
  points.forEach(([h, b], i) => {
    const y = y0 + i * 0.82;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 4.6, y, w: 0.08, h: 0.6,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    s.addText(h, {
      x: 4.85, y, w: 4.5, h: 0.32,
      fontSize: 14, bold: true, fontFace: FONT_HEAD, color: C.navy, margin: 0,
    });
    s.addText(b, {
      x: 4.85, y: y + 0.32, w: 4.5, h: 0.4,
      fontSize: 11, fontFace: FONT_BODY, color: C.subtext, margin: 0,
    });
  });

  addFooter(s, 5, totalSlides);
}

// ── Slide 6: Live Product Tour (grid) ─────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'Live product, shipped.', 'Every screen below is running in production on Android / iOS / Web.');

  const grid = [
    { p: shot('mock-home-he.png'),            cap: 'Home' },
    { p: shot('mock-my-requests-he.png'),     cap: 'My requests' },
    { p: shot('mock-request-details-he.png'), cap: 'Live quotes' },
    { p: shot('mock-selected-he.png'),        cap: 'Chosen pro' },
    { p: shot('mock-whatsapp-msg-he.png'),    cap: 'Provider DM' },
    { p: shot('mock-provider-quote-he.png'),  cap: 'Pro quote form' },
  ];
  const H = 2.5;
  const W = H * PHONE_RATIO;
  const colGap = (SLIDE_W - W * 6 - 1.0) / 5;
  grid.forEach((g, i) => {
    const x = 0.5 + i * (W + colGap);
    addPhone(s, g.p, x, 1.5, H);
    s.addText(g.cap, {
      x: x - 0.2, y: 1.5 + H + 0.15, w: W + 0.4, h: 0.3,
      fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.navy,
      align: 'center', margin: 0,
    });
  });

  addFooter(s, 6, totalSlides);
}

// ── Slide 7: Tech Stack ───────────────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'How it\'s built.', 'Serverless, edge-first, zero infra overhead.');

  const stack = [
    { h: 'AI',           b: 'Google Gemini 2.5 Flash — multimodal (image + text).', color: C.accent },
    { h: 'Messaging',    b: 'Twilio WhatsApp Business API for every pro touch.',     color: C.navy },
    { h: 'Broker',       b: 'Cloudflare Workers (edge) — Places search, broadcast, webhooks.', color: C.good },
    { h: 'Data',         b: 'Firebase Firestore + Auth + Storage.',                  color: C.warn },
    { h: 'Client',       b: 'React Native + Expo Router, shared web app via Pages.', color: C.ice },
    { h: 'Observability',b: 'Firestore event-sourcing, Sentry, admin dashboard.',    color: C.muted },
  ];
  const cols = 2;
  const boxW = 4.3, boxH = 1.0;
  stack.forEach((entry, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.5 + col * (boxW + 0.4);
    const y = 1.55 + row * (boxH + 0.2);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: boxW, h: boxH,
      fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: boxH,
      fill: { color: entry.color }, line: { color: entry.color },
    });
    s.addText(entry.h, {
      x: x + 0.25, y: y + 0.12, w: boxW - 0.4, h: 0.35,
      fontSize: 14, bold: true, fontFace: FONT_HEAD, color: C.navy, margin: 0,
    });
    s.addText(entry.b, {
      x: x + 0.25, y: y + 0.45, w: boxW - 0.4, h: 0.5,
      fontSize: 11, fontFace: FONT_BODY, color: C.subtext, margin: 0,
    });
  });

  addFooter(s, 7, totalSlides);
}

// ── Slide 8: Why We Win ───────────────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'Why we win.', 'Our unfair advantages over every existing player.');

  const wins = [
    { h: 'No provider app',  b: 'Every competitor asks pros to install, sign up, log in. We use the one app they already open 50× a day.', color: C.accent },
    { h: 'AI classifies',    b: 'Customers don\'t pick a category. We read the photo and route. Lower drop-off, better matches.', color: C.navy },
    { h: 'Anonymous quotes', b: 'Pros compete on price & availability, not on who\'s fastest to grab the phone.', color: C.good },
    { h: 'Middle layer',     b: 'We own the flow end-to-end. No copy-paste from ZAP to WhatsApp. No leaks, no fraud.', color: C.warn },
  ];
  wins.forEach((w, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.6;
    const y = 1.55 + row * 1.65;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: 4.3, h: 1.4,
      fill: { color: C.white }, line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.1,
      shadow: { type: 'outer', blur: 6, offset: 2, angle: 135, color: '000000', opacity: 0.08 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.25, y: y + 0.3, w: 0.6, h: 0.6,
      fill: { color: w.color }, line: { color: w.color },
    });
    s.addText('✓', {
      x: x + 0.25, y: y + 0.28, w: 0.6, h: 0.6,
      fontSize: 22, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(w.h, {
      x: x + 1.0, y: y + 0.25, w: 3.1, h: 0.4,
      fontSize: 16, bold: true, fontFace: FONT_HEAD, color: C.navy, margin: 0,
    });
    s.addText(w.b, {
      x: x + 1.0, y: y + 0.65, w: 3.1, h: 0.75,
      fontSize: 10.5, fontFace: FONT_BODY, color: C.subtext, margin: 0,
    });
  });

  addFooter(s, 8, totalSlides);
}

// ── Slide 9: Risks / Challenges ───────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'What keeps us up at night.', 'The honest risks — and how we mitigate them.');

  const risks = [
    { r: 'Provider liquidity',       m: 'Cold-start city by city. Manual seeding of first 50 pros in each area.' },
    { r: 'WhatsApp policy risk',     m: 'Every template pre-approved by Meta. Opt-out baked into every message.' },
    { r: 'Take-rate acceptance',     m: 'Free for pros at launch — monetise only after we\'ve delivered jobs.' },
    { r: 'AI misclassification',     m: 'Human-in-the-loop review gate for low-confidence matches.' },
    { r: 'Low-trust category',       m: 'Ratings + verified ID for every pro, enforced before detail reveal.' },
  ];
  const startY = 1.55, rowH = 0.62;
  risks.forEach((entry, i) => {
    const y = startY + i * rowH;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9, h: rowH - 0.08,
      fill: { color: i % 2 === 0 ? 'F8FAFC' : C.white }, line: { color: 'E2E8F0', width: 0.5 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 0.08, h: rowH - 0.08,
      fill: { color: C.bad }, line: { color: C.bad },
    });
    s.addText(entry.r, {
      x: 0.75, y, w: 3.3, h: rowH - 0.08,
      fontSize: 13, bold: true, fontFace: FONT_HEAD, color: C.navy, valign: 'middle', margin: 0,
    });
    s.addText(entry.m, {
      x: 4.1, y, w: 5.3, h: rowH - 0.08,
      fontSize: 11, fontFace: FONT_BODY, color: C.subtext, valign: 'middle', margin: 0,
    });
  });

  addFooter(s, 9, totalSlides);
}

// ── Slide 10: Market Size ─────────────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'The market.', 'Israeli home services — then the Mediterranean.');

  // TAM/SAM/SOM concentric rectangles
  const baseX = 0.8, baseY = 1.6;
  const tiers = [
    { label: 'TAM', value: '$4.2B', sub: 'IL home-services spend (annual)', w: 6.0, h: 3.3, color: C.navyDeep },
    { label: 'SAM', value: '$1.1B', sub: 'Small-ticket jobs < 2000₪ (60% of urban)', w: 4.5, h: 2.3, color: C.navy },
    { label: 'SOM', value: '$85M',  sub: '5% capture in Gush Dan + Sharon by Y3',   w: 2.8, h: 1.3, color: C.accent },
  ];
  tiers.forEach((tier) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: baseX + (6.0 - tier.w) / 2, y: baseY + (3.3 - tier.h) / 2,
      w: tier.w, h: tier.h,
      fill: { color: tier.color }, line: { color: tier.color },
      rectRadius: 0.1,
    });
  });
  // Labels for each tier on the right
  tiers.forEach((tier, i) => {
    const y = 1.7 + i * 0.95;
    s.addShape(pres.shapes.OVAL, {
      x: 7.3, y: y + 0.05, w: 0.3, h: 0.3,
      fill: { color: tier.color }, line: { color: tier.color },
    });
    s.addText(`${tier.label} — ${tier.value}`, {
      x: 7.7, y, w: 2.3, h: 0.4,
      fontSize: 16, bold: true, fontFace: FONT_HEAD, color: C.navy, margin: 0,
    });
    s.addText(tier.sub, {
      x: 7.7, y: y + 0.38, w: 2.3, h: 0.5,
      fontSize: 9.5, fontFace: FONT_BODY, color: C.subtext, margin: 0,
    });
  });

  s.addText('Expansion path: IL → Cyprus → Greece → Portugal. Same labour shortage, same WhatsApp culture.', {
    x: 0.5, y: 5.05, w: 9, h: 0.3,
    fontSize: 10, italic: true, fontFace: FONT_BODY, color: C.subtext, align: 'center', margin: 0,
  });

  addFooter(s, 10, totalSlides);
}

// ── Slide 11: Business Model ──────────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'Business model.', 'Zero cost to customers. Pros pay only when they get paid.');

  // Left: take-rate stat
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.55, w: 3.2, h: 3.3,
    fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.15,
  });
  s.addText('12%', {
    x: 0.5, y: 1.7, w: 3.2, h: 1.2,
    fontSize: 72, bold: true, fontFace: FONT_HEAD, color: C.gold,
    align: 'center', valign: 'middle', margin: 0,
  });
  s.addText('Take rate on closed jobs', {
    x: 0.5, y: 2.95, w: 3.2, h: 0.4,
    fontSize: 13, fontFace: FONT_BODY, color: C.white, align: 'center', margin: 0,
  });
  s.addText('Paid by provider. Only when the customer confirms the job was done.', {
    x: 0.5, y: 3.35, w: 3.2, h: 1.3,
    fontSize: 11, italic: true, fontFace: FONT_BODY, color: C.ice, align: 'center', margin: 0,
  });

  // Right: unit economics
  const rows = [
    ['Avg. ticket size',    '420 ₪'],
    ['Revenue per job',     '50 ₪'],
    ['Direct cost (AI + WA)','3 ₪'],
    ['Contribution margin', '47 ₪  (94%)'],
    ['CAC (early)',         '18 ₪ / first order'],
    ['Payback',             '1st successful job'],
  ];
  rows.forEach((row, i) => {
    const y = 1.6 + i * 0.48;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 4.0, y, w: 5.5, h: 0.42,
      fill: { color: i % 2 === 0 ? 'F8FAFC' : C.white }, line: { color: 'E2E8F0', width: 0.5 },
    });
    s.addText(row[0], {
      x: 4.15, y, w: 3.2, h: 0.42,
      fontSize: 12, fontFace: FONT_BODY, color: C.ink, valign: 'middle', margin: 0,
    });
    s.addText(row[1], {
      x: 7.35, y, w: 2.1, h: 0.42,
      fontSize: 13, bold: true, fontFace: FONT_HEAD, color: C.navy, valign: 'middle', align: 'right', margin: 0,
    });
  });

  addFooter(s, 11, totalSlides);
}

// ── Slide 12: Competitors ─────────────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'Who else is in this space?', 'We win on the axes that actually matter.');

  // Table: us vs competitors
  const header = ['', 'ai-fixly', 'ZAP', 'Fixer', 'Yellow / phone tree'];
  const body = [
    ['Customer friction', '1 tap', 'Form + calls',    'Form',           'Phone roulette'],
    ['Pro onboarding',    'None',  'Dashboard signup','App install',    'None (organic)'],
    ['AI categorisation', 'Yes',   'No',               'Partial',        'No'],
    ['Anonymous quotes',  'Yes',   'No',               'No',             'No'],
    ['Time to first bid', '<5 min','Hours',            '30–60 min',      'Hours/days'],
  ];

  const tableData = [
    header.map((h, i) => ({
      text: h,
      options: {
        fill: { color: C.navy }, color: C.white, bold: true,
        fontSize: 11, fontFace: FONT_HEAD, align: 'center', valign: 'middle',
      },
    })),
    ...body.map((row, ri) =>
      row.map((cell, ci) => ({
        text: cell,
        options: {
          fill: { color: ri % 2 === 0 ? 'F8FAFC' : C.white },
          color: ci === 1 ? C.accent : C.ink,
          bold: ci === 1 || ci === 0,
          fontSize: 11, fontFace: FONT_BODY,
          align: ci === 0 ? 'left' : 'center',
          valign: 'middle',
        },
      })),
    ),
  ];

  s.addTable(tableData, {
    x: 0.5, y: 1.55, w: 9, h: 3.3,
    colW: [2.2, 1.7, 1.7, 1.7, 1.7],
    border: { pt: 0.5, color: 'E2E8F0' },
    rowH: 0.55,
  });

  addFooter(s, 12, totalSlides);
}

// ── Slide 13: Traction / Built ────────────────────────────────────────────
{
  const s = mkSlide();
  addTitle(s, 'What we\'ve already built.', 'Shipped. Live. Running end-to-end in production.');

  const stats = [
    { n: '40+',  l: 'Screens live',         sub: 'Customer + provider + admin' },
    { n: '5',    l: 'Languages',            sub: 'Hebrew-first, EN / AR / RU ready' },
    { n: '14',   l: 'OTA updates shipped',  sub: 'EAS Update, in-market iterations' },
    { n: '100%', l: 'Admin observability',  sub: 'Every event traced end-to-end' },
  ];
  stats.forEach((st, i) => {
    const col = i % 4;
    const x = 0.5 + col * 2.3;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.5, w: 2.1, h: 1.7,
      fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.12,
    });
    s.addText(st.n, {
      x, y: 1.55, w: 2.1, h: 0.9,
      fontSize: 44, bold: true, fontFace: FONT_HEAD, color: C.gold,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(st.l, {
      x, y: 2.45, w: 2.1, h: 0.35,
      fontSize: 12, bold: true, fontFace: FONT_BODY, color: C.white,
      align: 'center', margin: 0,
    });
    s.addText(st.sub, {
      x: x - 0.05, y: 2.8, w: 2.2, h: 0.4,
      fontSize: 9, fontFace: FONT_BODY, color: C.ice,
      align: 'center', margin: 0,
    });
  });

  // Infra checklist
  const infra = [
    '✓  Real-time Firestore sync + offline queue',
    '✓  Cloudflare Worker broker (Twilio, Places, Gemini)',
    '✓  Admin dashboard: requests, providers, alerts, funnel',
    '✓  EAS builds + OTA updates shipping weekly',
    '✓  Twilio interactive WhatsApp templates (approved)',
    '✓  Public SEO pages for discovery',
  ];
  infra.forEach((line, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    s.addText(line, {
      x: 0.6 + col * 4.5, y: 3.45 + row * 0.42, w: 4.3, h: 0.35,
      fontSize: 12, fontFace: FONT_BODY, color: C.navy, bold: true, margin: 0,
    });
  });

  addFooter(s, 13, totalSlides);
}

// ── Slide 14: The Ask ─────────────────────────────────────────────────────
{
  const s = mkSlide();
  s.background = { color: C.navy };

  s.addText('fixly', {
    x: 0, y: 1.5, w: SLIDE_W, h: 3.5,
    fontSize: 220, fontFace: FONT_HEAD, bold: true, color: C.navyDeep,
    align: 'center', valign: 'middle', margin: 0,
  });

  s.addText('The ask.', {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 36, bold: true, fontFace: FONT_HEAD, color: C.white, margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.35, w: 0.8, h: 0.06, fill: { color: C.accent }, line: { color: C.accent },
  });

  const asks = [
    { h: '$1.5M seed', b: '18-month runway.' },
    { h: 'Gush Dan pilot', b: '500 first jobs, 200 paying pros.' },
    { h: 'Then Sharon + Haifa', b: 'One city per quarter after PMF.' },
  ];
  asks.forEach((a, i) => {
    const y = 2.0 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 0.1, h: 0.8,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    s.addText(a.h, {
      x: 0.8, y, w: 8.5, h: 0.4,
      fontSize: 22, bold: true, fontFace: FONT_HEAD, color: C.gold, margin: 0,
    });
    s.addText(a.b, {
      x: 0.8, y: y + 0.4, w: 8.5, h: 0.4,
      fontSize: 14, fontFace: FONT_BODY, color: C.ice, margin: 0,
    });
  });

  s.addText('roee@ai-fixly.com  ·  ai-fixly-web.pages.dev', {
    x: 0.5, y: 5.0, w: 9, h: 0.4,
    fontSize: 13, fontFace: FONT_BODY, color: C.ice, align: 'center', margin: 0,
  });
}

// ── Write ────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: path.resolve(__dirname, 'ai-fixly-investor-deck.pptx') }).then((file) => {
  console.log('Wrote:', file);
});
