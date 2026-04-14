# Admin Dashboards + Alerts + Provider Signup — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a separate admin web dashboard at `/admin` showing customer funnel, provider performance, and WhatsApp engagement metrics with 7d/30d toggle. Add proactive manager alerts for stale requests and unresponsive providers. Add a public provider signup form at `/join`.

**Architecture:** All dashboards are read-only pages on the existing Expo web build (Cloudflare Pages). Alert system runs as a worker cron job. Provider signup is a public web form writing to Firestore.

**Tech Stack:** Expo Router web routes, Firestore queries, Cloudflare Worker cron, Twilio (critical alerts).

---

## 1. Admin Dashboard — 3 Tabs

### Route structure
```
/admin              → redirect to /admin/funnel
/admin/funnel       → Customer funnel
/admin/providers    → Provider performance
/admin/engagement   → WhatsApp engagement
```

### Access control
Simple UID check: only the app owner's UID can view. Redirect to home for everyone else.

```typescript
const ADMIN_UID = 'the-owner-uid'; // hardcoded for MVP
if (user?.uid !== ADMIN_UID) router.replace('/');
```

### Global UI elements
- **7d / 30d toggle** at top (filters all data)
- **Refresh button**
- **Alert badge** showing count of active alerts
- **Tab bar** for switching between funnel/providers/engagement

### Tab 1: Customer Funnel

| Metric | Source |
|---|---|
| App opened | `session_logs` where action='capture_started' (closest proxy) |
| Started capture | `session_logs` action='capture_started' |
| Added photo/video | `session_logs` action='photo_added' OR 'video_recorded' |
| Submitted to AI | `session_logs` action='capture_submitted' |
| Confirmed & sent | `session_logs` action='request_confirmed' |
| Received ≥1 bid | `serviceRequests` with ≥1 bid in `bids` collection |
| Selected provider | `serviceRequests` where status='in_progress' |
| Opened chat | `session_logs` action='chat_opened' |
| Closed request | `serviceRequests` where status='closed' |
| Submitted review | `reviews` count |

Extra metrics:
- **Avg time to first bid** = avg(`first_bid.createdAt - request.createdAt`)
- **Avg bids per request** = `count(bids) / count(requests)` for period
- **Requests with 0 bids** = requests in 'open' status with no matching bids

Table format: Step | Users | Drop-off | Conversion %

### Tab 2: Provider Performance

Table columns: Provider Name | Offers Sent | Accepted | Completed | Customer-Confirmed | Rating | Avg Price

Extra metrics:
- **Avg price per completed job** = avg(`reviews.pricePaid`) where not null
- **Top 5 providers** by acceptance rate
- **Bottom 5 providers** by acceptance rate (candidates for removal)

Individual provider rows link to detail: all their bids, reviews, response times.

### Tab 3: WhatsApp Engagement

| Metric | Source |
|---|---|
| WhatsApp messages sent | `broadcastedProviders` arrays on requests |
| Provider replied (bid created) | `bids` where source='whatsapp' |
| Reply within 1 hour | `bids.createdAt - request.broadcastedAt < 1h` |
| Reply within 4 hours | same, < 4h |
| Positive reply rate | `bids / messages_sent` |
| Avg response time | avg(`bid.createdAt - request.createdAt`) |

---

## 2. Manager Alert System

### Alert conditions (checked by cron every 15 minutes)

| Condition | Severity | Message |
|---|---|---|
| Request open >4h with 0 bids | 🔴 Critical | "{customer} לא קיבל אף הצעה כבר {hours} שעות" |
| Provider got 3+ offers this week, replied to 0 | 🟡 Warning | "{provider} קיבל {count} הצעות ולא ענה לאף אחת" |
| 3+ open requests with 0 bids simultaneously | 🟡 Warning | "{count} בקשות פתוחות בלי הצעות" |
| Review ≤ 2 stars | 🔵 Info | "ביקורת שלילית: {rating} כוכבים על {provider}" |
| New provider signup | 🔵 Info | "בעל מקצוע חדש נרשם: {name} ({profession})" |
| New feedback (critical severity) | 🔴 Critical | Already handled by existing /feedback/critical endpoint |

### Alert storage
```typescript
// Firestore: admin_alerts/{id}
{
  type: 'no_bids' | 'unresponsive_provider' | 'stale_requests' | 'bad_review' | 'new_provider_signup',
  severity: 'critical' | 'warning' | 'info',
  message: string,
  metadata: { requestId?, providerPhone?, userId? },
  read: boolean,
  createdAt: Timestamp,
}
```

### Alert delivery
- **All alerts** → Firestore `admin_alerts` (visible in dashboard)
- **Critical + Warning** → WhatsApp to owner phone
- Dashboard shows unread alert count as badge

### Worker cron
Extend the existing `*/5 * * * *` cron with an alert check function.

---

## 3. Provider Signup Form

### Route: `/join`

Public page (no auth required). Clean form with:
- Business name (required)
- Phone / WhatsApp number (required)
- Profession dropdown — all 29 from the matrix (required)
- Service area dropdown — predefined areas (required)
- Years of experience (optional)
- Submit button

### Firestore: `provider_signups/{id}`
```typescript
{
  name: string,
  phone: string,
  profession: ProfessionKey,
  area: string,
  experience: string,
  status: 'pending' | 'approved' | 'rejected',
  createdAt: Timestamp,
}
```

### On submit
1. Save to Firestore
2. Create an `admin_alert` with type='new_provider_signup'
3. Send WhatsApp to owner: "בעל מקצוע חדש נרשם: {name} ({profession})"
4. Show confirmation: "תודה! נחזור אליך תוך 24 שעות"

### Admin dashboard integration
New section in the admin dashboard: "בעלי מקצוע שנרשמו" with approve/reject buttons (future).

---

## 4. Files to Create

| File | Purpose |
|---|---|
| `app/admin/_layout.tsx` | Admin layout with tab navigation |
| `app/admin/index.tsx` | Redirect to funnel |
| `app/admin/funnel.tsx` | Customer funnel dashboard |
| `app/admin/providers.tsx` | Provider performance dashboard |
| `app/admin/engagement.tsx` | WhatsApp engagement dashboard |
| `app/admin/alerts.tsx` | Alert feed with read/unread |
| `app/join.tsx` | Public provider signup form |
| `src/services/admin/dashboardService.ts` | Firestore queries for dashboard data |
| `src/services/admin/types.ts` | Dashboard data types |
| `workers/broker/src/alertChecker.ts` | Cron alert condition logic |

## 5. Files to Modify

| File | Change |
|---|---|
| `app/_layout.tsx` | Add admin + join routes to Stack |
| `workers/broker/src/index.ts` | Add alert checking to cron handler, add /provider/signup endpoint |
| `firebase/firestore.rules` | Add admin_alerts + provider_signups rules |

## 6. Firestore Rules

```
match /admin_alerts/{alertId} {
  allow read: if request.auth != null;    // admin reads
  allow create: if false;                  // only worker writes (service account)
  allow update: if request.auth != null;   // mark as read
}

match /provider_signups/{signupId} {
  allow create: if true;                   // public form, no auth needed
  allow read: if request.auth != null;     // admin reads
}
```
