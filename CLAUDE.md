# ai-fixly

> The Uber of home services. AI-powered platform connecting problems to solutions with minimum effort.

## Product Overview

Users report issues via photo/text. AI analyzes & categorizes. System finds relevant local professionals via Google Places API. Sends them WhatsApp with photos + description. Providers reply via WhatsApp (price + ETA). Customer sees responses in app, picks one. Details revealed only after selection.

### Target Audiences

| Audience | Channel | Notes |
|----------|---------|-------|
| **Customer** | React Native app (Expo) | Zero-form experience. Push notifications. |
| **Provider** | WhatsApp only | No app, no website. Gets WhatsApp with job details, replies with price + ETA. |

### Core Principle: We Are The Middleman

- Customer never sees provider details until they choose one
- Provider never sees customer details until chosen
- All communication flows through us (WhatsApp API inbound/outbound)
- We control the narrative, status, and matching

### Service Request Lifecycle

```
DRAFT -> OPEN -> IN_PROGRESS -> CLOSED
               |      ^
               v      |
              PAUSED---
```

- **DRAFT**: User capturing media, AI processing
- **OPEN**: WhatsApp sent to providers (20-40km radius), collecting responses
- **IN_PROGRESS**: Customer chose a provider, details revealed to both sides
- **PAUSED**: Stop accepting new responses
- **CLOSED**: Job completed or cancelled

### Screens (Customer App)

1. **Hub** (Home) - Large prominent capture button center-screen. This is the heart of the app.
2. **My Requests** - List of active/past requests with status badges and response counts.
3. **Capture** - Camera/gallery for photos + text description.
4. **AI Confirmation** - Clean summary of what AI understood. Edit or Send.
5. **Responses Wall** - Cards per request: business name, price, availability (days/hours). No phone/address yet.
6. **Job Details** - Status timeline. Controls: pause, cancel, close.
7. **Profile** - Editable: name, phone, address. Sign out.

### Tab Bar Design
- Left tab: "הקריאות שלי" (My Requests)
- Center: Prominent raised capture button (like Uber/GetTaxi FAB style)
- Right tab: "פרופיל" (Profile)

### Provider Flow (WhatsApp Only — "The Secretary")

The system acts as an AI secretary between customer and providers:

1. Provider receives WhatsApp: photos + AI pro-facing summary
2. Secretary asks: "מעוניין? מה המחיר המשוער? מתי תוכל להגיע? (ימים ושעות)"
3. Provider replies freely: "350 שקל, יום ראשון אחהצ"
4. AI parses response → extracts: { price, availability: { days, hours }, rawText }
5. Parsed response appears in customer app as a bid card
6. If customer picks them → Provider gets WhatsApp with customer name + address + phone
7. Customer can change status: pause (stop new bids), cancel, close (job done)

### Provider Discovery

- **Phase 1 (MVP)**: Manual provider database in Firestore. Providers onboarded via WhatsApp link or admin.
- **Phase 2**: Google Places API for automatic discovery (requires billing).
- **Search radius**: Configurable per request (default 20-40km, stored in constants)

### Finding Providers

- **Google Places API**: Search by category + radius (20-40km from customer)
- Extract: business name, phone, rating, address
- Filter: must have WhatsApp-compatible phone number
- Cache results in Firestore for future requests in same area

---

## Tech Stack

### Core
- **Framework**: Expo SDK (latest) + Expo Router (file-based routing)
- **Language**: TypeScript (strict mode, no `any`)
- **State**: Zustand (client) + TanStack Query (server state)
- **Forms**: React Hook Form + Zod validation
- **Styling**: NativeWind (Tailwind CSS for RN)
- **Animations**: React Native Reanimated + Lottie

### Backend (Firebase)
- **Database**: Cloud Firestore (offline-first enabled)
- **Auth**: Firebase Auth (Phone, Google, Apple)
- **Storage**: Supabase Storage (media uploads — free 1GB, no credit card)
- **Functions**: Cloudflare Workers (WhatsApp webhook, Google Places, server-side logic) — NOT Firebase Cloud Functions (requires Blaze plan)
- **Analytics**: Firebase Analytics
- **Crashlytics**: Firebase Crashlytics
- **Remote Config**: Feature flags, dynamic values
- **Performance**: Firebase Performance Monitoring
- **Messaging**: FCM for push notifications

### AI Pipeline
- **Multimodal Analysis**: Gemini API (image + text -> category + summary + urgency)
- **Speech-to-Text**: Whisper or Google Speech API (for voice notes)
- **Categorization**: AI-determined service categories (plumbing, electrical, HVAC, IT, etc.)
- **Phase 1**: Image + text only. Video analysis deferred to later phase.

### Provider Discovery
- **Google Places API**: Find businesses by category + location radius
- **Caching**: Store discovered providers in Firestore for reuse

### Provider Communication (WhatsApp Only)
- **WhatsApp Business API**: Send job details with photos, receive provider responses
- **AI Response Parsing**: Parse WhatsApp replies to extract price + ETA
- **No app/website for providers** — everything happens in WhatsApp

### Monitoring & Security
- **Error Tracking**: Sentry (free tier)
- **Logging**: Structured logger -> Sentry breadcrumbs
- **Security Rules**: Firestore & Storage rules - locked down from day 1
- **Input Validation**: Zod schemas on client AND Cloud Functions
- **Rate Limiting**: Cloud Functions rate limiting on all endpoints
- **Media Validation**: File type/size validation before upload

### Build & Deploy
- **Builds**: EAS Build
- **OTA Updates**: EAS Update
- **CI/CD**: GitHub Actions
- **Testing**: Jest + RNTL (unit/integration), Maestro (E2E)

---

## Architecture Rules

### File Size & Organization
- **Max ~150 lines per file.** If larger, split.
- **ALL magic numbers, colors, spacing, sizes, durations -> constants/ files.**
- **ALL text strings -> centralizable** (prep for i18n).
- Components = pure UI. No business logic inside.
- One file = one export = one concern.

### SOLID in Practice
- **S** (Single Responsibility): One file = one concern. Component renders. Hook manages state. Service calls APIs.
- **O** (Open/Closed): New service categories = new config entry, not new code paths.
- **L** (Liskov): All request types share ServiceRequest interface.
- **I** (Interface Segregation): Small focused interfaces: Biddable, Trackable, Notifiable.
- **D** (Dependency Inversion): Services depend on interfaces. AI provider swappable. Notification channel swappable.

### Project Structure
```
ai-fixly/
  app/                          # Expo Router screens
    (tabs)/                     # Tab navigator
      index.tsx                 # Hub (Home)
      history.tsx               # History
      profile.tsx               # Profile/Settings
    (auth)/                     # Auth flow
    capture/                    # Live Capture flow
    request/                    # AI confirm, Bidding, Job Details
    chat/                       # Chat screen
    _layout.tsx                 # Root layout
  src/
    components/                 # Reusable UI (small, pure)
      ui/                       # Primitives (Button, Card, Input, Badge)
      request/                  # Request-specific (BidCard, StatusTimeline)
      capture/                  # Capture-specific (Waveform, CaptureButton)
      layout/                   # Layout wrappers (ScreenContainer, Header)
    hooks/                      # Custom hooks
    services/                   # API/Firebase abstraction layer
      ai/                       # AI analysis (interface + implementations)
      auth/                     # Auth service
      requests/                 # Service requests CRUD
      bids/                     # Bidding service
      chat/                     # Chat service
      media/                    # Upload & processing
      notifications/            # Push + WhatsApp
    stores/                     # Zustand stores (small, focused)
    types/                      # TypeScript interfaces & enums
    constants/                  # ALL magic values live here
      theme.ts                  # Colors, fonts, spacing, radii
      layout.ts                 # Dimensions, breakpoints
      animation.ts              # Durations, easings
      limits.ts                 # Max file size, bid timeout, radius km
      categories.ts             # Service categories config (dynamic)
      status.ts                 # Request/bid status enums & labels
    utils/                      # Pure helper functions
    validators/                 # Zod schemas (shared client/server)
    config/                     # Firebase config, env vars
  functions/                    # Firebase Cloud Functions
    src/
      ai/                       # AI pipeline
      bids/                     # Bid management
      notifications/            # WhatsApp/Push dispatch
      middleware/               # Auth, rate limiting, validation
    package.json
  # No provider web app — everything via WhatsApp
  firebase/
    firestore.rules             # Security rules (strict)
    storage.rules               # Media access rules
  __tests__/                    # E2E tests (Maestro)
```

### Constants Pattern (MANDATORY)
```typescript
// constants/limits.ts - ALL numbers here
export const LIMITS = {
  MAX_VIDEO_DURATION_SEC: 60,
  MAX_IMAGE_SIZE_MB: 10,
  MAX_IMAGES_PER_REQUEST: 5,
  BID_WINDOW_MINUTES: 30,
  SEARCH_RADIUS_KM: 15,
  MAX_ACTIVE_REQUESTS: 3,
  MIN_BID_PRICE: 50,
} as const;

// constants/theme.ts - ALL visual values here
export const COLORS = {
  primary: '#6366F1',
  background: '#0F0F1A',
  surface: 'rgba(255, 255, 255, 0.06)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const RADII = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 } as const;
export const FONT_SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 } as const;

// constants/animation.ts - ALL timing here
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EASING: 'easeInOut',
} as const;
```

### Naming Conventions
- Components: PascalCase.tsx (BidCard.tsx)
- Hooks: useCamelCase.ts (useServiceRequest.ts)
- Services: camelCase.ts (aiAnalysis.ts)
- Constants: camelCase.ts files, UPPER_SNAKE exports
- Types: PascalCase no prefix/suffix (ServiceRequest, Bid, Provider)
- Stores: useCamelCaseStore.ts (useRequestStore.ts)
- Tests: Name.test.tsx co-located next to source

### Service Abstraction (Dependency Inversion)
```typescript
// services/ai/types.ts - the interface
export interface AIAnalysisService {
  analyzeMedia(media: MediaInput): Promise<AnalysisResult>;
}

// services/ai/geminiAnalysis.ts - swappable implementation
export class GeminiAnalysisService implements AIAnalysisService { ... }
```

---

## Testing Strategy

### Test Pyramid
- **Unit (70%)**: Pure functions, utils, validators, stores, hooks
- **Integration (20%)**: Service + store interactions, screen flows with mocked services
- **E2E (10%)**: Critical paths with Maestro (create request -> receive bid -> select)

### What MUST Be Tested
- Every Zod schema
- Every state transition in request lifecycle
- Every service method (mocked Firebase)
- Bid calculation & sorting logic
- AI result parsing & error handling
- Auth flows (sign in, sign out, token refresh)
- Deep link routing
- Offline behavior (queue actions, sync on reconnect)

### Test Co-location
```
src/services/bids/
  bidService.ts
  bidService.test.ts      # Right next to source
```

### Test on Every Change
- Pre-commit: lint + type-check
- PR: lint + type-check + unit tests + integration tests
- Release: full E2E suite

---

## Security Checklist

### Firebase Rules (Non-negotiable)
- NO open reads/writes. Every collection has explicit rules.
- Users read/write only their own data.
- Providers read only requests matching their category + radius.
- Bids are write-once (no editing after submit).
- Media access requires auth token.

### Input Validation (Double Layer)
- Zod on every user input (client-side for UX)
- Zod on every Cloud Function input (server-side for security) - NEVER trust client
- File type whitelist: video/mp4, image/jpeg, image/png, audio/m4a
- File size limits enforced in Storage rules AND client-side

### Auth & Access
- Phone/Google/Apple sign-in only (no email/password)
- JWT verification on ALL Cloud Functions
- Provider identity verified before accessing request data
- Rate limiting on bid submission (max 1 per request per provider)
- Rate limiting on request creation (max N per hour)

### Data Protection
- No PII in Firestore document IDs
- GPS coordinates rounded for display (exact only for matched provider)
- Chat messages encrypted at rest (Firestore default)
- Media URLs are signed & time-limited (never permanent public URLs)
- API keys in environment variables only, never in code

---

## Design Philosophy

### Visual Identity
- **Minimalist & Futuristic**: Dark theme default, glassmorphism, clean typography
- **Feeling**: Talking to an intelligent assistant, not filling out forms
- **Micro-interactions**: Every action has subtle feedback (haptics + animations)
- **Accessibility**: Min touch targets 44px, sufficient contrast, screen reader labels

### UX Principles
- **Zero forms**: Capture, confirm, done. No typing unless editing AI output.
- **Optimistic UI**: Show result immediately, sync in background.
- **Always clear status**: User always knows what is happening.
- **Respect provider time**: Clear, actionable leads. Easy bid submission. No spam.
- **Think like the user**: Simple person, no tech background. Everything obvious.

---

## Git & Workflow
- Branch: feat/, fix/, chore/, refactor/
- Commits: conventional (feat:, fix:, chore:, test:)
- PR into master

## Environment
- .env.example documents all required vars
- Never commit .env
- Firebase config via env vars

## RTL & i18n
- Hebrew (RTL) primary language
- All strings externalizable
- RTL-aware styles from day 1

---

# Appendix: Clean Software Design Principles

# Principles of Clean Software Design & Python Code

This document aggregates core architectural principles, design patterns, and specific rules for writing clean, maintainable, and robust Python code.

## 1. Encapsulate What Varies

**"Encapsulate What Varies"** is the foundational concept behind almost every design pattern (including the Single Responsibility Principle).

### Core Concept
Identify the aspects of your application that vary and separate them from what stays the same.
*   Gather together things that change for the same reasons.
*   Separate things that change for different reasons.
*   **Why?** So you can alter or extend the parts that vary without breaking the parts that don't.

### Perspectives
1.  **Abstraction:** We purposely avoid understanding many details, concentrating instead on a few key features.
2.  **Information Hiding:** Hide the process and logic. Modules should reveal only what is necessary (abstractions) and hide implementation details that might change.
3.  **Encapsulation:** Bundle attributes and behaviors, exposing an interface while hiding the details.

### Example: The Simple Factory Pattern
*Refactoring code where object creation logic varies, but the usage logic remains constant.*

**The Problem:**
A function `order_pancake` mixes the logic of *choosing* a pancake (which changes when the menu changes) with the logic of *preparing* it (which stays the same).

**The Solution:**
Move the varying creation logic into a Factory class.

```python
class SimplePancakeFactory:
    def create_pancake(self, type: str) -> Pancake:
        # This logic varies with menu updates
        if type == 'classic': return ClassicPancake()
        elif type == 'blueberry': return BlueberryPancake()
        return ClassicPancake()

def order_pancake(type: str) -> Pancake:
    # This logic remains constant; it doesn't care which specific class is returned
    pancake = factory.create_pancake(type)
    pancake.cook()
    pancake.plate()
    return pancake
```

---

## 2. Favor Composition Over Inheritance

**"HAS-A is better than IS-A."**

### The Motivation
Inheritance is the strongest coupling available in OO design. It defines a rigid, compile-time relationship. While it is often true that `CoffeeWithMilk` **IS-A** `Coffee`, relying on this relationship for *features* creates a rigid taxonomy. Real-world objects often don't fit into neat trees; they are collections of capabilities. Composition allows us to assemble behavior dynamically at runtime.

### Case Study: The Coffee Shop
*Problem: We need to calculate the cost of coffee with varying condiments (Milk, Soy, Mocha, Whip, Caramel).*

**❌ The Inheritance Trap (Bad):**
If we rely on inheritance, we imply that `CoffeeWithMilk` **IS-A** distinct type of `Coffee`. To handle combinations, we must create a new class for every permutation to override the `cost()` method.
*   `Coffee`
*   `CoffeeWithMilk` (IS-A Coffee)
*   `CoffeeWithMocha` (IS-A Coffee)
*   `CoffeeWithMilkAndMocha` (IS-A Coffee??)
*   `CoffeeWithSoyAndWhipAndCaramel` ... 

This leads to a **Combinatorial Explosion**. If the price of milk changes, we have to update multiple classes.

**✅ The Composition Solution (HAS-A):**
We invert the thinking. A Coffee isn't defined by what it *is*, but by what it *has*. A Coffee **HAS-A** list of condiments.

```python
from abc import ABC, abstractmethod

# The Abstraction for ingredients
class Condiment(ABC):
    @abstractmethod
    def get_cost(self) -> float: pass

# Concrete Behaviors
class Milk(Condiment):
    def get_cost(self): return 0.50

class Mocha(Condiment):
    def get_cost(self): return 0.75

class Whip(Condiment):
    def get_cost(self): return 0.25

# The Host Object
class Coffee:
    def __init__(self):
        # Flexibility: We can add 0 or 100 condiments at runtime.
        # Coffee HAS-A list of Condiments.
        self.condiments: list[Condiment] = [] 
    
    def add_condiment(self, condiment: Condiment):
        self.condiments.append(condiment)
        
    def get_total_cost(self):
        # The logic is generic. It doesn't care WHAT condiments are added.
        return self.base_price + sum(c.get_cost() for c in self.condiments)
```

---

## 3. The Principle: Dependency Inversion (DIP)

To understand clean architecture, you must understand the relationship between these three concepts. They are not separate rules; they are a chain of cause and effect designed to solve the problem of **Rigidity**.

### 3.1 The Principle
*   **The Motivation**: In traditional programming, high-level "Policy" code (the business logic) depends on low-level "Detail" code (databases, disk I/O). This is dangerous. If the database library changes, your business logic breaks. This is like building a house where the roof relies on the specific brand of carpet you chose.
*   **The Nuance (Source vs. Runtime)**:
    *   *Runtime Flow*: Logic calls Database (Top $\to$ Bottom).
    *   *Source Code Dependency*: Logic imports Interface; Database implements Interface (Bottom $\to$ Top). We **invert** the source code dependency to protect the high-level logic.

### 3.2 A Technique: Program to Interfaces
*   **The Motivation**: To achieve DIP, we must decouple our code from specific objects.
*   **The Action**: We define **Abstract Base Classes (ABCs)** or Interfaces. We type-hint against these abstractions. We never use the `new` keyword (or concrete constructors) inside our core logic, because that hard-wires us to a specific implementation.

### 3.3 Result: Loose Coupling
*   **The Motivation**: We want components that can be snapped together like LEGO bricks, not welded together like steel beams.
*   **The Outcome**: A "Loosely Coupled" system is one where Component A has little to no knowledge of how Component B works. A Remote Control shouldn't care if it's talking to a Sony TV or a Samsung TV; it only cares that the device acts like a `Switchable`.

### Case Study 1: The Remote Control (The Universal Remote)
*Problem: We have a Remote Control (High Level Policy) and a Television (Low Level Detail).*

**❌ Violating DIP (Tight Coupling):**
The Remote creates the TV inside itself. This makes the Remote useless for anything else.
```python
class RemoteControl:
    def __init__(self):
        # ERROR: We are hard-coding the dependency.
        # This remote can ONLY control this specific TV brand.
        self.tv = SonyTV() 
    
    def toggle_power(self):
        # We are coupled to the specific method names of the SonyTV
        self.tv.turn_tv_on()
```

**✅ Applying DIP (The Universal Remote):**
1.  **Abstraction**: We create an `OnOffDevice` interface.
2.  **Inversion**: The `Remote` depends on `OnOffDevice`. The `TV` and `CeilingFan` implement `OnOffDevice`.
3.  **Result**: The Remote can control *anything* that implements the interface.

```python
from abc import ABC, abstractmethod

# 1. The Interface (Owned by the High Level Policy)
class OnOffDevice(ABC):
    @abstractmethod
    def turn_on(self): pass
    
    @abstractmethod
    def turn_off(self): pass

# 2. The Details (Low Level Implementations)
class Television(OnOffDevice):
    def turn_on(self): print("TV is On")
    def turn_off(self): print("TV is Off")

class CeilingFan(OnOffDevice):
    def turn_on(self): print("Fan is Spinning")
    def turn_off(self): print("Fan is Stopped")

# 3. The High Level Module
class RemoteControl:
    # Dependency Injection: The device is passed in.
    def __init__(self, device: OnOffDevice):
        self.device = device
    
    def click_power(self):
        # Loose Coupling: The remote doesn't know what it controls.
        if self.is_on: self.device.turn_off()
        else: self.device.turn_on()
```

### Case Study 2: The Web System (Testability)
*Problem: We want to write unit tests for our logic, but the code writes directly to a production database.*

**❌ Bad (Programming to Implementation):**
```python
class KillerWebSystem:
    def __init__(self):
        # We cannot test this code without a running CommercialDB server.
        # We are trapped by our own implementation choice.
        self.db = CommercialDB() 
```

**✅ Good (Programming to Interface):**
```python
class KillerWebSystem:
    # We ask for the capability (DatabaseInterface), not the implementation.
    def __init__(self, db: DatabaseInterface):
        self.db = db

# In Production:
app = KillerWebSystem(CommercialDB())

# In Testing:
test_app = KillerWebSystem(InMemoryMockDB()) # Fast, safe, isolated testing.
```

---

## 4. The Open-Closed Principle (OCP)

**"Software entities should be open for extension, but closed for modification."**

This principle sounds contradictory. How can a system be "open" to new behaviors while simultaneously being "closed" to changing the existing code?
*   **Closed for Modification:** We spend time getting code correct and bug-free. Once a class is working, we should not touch the source code, because every modification introduces the risk of new bugs.
*   **Open for Extension:** Requirements change. We must be able to change what the application *does*.

The solution lies in the techniques we discussed in Sections 1 and 2: **Encapsulate What Varies** and **Composition**.

### Case Study: The Duck Strategy
*Problem: We have a `Duck` class. Initially, all ducks fly the same way. Later, we need to add migration behavior. Even later, we need to support injured ducks that cannot fly.*

**❌ Violating OCP (Modification):**
Every time a requirement changes, we open the `Duck` class and hack in new logic.

```python
class Duck:
    def fly(self, scenario: str):
        # VIOLATION: We have to Open this class to Modify it 
        # every time a new flying scenario is invented.
        if scenario == 'migration':
            print("Flying long distances with the flock!")
        elif scenario == 'injured':
            print("I can't fly...")
        else:
            print("Flapping wings normally.")
```
*Consequence:* As the scenarios grow, this method becomes a massive conditional mess. If we break this method while adding "injured" logic, we might break "migration" logic by accident.

**✅ Applying OCP (Extension via Composition):**
To make the design "Open," we view *Flying* not as a hard-coded method, but as a set of behaviors. We define a family of algorithms (Strategies) and make the Duck composed of them.

1.  **Isolate the Variance:** Flying behavior varies. Pull it out of the `Duck`.
2.  **Define the Abstraction:** Create a `FlyBehavior` interface.
3.  **Implement Concrete Behaviors:** Create separate classes for each way of flying.

```python
from abc import ABC, abstractmethod

# 1. The Interface (Closed for Modification)
class FlyBehavior(ABC):
    @abstractmethod
    def fly(self) -> None: pass

# 2. The Extensions (Open for Extension)
class NormalFly(FlyBehavior):
    def fly(self): print("Flapping wings normally.")

class MigrationFly(FlyBehavior):
    def fly(self): print("Flying long distances with the flock!")

class InjuredFly(FlyBehavior):
    def fly(self): print("I can't fly...")

# 3. The Client (Closed for Modification)
class Duck:
    def __init__(self, fly_behavior: FlyBehavior):
        # The Duck is configured with a behavior.
        # It doesn't know (or care) which specific behavior it has.
        self.fly_behavior = fly_behavior

    def perform_fly(self):
        # Delegate the task.
        self.fly_behavior.fly()

# Usage
mallard = Duck(NormalFly())
mallard.perform_fly() # "Flapping wings normally."

# Requirement Change: We need a migrating duck.
# We create a NEW class (MigrationFly) without touching the Duck class.
migrator = Duck(MigrationFly())
migrator.perform_fly() # "Flying long distances with the flock!"
```

### The Result
The `Duck` code is safe; we didn't touch it to add the `InjuredFly` behavior. We extended the system by adding new code, not changing old code.


## 5. Design Pattern: The Strategy Pattern

**"Define a family of algorithms, encapsulate each one, and make them interchangeable."**

This is the practical application of **Open-Closed**, **Composition over Inheritance**, and **Encapsulate What Varies**. It is the weapon of choice when you have a specific behavior (like Flying or Sorting) that needs to exist in many variations across many classes.

### Case Study: The SimUDuck Disaster
*Scenario: We are building a Duck Simulator. We start with a standard Object-Oriented approach.*

#### Attempt 1: The Inheritance Hammer (Broken)
We create a `Duck` superclass with methods `quack()`, `swim()`, and `fly()`. We assume all ducks share these traits.
*   **The Change:** Marketing wants a **Rubber Duck**.
*   **The Failure:** `RubberDuck` inherits from `Duck`. Suddenly, in the simulation, plastic rubber ducks are flying around.
*   **The Band-Aid:** We override `fly()` in `RubberDuck` to do nothing.
*   **The Fatal Blow:** Marketing wants a **Decoy Duck** (wood). It can't fly *and* it can't quack. Now we are overriding methods all over the place just to turn functionality *off*. This is a maintenance nightmare.

#### Attempt 2: The Interface Trap (Trash)
We realize inheritance is rigid. So we rip `fly()` out of the superclass and make a `Flyable` interface.
*   **The Failure:** Now, `MallardDuck`, `RedheadDuck`, and `CanvasbackDuck` all need to implement `fly()`.
*   **The Consequence:** We copy-paste the *exact same* flying code into 50 different duck classes. If the physics engine changes, we have to edit 50 files. **Interfaces provide no code reuse.**

### The Solution: The Strategy Pattern
We apply our core principles:
1.  **Identify what varies:** Flying and Quacking behavior.
2.  **Separate it:** Pull these out of the `Duck` class entirely.
3.  **Composition:** The Duck *HAS-A* behavior, it *IS-NOT* the behavior.

We create a **Family of Algorithms** for flying.

```python
from abc import ABC, abstractmethod

# 1. The Strategy Interface (The Family Head)
class FlyBehavior(ABC):
    @abstractmethod
    def fly(self) -> None: pass

# 2. The Concrete Strategies (The Algorithms)
class FlyWithWings(FlyBehavior):
    def fly(self): print("I'm flying!!")

class FlyNoWay(FlyBehavior):
    def fly(self): print("I can't fly.")

class FlyRocketPowered(FlyBehavior):
    def fly(self): print("I'm flying with a rocket!")

# 3. The Context (The Client)
class Duck:
    def __init__(self, fly_behavior: FlyBehavior):
        # COMPOSITION: Duck HAS-A FlyBehavior
        self.fly_behavior = fly_behavior

    def perform_fly(self):
        # DELEGATION: Duck delegates the action to the behavior class
        self.fly_behavior.fly()

    # DYNAMIC BEHAVIOR: We can change the strategy at runtime!
    def set_fly_behavior(self, fb: FlyBehavior):
        self.fly_behavior = fb

# 4. Usage
# A model duck starts grounded
model = Duck(FlyNoWay())
model.perform_fly() # Output: "I can't fly."

# Runtime change: The duck equips a jetpack
model.set_fly_behavior(FlyRocketPowered())
model.perform_fly() # Output: "I'm flying with a rocket!"
```

### Why This is Bulletproof
1.  **Code Reuse:** `FlyWithWings` is written once. 50 different real ducks can use it.
2.  **Separation of Concerns:** The `Duck` class manages duck data. The `FlyBehavior` classes manage physics.
3.  **Runtime Flexibility:** Unlike inheritance (which is set at compile time), we can swap behaviors while the program is running (e.g., a duck breaks its wing).

---

## 6. The Interface Segregation Principle (ISP)


**"Clients should not be forced to depend on methods they do not use."**

### The Concept: The "Polluted" Interface
While the Single Responsibility Principle tells us that classes should be cohesive, ISP applies that same strictness to **Interfaces**.

A "Fat" or "Polluted" interface is one that tries to do too much. It forces implementing classes to carry dummy methods that do nothing, simply to satisfy the interface's contract. This leads to **Low Cohesion**: the methods in the interface aren't truly related to one another from the client's perspective.

### Case Study: The Bloated Vending Machine
*Problem: We are building software for a vending machine company. We start with a machine that sells coffee, but the company expands to soda and snacks.*

**❌ Violating ISP (The "God" Interface):**
We create a single `VendingMachine` interface. As the company grows, we keep adding methods to it.

```python
from abc import ABC, abstractmethod

class VendingMachine(ABC):
    @abstractmethod
    def take_money(self): pass
    
    @abstractmethod
    def brew_coffee(self): pass
    
    @abstractmethod
    def dispense_soda(self): pass
    
    @abstractmethod
    def dispense_snack(self): pass

# The Implementation Nightmare
class SnackMachine(VendingMachine):
    def take_money(self):
        print("Taking coins...")
        
    def dispense_snack(self):
        print("Dispensing chips...")
        
    # VIOLATION: The Snack Machine is forced to implement these methods
    # even though it has no liquid tanks or brewing heaters.
    def brew_coffee(self):
        raise NotImplementedError("I am a snack machine! I cannot brew coffee.")

    def dispense_soda(self):
        # Empty method cluttering the code
        pass 
```
*Consequence:*
1.  **Fragility**: If we change the signature of `brew_coffee()`, we have to re-test and re-deploy the `SnackMachine` code, even though it doesn't brew coffee.
2.  **Confusion**: A client using `SnackMachine` sees `brew_coffee()` in the IDE autocomplete, leading to runtime errors if called.

**✅ Applying ISP (Segregation):**
We split the "Fat" interface into smaller, highly cohesive interfaces based on capabilities (Hot Beverages, Cold Beverages, Snacks).

```python
class CoinOp(ABC):
    @abstractmethod
    def take_money(self): pass

class HotBeverageMachine(ABC):
    @abstractmethod
    def brew_coffee(self): pass
    @abstractmethod
    def brew_tea(self): pass

class ColdBeverageMachine(ABC):
    @abstractmethod
    def dispense_soda(self): pass

class SnackMachineInterface(ABC):
    @abstractmethod
    def dispense_snack(self): pass

# Client 1: The dedicated Snack Machine
class SimpleSnackMachine(CoinOp, SnackMachineInterface):
    def take_money(self): print("Taking coins...")
    def dispense_snack(self): print("Dispensing chips...")
    # Clean! No coffee or soda methods here.

# Client 2: The "Uber" Machine
# If we have a machine that does EVERYTHING, we simply implement all interfaces.
class UberVendingMachine(CoinOp, HotBeverageMachine, ColdBeverageMachine, SnackMachineInterface):
    def take_money(self): ...
    def brew_coffee(self): ...
    def brew_tea(self): ...
    def dispense_soda(self): ...
    def dispense_snack(self): ...
```

### The Result
By segregating interfaces, we decouple the systems. Changes to the `HotBeverageMachine` interface (e.g., adding `brew_hot_chocolate`) will never affect the `SimpleSnackMachine`. We have achieved high cohesion and low coupling.


## 7. Design Pattern: The Observer Pattern

**"Defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified automatically."**

### The Core Concept: Loose Coupling
The Holy Grail of architecture is **Loose Coupling**: when two objects interact but know almost nothing about each other.
*   **Tight Coupling (Bad):** A Weather Station knows exactly which Display screens are attached to it. If you add a mobile phone app, you have to rewrite the Weather Station code.
*   **Loose Coupling (Good - Observer):** The Weather Station (Subject) knows only one thing: "I have a list of subscribers." It doesn't care if those subscribers are screens, loggers, or missiles.

### Case Study: The Weather Station
*Problem: We have a `WeatherData` object fetching sensor readings. We need to update three different displays: Current Conditions, Statistics, and Forecast.*

**❌ The Novice Approach (Tight Coupling):**
The developer hard-codes the updates into the data class.

```python
class WeatherData:
    def measurements_changed(self):
        temp = get_temperature()
        humidity = get_humidity()
        
        # VIOLATION: We are coding to concrete implementations.
        # If we add a new display, we must Modify this code (OCP Violation).
        # If we remove a display, we break this code.
        self.current_conditions_display.update(temp, humidity)
        self.statistics_display.update(temp, humidity)
        self.forecast_display.update(temp, humidity)
```
*Verdict:* **Trash.** This is a maintenance nightmare. The data object acts like a manager that micromanages every display.

**✅ The Observer Solution (Publish/Subscribe):**
We invert the power dynamic. The Displays (Observers) ask to join. The WeatherData (Subject) simply broadcasts.

1.  **The Abstractions:** Define the contract for communication.
2.  **The Subject:** Manages a list of generic subscribers.
3.  **The Observer:** Waits for the signal.

```python
from abc import ABC, abstractmethod

# 1. The Contract (Observer)
class Observer(ABC):
    @abstractmethod
    def update(self, temp: float, humidity: float, pressure: float) -> None: pass

# 2. The Subject (The Publisher)
class Subject:
    def __init__(self):
        self._observers: list[Observer] = []

    def register_observer(self, observer: Observer):
        self._observers.append(observer)

    def remove_observer(self, observer: Observer):
        self._observers.remove(observer)

    def notify_observers(self, temp: float, humidity: float, pressure: float):
        # The Subject doesn't care WHO these observers are.
        # It just knows they have an 'update' method.
        for observer in self._observers:
            observer.update(temp, humidity, pressure)

# 3. The Concrete Subject (The Data Owner)
class WeatherData(Subject):
    def set_measurements(self, temp: float, humidity: float, pressure: float):
        self.temp = temp
        self.humidity = humidity
        self.pressure = pressure
        # When data changes, blindly notify everyone.
        self.notify_observers(temp, humidity, pressure)

# 4. The Concrete Observers (The Consumers)
class CurrentConditionsDisplay(Observer):
    def update(self, temp, humidity, pressure):
        print(f"Current: {temp}F, {humidity}% humidity")

class StatisticsDisplay(Observer):
    def __init__(self):
        self.max_temp = 0.0
        self.min_temp = 200.0
        
    def update(self, temp, humidity, pressure):
        if temp > self.max_temp: self.max_temp = temp
        if temp < self.min_temp: self.min_temp = temp
        print(f"Stats: Max: {self.max_temp}F | Min: {self.min_temp}F")

# Usage
weather_data = WeatherData()
current_display = CurrentConditionsDisplay()
stats_display = StatisticsDisplay()

# Wiring it up (Runtime flexibility)
weather_data.register_observer(current_display)
weather_data.register_observer(stats_display)

# The Event Trigger
# Both displays update automatically. The WeatherData class never changed.
print("\n-- New Measurements --")
weather_data.set_measurements(80, 65, 30.4) 

print("\n-- New Measurements (Warmer) --")
weather_data.set_measurements(82, 70, 29.2)
```

### Why This Survives Production
1.  **Open/Closed Principle:** You can add a `PhoneAppDisplay` or a `LoggerObserver` without ever touching the `WeatherData` class. You just implement the `Observer` interface and register it.
2.  **Runtime Dynamism:** A display can "turn off" (unsubscribe) while the system is running without crashing the data feed.
3.  **Single Responsibility:** The `WeatherData` focuses on fetching data. The `Display` focuses on showing pixels. They interact only through a thin interface.



---

## 8. Design Pattern: The Decorator Pattern

**"Attaches additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality."**

### The Core Concept: Wrappers
Inheritance is static. Once you inherit, you are stuck with that behavior at compile time. The Decorator pattern allows you to **wrap** an object with new behaviors at runtime. It uses inheritance *only* to match the type, but uses **composition** to add the behavior.

### Case Study: The Coffee Shop Explosion
*Problem: We are building a billing system for a coffee shop. We have beverages (`DarkRoast`, `Espresso`) and condiments (`Milk`, `Soy`, `Mocha`, `Whip`). We need to calculate the total cost.*

#### Attempt 1: The Inheritance Explosion (Trash)
We create a class for every combination.
*   `DarkRoastWithMilk`
*   `DarkRoastWithMilkAndMocha`
*   `DarkRoastWithSoyAndWhipAndMocha`
*   *Verdict:* **Combinatorial Explosion.** If the price of milk changes, you have to edit 50 classes. If a new condiment is added, you need to create exponentially more classes.

#### Attempt 2: The Superclass Blob (Rigid)
We stuff the logic into the parent `Beverage` class using boolean flags.
```python
class Beverage:
    def cost(self):
        total = 0.0
        if self.has_milk: total += 0.50
        if self.has_whip: total += 0.10
        # ... and so on for every condiment
        return total
```
*Verdict:* **Fragile.**
1.  **Violation of OCP:** Adding "Caramel" requires opening and modifying the `Beverage` class.
2.  **Logic Limits:** Boolean flags cannot handle "Double Mocha" (True/False doesn't count quantity).
3.  **Inappropriate Inheritance:** An "Iced Tea" subclass inherits `has_whip`, which might not make sense.

### The Solution: The Decorator Pattern
We treat condiments as **Wrappers**.
*   A `Mocha` is a `Beverage` (Type Inheritance).
*   A `Mocha` *HAS-A* `Beverage` (Composition).

When we ask for the cost, the wrapper delegates the call to the wrapped object, adds its own cost, and returns the result.

### The Paradox: Why "IS-A" AND "HAS-A"?

You asked why a `Mocha` must be a `Beverage` (Inheritance) **AND** contain a `Beverage` (Composition).

It seems redundant. It isn't. It's structural necessity.

#### The "IS-A" Requirement (Polymorphism)
We use inheritance here **only for type matching**, not for behavior inheritance.
*   **The Constraint:** The client code (the code calling `.cost()`) expects a `Beverage`.
*   **The Trick:** By making `Mocha` inherit from `Beverage`, the `Mocha` object *disguises* itself. It allows us to pass a `Mocha` anywhere a `DarkRoast` could go.
*   **The Chain:** If `Mocha` was **not** a `Beverage`, you couldn't wrap a `Mocha` inside a `Whip`.
    *   `Whip` expects a `Beverage` in its constructor.
    *   If `Mocha` is just a `Condiment`, you can't put it inside `Whip`. The chain breaks.

#### The "HAS-A" Requirement (The Link)
We use composition to create the linked list (the onion layers).
*   `Mocha` holds a reference to whatever is inside it.
*   When you call `cost()`, `Mocha` does its math, but it **must** call the inner object's `cost()` to get the total. Without "HAS-A", it has no idea what it is decorating.

**Visualizing the Chain:**
`Whip (IS Beverage)` -> holds -> `Mocha (IS Beverage)` -> holds -> `DarkRoast (IS Beverage)`


```python
from abc import ABC, abstractmethod

# 1. The Component (Abstract Base)
class Beverage(ABC):
    @property
    @abstractmethod
    def description(self) -> str: pass
    
    @abstractmethod
    def cost(self) -> float: pass

# 2. The Concrete Component (The Base Object)
class DarkRoast(Beverage):
    @property
    def description(self): return "Dark Roast"
    
    def cost(self): return 0.99

class Espresso(Beverage):
    @property
    def description(self): return "Espresso"
    
    def cost(self): return 1.99

# 3. The Decorator (The Abstract Wrapper)
# It IS-A Beverage (so it can wrap others), but it requires a reference to a Beverage.
class CondimentDecorator(Beverage):
    def __init__(self, beverage: Beverage):
        self.beverage = beverage

# 4. Concrete Decorators (The Layers)
class Mocha(CondimentDecorator):
    @property
    def description(self):
        return self.beverage.description + ", Mocha"
        
    def cost(self):
        # Delegate to the wrapped object, then add self.
        return self.beverage.cost() + 0.20

class Whip(CondimentDecorator):
    @property
    def description(self):
        return self.beverage.description + ", Whip"
        
    def cost(self):
        return self.beverage.cost() + 0.10

# 5. Usage (Runtime Composition)
# Customer orders a Double Mocha Dark Roast with Whip
order = DarkRoast()             # cost: 0.99
order = Mocha(order)            # Wrap it. cost: 1.19
order = Mocha(order)            # Wrap it again. cost: 1.39
order = Whip(order)             # Wrap it. cost: 1.49

print(f"{order.description} ${order.cost():.2f}")
# Output: "Dark Roast, Mocha, Mocha, Whip $1.49"
```

### Your Challenge: "Why not just a List?"

You asked: *Wouldn't it be easier to have an Order class with a `List<Condiment>`, iterate over them, and sum the cost?*

**Verdict: For simple pricing, you are absolutely right.**

If the **only** problem you are solving is calculating a bill (A + B + C + D), the Decorator pattern is **overengineering**. A list is cleaner, easier to store in a database, and easier to serialize.

**HOWEVER**, the Decorator pattern is **not** about summing numbers. It is about **modifying behavior**.

#### Where the "List" Approach Fails
The "List" approach assumes that condiments are independent, additive values. But what if a decorator needs to **interact** with the result, not just add to it?

**Scenario: The "Employee Discount" Decorator**
Imagine we have a decorator that gives 20% off the *entire* drink.

**With Decorator:**
It's trivial. The decorator wraps the whole drink, gets the total cost, and multiplies it by 0.8.
```python
class EmployeeDiscount(CondimentDecorator):
    def cost(self):
        # I can modify the RESULT of the previous layers!
        return self.beverage.cost() * 0.80 
```

**With Your "List" Approach:**
You are stuck. The `Order` class iterates the list and sums them up: `base + milk + soy`.
To support a discount, you now have to:
1.  Open the `Order` class.
2.  Add specific logic for "Discounts" (which are different from "Condiments").
3.  Change the math formula.
**You have violated the Open-Closed Principle.** You had to modify the core logic to add a new feature.

#### The "Flow" Advantage
The Decorator shines when ordering matters or when data flows *through* the layers. Think about Input/Output streams (the classic Decorator example).

*   `BufferedInputStream(GZipInputStream(FileInputStream("data.txt")))`

1.  **File Stream**: Reads raw bytes.
2.  **GZip Stream**: Takes bytes, unzips them (Modifies data).
3.  **Buffered Stream**: Takes unzipped data, chunks it for performance (Modifies behavior).

You cannot do this with a "List of properties." You need a pipeline where Layer A processes the data and hands it to Layer B.

### Summary
1.  **Use a List** if you are just tallying a receipt (Simple addition).
2.  **Use Decorator** if the wrappers need to **transform**, **filter**, or **scale** the output of the object they are wrapping (Complex behavior modification).


### Why This is Bulletproof
1.  **Open/Closed Compliance:** New condiment? Create a `Caramel` class. No existing code is touched.
2.  **Runtime Flexibility:** You can stack decorators infinitely (Triple Mocha). You can mix and match dynamically.
3.  **Simplicity:** The `Beverage` class stays clean. It doesn't know about condiments. The `DarkRoast` class stays clean. It doesn't calculate condiment math.


---


## 9. Design Pattern: The Factory Method

**"Defines an interface for creating an object, but lets subclasses decide which class to instantiate."**

### The Core Concept: Deferring Instantiation
In standard programming, if you need an object, you instantiate it (`new Pizza()`).
*   **The Problem:** This binds your code to a concrete class. If you have a generic processing flow (Prepare $\to$ Bake $\to$ Box) that works for *all* pizzas, but the specific *type* of pizza changes based on location or configuration, direct instantiation breaks your design.
*   **The Solution:** The **Factory Method** lets the parent class define the *process*, but forces the subclasses to define the *product*.

### Case Study: The Pizza Franchise War
*Problem: We have a `PizzaStore`. The process of ordering is always the same: `prepare()`, `bake()`, `cut()`, `box()`. However, we are expanding. We have a NY Store (Thin Crust, Marinara) and a Chicago Store (Deep Dish, Plum Tomato).*

#### Attempt 1: The Parameter Hell (Trash)
We try to handle this in one `PizzaStore` class with flags.
```python
class PizzaStore:
    def order_pizza(self, style: str, type: str):
        pizza = None
        # The combinatorial explosion begins...
        if style == "NY":
            if type == "cheese": pizza = NYCheesePizza()
            elif type == "veggie": pizza = NYVeggiePizza()
        elif style == "Chicago":
            if type == "cheese": pizza = ChicagoDeepDish()
            # ... limitless if/else statements
        
        # The rigid process
        pizza.prepare()
        pizza.bake()
        pizza.cut()
        pizza.box()
        return pizza
```
*Verdict:* **Unmaintainable.** The `PizzaStore` class knows too much. It is coupled to every single concrete pizza class in existence. Adding "California Style" requires editing this file and risking bugs in the NY logic.

#### The Solution: The Factory Method
We declare `create_pizza` as an abstract method in the `PizzaStore`. The `PizzaStore` *uses* the pizza, but it doesn't know *which* pizza it is using.

1.  **The Creator (Abstract):** Defines the workflow (`order_pizza`) and the abstract factory method (`create_pizza`).
2.  **The Concrete Creators:** Implement the factory method to return specific products.

```python
from abc import ABC, abstractmethod

# 1. The Product (Abstract)
class Pizza(ABC):
    def __init__(self):
        self.name = "Unknown Pizza"

    def prepare(self): print(f"Preparing {self.name}...")
    def bake(self): print(f"Baking {self.name}...")
    def cut(self): print(f"Cutting {self.name}...")
    def box(self): print(f"Boxing {self.name}...")

# 2. The Creator (Abstract)
class PizzaStore(ABC):
    # This is the High-Level Policy. It defines the algorithm.
    # It CANNOT be changed just because we add a new region.
    def order_pizza(self, type: str) -> Pizza:
        # MAGIC: We call a method that doesn't exist yet!
        # We rely on the subclass to fill in this blank.
        pizza = self.create_pizza(type)
        
        pizza.prepare()
        pizza.bake()
        pizza.cut()
        pizza.box()
        return pizza

    # THE FACTORY METHOD
    @abstractmethod
    def create_pizza(self, type: str) -> Pizza: 
        pass

# 3. The Concrete Creators
class NYPizzaStore(PizzaStore):
    # NY Store knows how to make NY Pizzas.
    def create_pizza(self, type: str) -> Pizza:
        if type == "cheese": 
            return NYStyleCheesePizza()
        elif type == "veggie": 
            return NYStyleVeggiePizza()
        return None

class ChicagoPizzaStore(PizzaStore):
    # Chicago Store knows how to make Chicago Pizzas.
    def create_pizza(self, type: str) -> Pizza:
        if type == "cheese": 
            return ChicagoStyleCheesePizza()
        elif type == "veggie": 
            return ChicagoStyleVeggiePizza()
        return None

# 4. Usage
# Client wants a pizza. They pick a store.
ny_store = NYPizzaStore()
chicago_store = ChicagoPizzaStore()

# The process is identical, the result is different.
pizza1 = ny_store.order_pizza("cheese")       # Gets Thin Crust
pizza2 = chicago_store.order_pizza("cheese")  # Gets Deep Dish
```

### Why This is Bulletproof
1.  **Decoupling:** The `PizzaStore` superclass (the framework) has zero dependencies on `NYStyleCheesePizza`. It only depends on the `Pizza` abstraction.
2.  **Consistency:** The `order_pizza` method enforces the standard quality control (Prepare -> Bake -> Cut -> Box) for *every* franchise. A rogue Chicago store cannot decide to skip the "Bake" step.
3.  **Extensibility:** Want to add a `CaliforniaPizzaStore`? Just extend `PizzaStore`. You don't touch the existing logic.

### Critical Distinction: Simple Factory vs. Factory Method
*   **Simple Factory (Section 1):** A helper class that hides instantiation logic. Good for one-off decoupling.
*   **Factory Method (Section 9):** A pattern that uses **Inheritance**. The client code (`order_pizza`) is defined in the superclass, but the instantiation (`create_pizza`) is deferred to the subclass. Use this when you have a standard process that requires variant products.


---


## 10. Core Architectural Principles

1.  **Strive for Low Coupling**: Modules and classes should be independent. A change in one should not break others.
2.  **Strive for High Cohesion**: Each module or class must have a single, well-defined purpose.
3.  **Depend on Abstractions, Not Concretions**: High-level logic should not depend on low-level details (e.g., a specific database). Depend on abstract interfaces instead.

### The SOLID Principles
1.  **S - Single Responsibility Principle**: A class or function should have only one reason to change.
2.  **O - Open-Closed Principle**: Open for extension, but closed for modification.
3.  **L - Liskov Substitution Principle**: A subclass must be substitutable for its parent class.
4.  **I - Interface Segregation Principle**: Clients should not depend on methods they don't use.
5.  **D - Dependency Inversion Principle**: Depend on abstractions, not on concrete implementations.

---

## 11. Rules for Functions

**Golden Rule**: A function must do exactly one thing, do it well, and do it only.

### Function Size
*   **Constraint**: Functions should be very small.
*   **Ideal**: 4 to 5 lines.
*   **Acceptable**: Under 10 lines.
*   **Too Big**: 10+ lines.
*   **The "One Thing" Test**: If you can extract another function from your function, the original was doing more than one thing. Large functions often hide classes waiting to be discovered.

### Arguments
Arguments are liabilities, not assets.
*   **0 Arguments**: Ideal.
*   **1-2 Arguments**: Acceptable.
*   **3 Arguments**: Avoid. If three variables are cohesive enough to pass together, they should likely be coupled into an object (Data Class).
*   **>3 Arguments**: Indicates a design flaw.

### Flags and Conditionals
*   **No Boolean Flags**: Passing a boolean (`True`/`False`) means the function does two things. Write two separate functions instead.
*   **Avoid `None` as a Flag**: Do not change core behavior based on whether an argument is `None`. This creates hidden logic paths.

---

## 12. Rules for Classes and Data

### Class Design
From the outside, a class is a "bag of functions" with no observable state.
*   **Cohesion**: The more variables a method manipulates within a class, the more cohesive it is.
*   **Hide Implementation**: Do not expose internal state unnecessarily.

### The Problem with Getters and Setters
*   **Tell, Don't Ask**: If you make variables private but expose them via standard getters/setters, you violate encapsulation.
*   **Abstract the Data**: If you must retrieve data, abstract the information.
    *   ❌ **Bad**: `getGallonsOfGas()` (Exposes implementation detail).
    *   ✅ **Good**: `getPercentFuelRemaining()` (Polymorphic; works for Gas, Diesel, and Electric cars).

### Naming Conventions (PEP 8)
*   **Communicate Intent**: Names must reveal purpose. If a name needs a comment, rename it.
*   **Classes**: `CapWords` (Nouns describing the entity).
*   **Functions**: `snake_case` (Verbs describing an action).
*   **Variables**: `snake_case` (Nouns).
*   **Constants**: `ALL_CAPS_SNAKE_CASE`.
*   **Booleans**: Prefix with `is_` or `has_`.

---


## 13. Pythonic Implementation

Leverage Python's strengths for concise, readable, and expressive code.

### Expressive Features
*   **List Comprehensions**: Use for clear, efficient transformations and filtering.
*   **Data Libraries**: Prefer **NumPy** or **Pandas** for numerical/tabular data. Vectorized operations are more performant and expressive than manual loops.

### Commenting and Formatting
*   **Code is the Truth**: Code must be clear enough to require no comments. Comments should explain *why*, never *what*.
*   **No Commented-Out Code**: Delete it. Use version control for history.
*   **Automate**: Use tools like **Black** or **Ruff** to enforce consistent formatting.

### Few-Shot Example: Pythonic Quicksort
This example demonstrates small, single-responsibility functions and expressive list comprehensions.

```python
def partition(seq):
    """Partitions a sequence around a pivot element."""
    pi, seq = seq[0], seq[1:]                   # Pick and remove the pivot
    lo = [x for x in seq if x <= pi]            # All the small elements
    hi = [x for x in seq if x > pi]             # All the large ones
    return lo, pi, hi                           # pi is "in the right place"

def quicksort(seq):
    """Sorts a sequence using the quicksort algorithm."""
    if len(seq) <= 1: return seq                # Base case
    lo, pi, hi = partition(seq)                 # pi is in its place
    return quicksort(lo) + [pi] + quicksort(hi) # Sort lo and hi separately
```


# Practical Development Notes

## File Encoding

**Always use UTF-8 encoding** when working with files in this project. Since we're working with both Hebrew (עברית) and English text, UTF-8 is essential to prevent character corruption and ensure proper display of all characters.


---

# 14. The Standard of Review (Meta-Instructions)

**Mandate for AI Assistants and Human Reviewers:**
When using this document to review code or suggest solutions, adopt the persona of a **Lead Software Architect**. Your goal is not to be polite; your goal is to ensure the software survives production.

### The "Ruthless Mentor" Protocol
*   **No Sugarcoating**: Do not praise code for simply "working." If a solution works but violates the principles of low coupling or high cohesion, reject it immediately.
*   **Stress-Test Everything**: Do not assume the "Happy Path." Ask: *What happens if the database is slow? What if this argument is Null? What if we need to add a new type of customer next week?*
*   **Identify Weakness**: If an idea is weak, explicitly label it as a technical debt risk and explain the specific principle it violates.

### The Overengineering Trap (The Sanity Check)
The patterns in this document (Strategy, Factory, etc.) are powerful, but they introduce complexity. **Complexity is a cost.**
*   **Apply the "YAGNI" Filter** (You Ain't Gonna Need It): If a simple `if/else` statement suffices and the requirement is unlikely to change, **do not** force a Design Pattern.
*   **Challenge Complexity**: If a proposed solution involves multiple abstract base classes for a simple problem, call it out as overengineered "trash" and suggest the simplest possible implementation that is still clean.

**Conclusion**: Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.
### The Motivation
Inheritance is the strongest coupling available in OO design. It defines a rigid, compile-time relationship. While it is often true that `CoffeeWithMilk` **IS-A** `Coffee`, relying on this relationship for *features* creates a rigid taxonomy. Real-world objects often don't fit into neat trees; they are collections of capabilities. Composition allows us to assemble behavior dynamically at runtime.

### Case Study: The Coffee Shop
*Problem: We need to calculate the cost of coffee with varying condiments (Milk, Soy, Mocha, Whip, Caramel).*

**❌ The Inheritance Trap (Bad):**
If we rely on inheritance, we imply that `CoffeeWithMilk` **IS-A** distinct type of `Coffee`. To handle combinations, we must create a new class for every permutation to override the `cost()` method.
*   `Coffee`
*   `CoffeeWithMilk` (IS-A Coffee)
*   `CoffeeWithMocha` (IS-A Coffee)
*   `CoffeeWithMilkAndMocha` (IS-A Coffee??)
*   `CoffeeWithSoyAndWhipAndCaramel` ... 

This leads to a **Combinatorial Explosion**. If the price of milk changes, we have to update multiple classes.

**✅ The Composition Solution (HAS-A):**
We invert the thinking. A Coffee isn't defined by what it *is*, but by what it *has*. A Coffee **HAS-A** list of condiments.

```python
from abc import ABC, abstractmethod

# The Abstraction for ingredients
class Condiment(ABC):
    @abstractmethod
    def get_cost(self) -> float: pass

# Concrete Behaviors
class Milk(Condiment):
    def get_cost(self): return 0.50

class Mocha(Condiment):
    def get_cost(self): return 0.75

class Whip(Condiment):
    def get_cost(self): return 0.25

# The Host Object
class Coffee:
    def __init__(self):
        # Flexibility: We can add 0 or 100 condiments at runtime.
        # Coffee HAS-A list of Condiments.
        self.condiments: list[Condiment] = [] 
    
    def add_condiment(self, condiment: Condiment):
        self.condiments.append(condiment)
        
    def get_total_cost(self):
        # The logic is generic. It doesn't care WHAT condiments are added.
        return self.base_price + sum(c.get_cost() for c in self.condiments)
```

---

## 3. The Principle: Dependency Inversion (DIP)

To understand clean architecture, you must understand the relationship between these three concepts. They are not separate rules; they are a chain of cause and effect designed to solve the problem of **Rigidity**.

### 3.1 The Principle
*   **The Motivation**: In traditional programming, high-level "Policy" code (the business logic) depends on low-level "Detail" code (databases, disk I/O). This is dangerous. If the database library changes, your business logic breaks. This is like building a house where the roof relies on the specific brand of carpet you chose.
*   **The Nuance (Source vs. Runtime)**:
    *   *Runtime Flow*: Logic calls Database (Top $\to$ Bottom).
    *   *Source Code Dependency*: Logic imports Interface; Database implements Interface (Bottom $\to$ Top). We **invert** the source code dependency to protect the high-level logic.

### 3.2 A Technique: Program to Interfaces
*   **The Motivation**: To achieve DIP, we must decouple our code from specific objects.
*   **The Action**: We define **Abstract Base Classes (ABCs)** or Interfaces. We type-hint against these abstractions. We never use the `new` keyword (or concrete constructors) inside our core logic, because that hard-wires us to a specific implementation.

### 3.3 Result: Loose Coupling
*   **The Motivation**: We want components that can be snapped together like LEGO bricks, not welded together like steel beams.
*   **The Outcome**: A "Loosely Coupled" system is one where Component A has little to no knowledge of how Component B works. A Remote Control shouldn't care if it's talking to a Sony TV or a Samsung TV; it only cares that the device acts like a `Switchable`.

### Case Study 1: The Remote Control (The Universal Remote)
*Problem: We have a Remote Control (High Level Policy) and a Television (Low Level Detail).*

**❌ Violating DIP (Tight Coupling):**
The Remote creates the TV inside itself. This makes the Remote useless for anything else.
```python
class RemoteControl:
    def __init__(self):
        # ERROR: We are hard-coding the dependency.
        # This remote can ONLY control this specific TV brand.
        self.tv = SonyTV() 
    
    def toggle_power(self):
        # We are coupled to the specific method names of the SonyTV
        self.tv.turn_tv_on()
```

**✅ Applying DIP (The Universal Remote):**
1.  **Abstraction**: We create an `OnOffDevice` interface.
2.  **Inversion**: The `Remote` depends on `OnOffDevice`. The `TV` and `CeilingFan` implement `OnOffDevice`.
3.  **Result**: The Remote can control *anything* that implements the interface.

```python
from abc import ABC, abstractmethod

# 1. The Interface (Owned by the High Level Policy)
class OnOffDevice(ABC):
    @abstractmethod
    def turn_on(self): pass
    
    @abstractmethod
    def turn_off(self): pass

# 2. The Details (Low Level Implementations)
class Television(OnOffDevice):
    def turn_on(self): print("TV is On")
    def turn_off(self): print("TV is Off")

class CeilingFan(OnOffDevice):
    def turn_on(self): print("Fan is Spinning")
    def turn_off(self): print("Fan is Stopped")

# 3. The High Level Module
class RemoteControl:
    # Dependency Injection: The device is passed in.
    def __init__(self, device: OnOffDevice):
        self.device = device
    
    def click_power(self):
        # Loose Coupling: The remote doesn't know what it controls.
        if self.is_on: self.device.turn_off()
        else: self.device.turn_on()
```

### Case Study 2: The Web System (Testability)
*Problem: We want to write unit tests for our logic, but the code writes directly to a production database.*

**❌ Bad (Programming to Implementation):**
```python
class KillerWebSystem:
    def __init__(self):
        # We cannot test this code without a running CommercialDB server.
        # We are trapped by our own implementation choice.
        self.db = CommercialDB() 
```

**✅ Good (Programming to Interface):**
```python
class KillerWebSystem:
    # We ask for the capability (DatabaseInterface), not the implementation.
    def __init__(self, db: DatabaseInterface):
        self.db = db

# In Production:
app = KillerWebSystem(CommercialDB())

# In Testing:
test_app = KillerWebSystem(InMemoryMockDB()) # Fast, safe, isolated testing.
```

---

## 4. The Open-Closed Principle (OCP)

**"Software entities should be open for extension, but closed for modification."**

This principle sounds contradictory. How can a system be "open" to new behaviors while simultaneously being "closed" to changing the existing code?
*   **Closed for Modification:** We spend time getting code correct and bug-free. Once a class is working, we should not touch the source code, because every modification introduces the risk of new bugs.
*   **Open for Extension:** Requirements change. We must be able to change what the application *does*.

The solution lies in the techniques we discussed in Sections 1 and 2: **Encapsulate What Varies** and **Composition**.

### Case Study: The Duck Strategy
*Problem: We have a `Duck` class. Initially, all ducks fly the same way. Later, we need to add migration behavior. Even later, we need to support injured ducks that cannot fly.*

**❌ Violating OCP (Modification):**
Every time a requirement changes, we open the `Duck` class and hack in new logic.

```python
class Duck:
    def fly(self, scenario: str):
        # VIOLATION: We have to Open this class to Modify it 
        # every time a new flying scenario is invented.
        if scenario == 'migration':
            print("Flying long distances with the flock!")
        elif scenario == 'injured':
            print("I can't fly...")
        else:
            print("Flapping wings normally.")
```
*Consequence:* As the scenarios grow, this method becomes a massive conditional mess. If we break this method while adding "injured" logic, we might break "migration" logic by accident.

**✅ Applying OCP (Extension via Composition):**
To make the design "Open," we view *Flying* not as a hard-coded method, but as a set of behaviors. We define a family of algorithms (Strategies) and make the Duck composed of them.

1.  **Isolate the Variance:** Flying behavior varies. Pull it out of the `Duck`.
2.  **Define the Abstraction:** Create a `FlyBehavior` interface.
3.  **Implement Concrete Behaviors:** Create separate classes for each way of flying.

```python
from abc import ABC, abstractmethod

# 1. The Interface (Closed for Modification)
class FlyBehavior(ABC):
    @abstractmethod
    def fly(self) -> None: pass

# 2. The Extensions (Open for Extension)
class NormalFly(FlyBehavior):
    def fly(self): print("Flapping wings normally.")

class MigrationFly(FlyBehavior):
    def fly(self): print("Flying long distances with the flock!")

class InjuredFly(FlyBehavior):
    def fly(self): print("I can't fly...")

# 3. The Client (Closed for Modification)
class Duck:
    def __init__(self, fly_behavior: FlyBehavior):
        # The Duck is configured with a behavior.
        # It doesn't know (or care) which specific behavior it has.
        self.fly_behavior = fly_behavior

    def perform_fly(self):
        # Delegate the task.
        self.fly_behavior.fly()

# Usage
mallard = Duck(NormalFly())
mallard.perform_fly() # "Flapping wings normally."

# Requirement Change: We need a migrating duck.
# We create a NEW class (MigrationFly) without touching the Duck class.
migrator = Duck(MigrationFly())
migrator.perform_fly() # "Flying long distances with the flock!"
```

### The Result
The `Duck` code is safe; we didn't touch it to add the `InjuredFly` behavior. We extended the system by adding new code, not changing old code.


## 5. Design Pattern: The Strategy Pattern

**"Define a family of algorithms, encapsulate each one, and make them interchangeable."**

This is the practical application of **Open-Closed**, **Composition over Inheritance**, and **Encapsulate What Varies**. It is the weapon of choice when you have a specific behavior (like Flying or Sorting) that needs to exist in many variations across many classes.

### Case Study: The SimUDuck Disaster
*Scenario: We are building a Duck Simulator. We start with a standard Object-Oriented approach.*

#### Attempt 1: The Inheritance Hammer (Broken)
We create a `Duck` superclass with methods `quack()`, `swim()`, and `fly()`. We assume all ducks share these traits.
*   **The Change:** Marketing wants a **Rubber Duck**.
*   **The Failure:** `RubberDuck` inherits from `Duck`. Suddenly, in the simulation, plastic rubber ducks are flying around.
*   **The Band-Aid:** We override `fly()` in `RubberDuck` to do nothing.
*   **The Fatal Blow:** Marketing wants a **Decoy Duck** (wood). It can't fly *and* it can't quack. Now we are overriding methods all over the place just to turn functionality *off*. This is a maintenance nightmare.

#### Attempt 2: The Interface Trap (Trash)
We realize inheritance is rigid. So we rip `fly()` out of the superclass and make a `Flyable` interface.
*   **The Failure:** Now, `MallardDuck`, `RedheadDuck`, and `CanvasbackDuck` all need to implement `fly()`.
*   **The Consequence:** We copy-paste the *exact same* flying code into 50 different duck classes. If the physics engine changes, we have to edit 50 files. **Interfaces provide no code reuse.**

### The Solution: The Strategy Pattern
We apply our core principles:
1.  **Identify what varies:** Flying and Quacking behavior.
2.  **Separate it:** Pull these out of the `Duck` class entirely.
3.  **Composition:** The Duck *HAS-A* behavior, it *IS-NOT* the behavior.

We create a **Family of Algorithms** for flying.

```python
from abc import ABC, abstractmethod

# 1. The Strategy Interface (The Family Head)
class FlyBehavior(ABC):
    @abstractmethod
    def fly(self) -> None: pass

# 2. The Concrete Strategies (The Algorithms)
class FlyWithWings(FlyBehavior):
    def fly(self): print("I'm flying!!")

class FlyNoWay(FlyBehavior):
    def fly(self): print("I can't fly.")

class FlyRocketPowered(FlyBehavior):
    def fly(self): print("I'm flying with a rocket!")

# 3. The Context (The Client)
class Duck:
    def __init__(self, fly_behavior: FlyBehavior):
        # COMPOSITION: Duck HAS-A FlyBehavior
        self.fly_behavior = fly_behavior

    def perform_fly(self):
        # DELEGATION: Duck delegates the action to the behavior class
        self.fly_behavior.fly()

    # DYNAMIC BEHAVIOR: We can change the strategy at runtime!
    def set_fly_behavior(self, fb: FlyBehavior):
        self.fly_behavior = fb

# 4. Usage
# A model duck starts grounded
model = Duck(FlyNoWay())
model.perform_fly() # Output: "I can't fly."

# Runtime change: The duck equips a jetpack
model.set_fly_behavior(FlyRocketPowered())
model.perform_fly() # Output: "I'm flying with a rocket!"
```

### Why This is Bulletproof
1.  **Code Reuse:** `FlyWithWings` is written once. 50 different real ducks can use it.
2.  **Separation of Concerns:** The `Duck` class manages duck data. The `FlyBehavior` classes manage physics.
3.  **Runtime Flexibility:** Unlike inheritance (which is set at compile time), we can swap behaviors while the program is running (e.g., a duck breaks its wing).

---

## 6. The Interface Segregation Principle (ISP)


**"Clients should not be forced to depend on methods they do not use."**

### The Concept: The "Polluted" Interface
While the Single Responsibility Principle tells us that classes should be cohesive, ISP applies that same strictness to **Interfaces**.

A "Fat" or "Polluted" interface is one that tries to do too much. It forces implementing classes to carry dummy methods that do nothing, simply to satisfy the interface's contract. This leads to **Low Cohesion**: the methods in the interface aren't truly related to one another from the client's perspective.

### Case Study: The Bloated Vending Machine
*Problem: We are building software for a vending machine company. We start with a machine that sells coffee, but the company expands to soda and snacks.*

**❌ Violating ISP (The "God" Interface):**
We create a single `VendingMachine` interface. As the company grows, we keep adding methods to it.

```python
from abc import ABC, abstractmethod

class VendingMachine(ABC):
    @abstractmethod
    def take_money(self): pass
    
    @abstractmethod
    def brew_coffee(self): pass
    
    @abstractmethod
    def dispense_soda(self): pass
    
    @abstractmethod
    def dispense_snack(self): pass

# The Implementation Nightmare
class SnackMachine(VendingMachine):
    def take_money(self):
        print("Taking coins...")
        
    def dispense_snack(self):
        print("Dispensing chips...")
        
    # VIOLATION: The Snack Machine is forced to implement these methods
    # even though it has no liquid tanks or brewing heaters.
    def brew_coffee(self):
        raise NotImplementedError("I am a snack machine! I cannot brew coffee.")

    def dispense_soda(self):
        # Empty method cluttering the code
        pass 
```
*Consequence:*
1.  **Fragility**: If we change the signature of `brew_coffee()`, we have to re-test and re-deploy the `SnackMachine` code, even though it doesn't brew coffee.
2.  **Confusion**: A client using `SnackMachine` sees `brew_coffee()` in the IDE autocomplete, leading to runtime errors if called.

**✅ Applying ISP (Segregation):**
We split the "Fat" interface into smaller, highly cohesive interfaces based on capabilities (Hot Beverages, Cold Beverages, Snacks).

```python
class CoinOp(ABC):
    @abstractmethod
    def take_money(self): pass

class HotBeverageMachine(ABC):
    @abstractmethod
    def brew_coffee(self): pass
    @abstractmethod
    def brew_tea(self): pass

class ColdBeverageMachine(ABC):
    @abstractmethod
    def dispense_soda(self): pass

class SnackMachineInterface(ABC):
    @abstractmethod
    def dispense_snack(self): pass

# Client 1: The dedicated Snack Machine
class SimpleSnackMachine(CoinOp, SnackMachineInterface):
    def take_money(self): print("Taking coins...")
    def dispense_snack(self): print("Dispensing chips...")
    # Clean! No coffee or soda methods here.

# Client 2: The "Uber" Machine
# If we have a machine that does EVERYTHING, we simply implement all interfaces.
class UberVendingMachine(CoinOp, HotBeverageMachine, ColdBeverageMachine, SnackMachineInterface):
    def take_money(self): ...
    def brew_coffee(self): ...
    def brew_tea(self): ...
    def dispense_soda(self): ...
    def dispense_snack(self): ...
```

### The Result
By segregating interfaces, we decouple the systems. Changes to the `HotBeverageMachine` interface (e.g., adding `brew_hot_chocolate`) will never affect the `SimpleSnackMachine`. We have achieved high cohesion and low coupling.


## 7. Design Pattern: The Observer Pattern

**"Defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified automatically."**

### The Core Concept: Loose Coupling
The Holy Grail of architecture is **Loose Coupling**: when two objects interact but know almost nothing about each other.
*   **Tight Coupling (Bad):** A Weather Station knows exactly which Display screens are attached to it. If you add a mobile phone app, you have to rewrite the Weather Station code.
*   **Loose Coupling (Good - Observer):** The Weather Station (Subject) knows only one thing: "I have a list of subscribers." It doesn't care if those subscribers are screens, loggers, or missiles.

### Case Study: The Weather Station
*Problem: We have a `WeatherData` object fetching sensor readings. We need to update three different displays: Current Conditions, Statistics, and Forecast.*

**❌ The Novice Approach (Tight Coupling):**
The developer hard-codes the updates into the data class.

```python
class WeatherData:
    def measurements_changed(self):
        temp = get_temperature()
        humidity = get_humidity()
        
        # VIOLATION: We are coding to concrete implementations.
        # If we add a new display, we must Modify this code (OCP Violation).
        # If we remove a display, we break this code.
        self.current_conditions_display.update(temp, humidity)
        self.statistics_display.update(temp, humidity)
        self.forecast_display.update(temp, humidity)
```
*Verdict:* **Trash.** This is a maintenance nightmare. The data object acts like a manager that micromanages every display.

**✅ The Observer Solution (Publish/Subscribe):**
We invert the power dynamic. The Displays (Observers) ask to join. The WeatherData (Subject) simply broadcasts.

1.  **The Abstractions:** Define the contract for communication.
2.  **The Subject:** Manages a list of generic subscribers.
3.  **The Observer:** Waits for the signal.

```python
from abc import ABC, abstractmethod

# 1. The Contract (Observer)
class Observer(ABC):
    @abstractmethod
    def update(self, temp: float, humidity: float, pressure: float) -> None: pass

# 2. The Subject (The Publisher)
class Subject:
    def __init__(self):
        self._observers: list[Observer] = []

    def register_observer(self, observer: Observer):
        self._observers.append(observer)

    def remove_observer(self, observer: Observer):
        self._observers.remove(observer)

    def notify_observers(self, temp: float, humidity: float, pressure: float):
        # The Subject doesn't care WHO these observers are.
        # It just knows they have an 'update' method.
        for observer in self._observers:
            observer.update(temp, humidity, pressure)

# 3. The Concrete Subject (The Data Owner)
class WeatherData(Subject):
    def set_measurements(self, temp: float, humidity: float, pressure: float):
        self.temp = temp
        self.humidity = humidity
        self.pressure = pressure
        # When data changes, blindly notify everyone.
        self.notify_observers(temp, humidity, pressure)

# 4. The Concrete Observers (The Consumers)
class CurrentConditionsDisplay(Observer):
    def update(self, temp, humidity, pressure):
        print(f"Current: {temp}F, {humidity}% humidity")

class StatisticsDisplay(Observer):
    def __init__(self):
        self.max_temp = 0.0
        self.min_temp = 200.0
        
    def update(self, temp, humidity, pressure):
        if temp > self.max_temp: self.max_temp = temp
        if temp < self.min_temp: self.min_temp = temp
        print(f"Stats: Max: {self.max_temp}F | Min: {self.min_temp}F")

# Usage
weather_data = WeatherData()
current_display = CurrentConditionsDisplay()
stats_display = StatisticsDisplay()

# Wiring it up (Runtime flexibility)
weather_data.register_observer(current_display)
weather_data.register_observer(stats_display)

# The Event Trigger
# Both displays update automatically. The WeatherData class never changed.
print("\n-- New Measurements --")
weather_data.set_measurements(80, 65, 30.4) 

print("\n-- New Measurements (Warmer) --")
weather_data.set_measurements(82, 70, 29.2)
```

### Why This Survives Production
1.  **Open/Closed Principle:** You can add a `PhoneAppDisplay` or a `LoggerObserver` without ever touching the `WeatherData` class. You just implement the `Observer` interface and register it.
2.  **Runtime Dynamism:** A display can "turn off" (unsubscribe) while the system is running without crashing the data feed.
3.  **Single Responsibility:** The `WeatherData` focuses on fetching data. The `Display` focuses on showing pixels. They interact only through a thin interface.



---

## 8. Design Pattern: The Decorator Pattern

**"Attaches additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality."**

### The Core Concept: Wrappers
Inheritance is static. Once you inherit, you are stuck with that behavior at compile time. The Decorator pattern allows you to **wrap** an object with new behaviors at runtime. It uses inheritance *only* to match the type, but uses **composition** to add the behavior.

### Case Study: The Coffee Shop Explosion
*Problem: We are building a billing system for a coffee shop. We have beverages (`DarkRoast`, `Espresso`) and condiments (`Milk`, `Soy`, `Mocha`, `Whip`). We need to calculate the total cost.*

#### Attempt 1: The Inheritance Explosion (Trash)
We create a class for every combination.
*   `DarkRoastWithMilk`
*   `DarkRoastWithMilkAndMocha`
*   `DarkRoastWithSoyAndWhipAndMocha`
*   *Verdict:* **Combinatorial Explosion.** If the price of milk changes, you have to edit 50 classes. If a new condiment is added, you need to create exponentially more classes.

#### Attempt 2: The Superclass Blob (Rigid)
We stuff the logic into the parent `Beverage` class using boolean flags.
```python
class Beverage:
    def cost(self):
        total = 0.0
        if self.has_milk: total += 0.50
        if self.has_whip: total += 0.10
        # ... and so on for every condiment
        return total
```
*Verdict:* **Fragile.**
1.  **Violation of OCP:** Adding "Caramel" requires opening and modifying the `Beverage` class.
2.  **Logic Limits:** Boolean flags cannot handle "Double Mocha" (True/False doesn't count quantity).
3.  **Inappropriate Inheritance:** An "Iced Tea" subclass inherits `has_whip`, which might not make sense.

### The Solution: The Decorator Pattern
We treat condiments as **Wrappers**.
*   A `Mocha` is a `Beverage` (Type Inheritance).
*   A `Mocha` *HAS-A* `Beverage` (Composition).

When we ask for the cost, the wrapper delegates the call to the wrapped object, adds its own cost, and returns the result.

### The Paradox: Why "IS-A" AND "HAS-A"?

You asked why a `Mocha` must be a `Beverage` (Inheritance) **AND** contain a `Beverage` (Composition).

It seems redundant. It isn't. It's structural necessity.

#### The "IS-A" Requirement (Polymorphism)
We use inheritance here **only for type matching**, not for behavior inheritance.
*   **The Constraint:** The client code (the code calling `.cost()`) expects a `Beverage`.
*   **The Trick:** By making `Mocha` inherit from `Beverage`, the `Mocha` object *disguises* itself. It allows us to pass a `Mocha` anywhere a `DarkRoast` could go.
*   **The Chain:** If `Mocha` was **not** a `Beverage`, you couldn't wrap a `Mocha` inside a `Whip`.
    *   `Whip` expects a `Beverage` in its constructor.
    *   If `Mocha` is just a `Condiment`, you can't put it inside `Whip`. The chain breaks.

#### The "HAS-A" Requirement (The Link)
We use composition to create the linked list (the onion layers).
*   `Mocha` holds a reference to whatever is inside it.
*   When you call `cost()`, `Mocha` does its math, but it **must** call the inner object's `cost()` to get the total. Without "HAS-A", it has no idea what it is decorating.

**Visualizing the Chain:**
`Whip (IS Beverage)` -> holds -> `Mocha (IS Beverage)` -> holds -> `DarkRoast (IS Beverage)`


```python
from abc import ABC, abstractmethod

# 1. The Component (Abstract Base)
class Beverage(ABC):
    @property
    @abstractmethod
    def description(self) -> str: pass
    
    @abstractmethod
    def cost(self) -> float: pass

# 2. The Concrete Component (The Base Object)
class DarkRoast(Beverage):
    @property
    def description(self): return "Dark Roast"
    
    def cost(self): return 0.99

class Espresso(Beverage):
    @property
    def description(self): return "Espresso"
    
    def cost(self): return 1.99

# 3. The Decorator (The Abstract Wrapper)
# It IS-A Beverage (so it can wrap others), but it requires a reference to a Beverage.
class CondimentDecorator(Beverage):
    def __init__(self, beverage: Beverage):
        self.beverage = beverage

# 4. Concrete Decorators (The Layers)
class Mocha(CondimentDecorator):
    @property
    def description(self):
        return self.beverage.description + ", Mocha"
        
    def cost(self):
        # Delegate to the wrapped object, then add self.
        return self.beverage.cost() + 0.20

class Whip(CondimentDecorator):
    @property
    def description(self):
        return self.beverage.description + ", Whip"
        
    def cost(self):
        return self.beverage.cost() + 0.10

# 5. Usage (Runtime Composition)
# Customer orders a Double Mocha Dark Roast with Whip
order = DarkRoast()             # cost: 0.99
order = Mocha(order)            # Wrap it. cost: 1.19
order = Mocha(order)            # Wrap it again. cost: 1.39
order = Whip(order)             # Wrap it. cost: 1.49

print(f"{order.description} ${order.cost():.2f}")
# Output: "Dark Roast, Mocha, Mocha, Whip $1.49"
```

### Your Challenge: "Why not just a List?"

You asked: *Wouldn't it be easier to have an Order class with a `List<Condiment>`, iterate over them, and sum the cost?*

**Verdict: For simple pricing, you are absolutely right.**

If the **only** problem you are solving is calculating a bill (A + B + C + D), the Decorator pattern is **overengineering**. A list is cleaner, easier to store in a database, and easier to serialize.

**HOWEVER**, the Decorator pattern is **not** about summing numbers. It is about **modifying behavior**.

#### Where the "List" Approach Fails
The "List" approach assumes that condiments are independent, additive values. But what if a decorator needs to **interact** with the result, not just add to it?

**Scenario: The "Employee Discount" Decorator**
Imagine we have a decorator that gives 20% off the *entire* drink.

**With Decorator:**
It's trivial. The decorator wraps the whole drink, gets the total cost, and multiplies it by 0.8.
```python
class EmployeeDiscount(CondimentDecorator):
    def cost(self):
        # I can modify the RESULT of the previous layers!
        return self.beverage.cost() * 0.80 
```

**With Your "List" Approach:**
You are stuck. The `Order` class iterates the list and sums them up: `base + milk + soy`.
To support a discount, you now have to:
1.  Open the `Order` class.
2.  Add specific logic for "Discounts" (which are different from "Condiments").
3.  Change the math formula.
**You have violated the Open-Closed Principle.** You had to modify the core logic to add a new feature.

#### The "Flow" Advantage
The Decorator shines when ordering matters or when data flows *through* the layers. Think about Input/Output streams (the classic Decorator example).

*   `BufferedInputStream(GZipInputStream(FileInputStream("data.txt")))`

1.  **File Stream**: Reads raw bytes.
2.  **GZip Stream**: Takes bytes, unzips them (Modifies data).
3.  **Buffered Stream**: Takes unzipped data, chunks it for performance (Modifies behavior).

You cannot do this with a "List of properties." You need a pipeline where Layer A processes the data and hands it to Layer B.

### Summary
1.  **Use a List** if you are just tallying a receipt (Simple addition).
2.  **Use Decorator** if the wrappers need to **transform**, **filter**, or **scale** the output of the object they are wrapping (Complex behavior modification).


### Why This is Bulletproof
1.  **Open/Closed Compliance:** New condiment? Create a `Caramel` class. No existing code is touched.
2.  **Runtime Flexibility:** You can stack decorators infinitely (Triple Mocha). You can mix and match dynamically.
3.  **Simplicity:** The `Beverage` class stays clean. It doesn't know about condiments. The `DarkRoast` class stays clean. It doesn't calculate condiment math.


---


## 9. Design Pattern: The Factory Method

**"Defines an interface for creating an object, but lets subclasses decide which class to instantiate."**

### The Core Concept: Deferring Instantiation
In standard programming, if you need an object, you instantiate it (`new Pizza()`).
*   **The Problem:** This binds your code to a concrete class. If you have a generic processing flow (Prepare $\to$ Bake $\to$ Box) that works for *all* pizzas, but the specific *type* of pizza changes based on location or configuration, direct instantiation breaks your design.
*   **The Solution:** The **Factory Method** lets the parent class define the *process*, but forces the subclasses to define the *product*.

### Case Study: The Pizza Franchise War
*Problem: We have a `PizzaStore`. The process of ordering is always the same: `prepare()`, `bake()`, `cut()`, `box()`. However, we are expanding. We have a NY Store (Thin Crust, Marinara) and a Chicago Store (Deep Dish, Plum Tomato).*

#### Attempt 1: The Parameter Hell (Trash)
We try to handle this in one `PizzaStore` class with flags.
```python
class PizzaStore:
    def order_pizza(self, style: str, type: str):
        pizza = None
        # The combinatorial explosion begins...
        if style == "NY":
            if type == "cheese": pizza = NYCheesePizza()
            elif type == "veggie": pizza = NYVeggiePizza()
        elif style == "Chicago":
            if type == "cheese": pizza = ChicagoDeepDish()
            # ... limitless if/else statements
        
        # The rigid process
        pizza.prepare()
        pizza.bake()
        pizza.cut()
        pizza.box()
        return pizza
```
*Verdict:* **Unmaintainable.** The `PizzaStore` class knows too much. It is coupled to every single concrete pizza class in existence. Adding "California Style" requires editing this file and risking bugs in the NY logic.

#### The Solution: The Factory Method
We declare `create_pizza` as an abstract method in the `PizzaStore`. The `PizzaStore` *uses* the pizza, but it doesn't know *which* pizza it is using.

1.  **The Creator (Abstract):** Defines the workflow (`order_pizza`) and the abstract factory method (`create_pizza`).
2.  **The Concrete Creators:** Implement the factory method to return specific products.

```python
from abc import ABC, abstractmethod

# 1. The Product (Abstract)
class Pizza(ABC):
    def __init__(self):
        self.name = "Unknown Pizza"

    def prepare(self): print(f"Preparing {self.name}...")
    def bake(self): print(f"Baking {self.name}...")
    def cut(self): print(f"Cutting {self.name}...")
    def box(self): print(f"Boxing {self.name}...")

# 2. The Creator (Abstract)
class PizzaStore(ABC):
    # This is the High-Level Policy. It defines the algorithm.
    # It CANNOT be changed just because we add a new region.
    def order_pizza(self, type: str) -> Pizza:
        # MAGIC: We call a method that doesn't exist yet!
        # We rely on the subclass to fill in this blank.
        pizza = self.create_pizza(type)
        
        pizza.prepare()
        pizza.bake()
        pizza.cut()
        pizza.box()
        return pizza

    # THE FACTORY METHOD
    @abstractmethod
    def create_pizza(self, type: str) -> Pizza: 
        pass

# 3. The Concrete Creators
class NYPizzaStore(PizzaStore):
    # NY Store knows how to make NY Pizzas.
    def create_pizza(self, type: str) -> Pizza:
        if type == "cheese": 
            return NYStyleCheesePizza()
        elif type == "veggie": 
            return NYStyleVeggiePizza()
        return None

class ChicagoPizzaStore(PizzaStore):
    # Chicago Store knows how to make Chicago Pizzas.
    def create_pizza(self, type: str) -> Pizza:
        if type == "cheese": 
            return ChicagoStyleCheesePizza()
        elif type == "veggie": 
            return ChicagoStyleVeggiePizza()
        return None

# 4. Usage
# Client wants a pizza. They pick a store.
ny_store = NYPizzaStore()
chicago_store = ChicagoPizzaStore()

# The process is identical, the result is different.
pizza1 = ny_store.order_pizza("cheese")       # Gets Thin Crust
pizza2 = chicago_store.order_pizza("cheese")  # Gets Deep Dish
```

### Why This is Bulletproof
1.  **Decoupling:** The `PizzaStore` superclass (the framework) has zero dependencies on `NYStyleCheesePizza`. It only depends on the `Pizza` abstraction.
2.  **Consistency:** The `order_pizza` method enforces the standard quality control (Prepare -> Bake -> Cut -> Box) for *every* franchise. A rogue Chicago store cannot decide to skip the "Bake" step.
3.  **Extensibility:** Want to add a `CaliforniaPizzaStore`? Just extend `PizzaStore`. You don't touch the existing logic.

### Critical Distinction: Simple Factory vs. Factory Method
*   **Simple Factory (Section 1):** A helper class that hides instantiation logic. Good for one-off decoupling.
*   **Factory Method (Section 9):** A pattern that uses **Inheritance**. The client code (`order_pizza`) is defined in the superclass, but the instantiation (`create_pizza`) is deferred to the subclass. Use this when you have a standard process that requires variant products.


---


## 10. Core Architectural Principles

1.  **Strive for Low Coupling**: Modules and classes should be independent. A change in one should not break others.
2.  **Strive for High Cohesion**: Each module or class must have a single, well-defined purpose.
3.  **Depend on Abstractions, Not Concretions**: High-level logic should not depend on low-level details (e.g., a specific database). Depend on abstract interfaces instead.

### The SOLID Principles
1.  **S - Single Responsibility Principle**: A class or function should have only one reason to change.
2.  **O - Open-Closed Principle**: Open for extension, but closed for modification.
3.  **L - Liskov Substitution Principle**: A subclass must be substitutable for its parent class.
4.  **I - Interface Segregation Principle**: Clients should not depend on methods they don't use.
5.  **D - Dependency Inversion Principle**: Depend on abstractions, not on concrete implementations.

---

## 11. Rules for Functions

**Golden Rule**: A function must do exactly one thing, do it well, and do it only.

### Function Size
*   **Constraint**: Functions should be very small.
*   **Ideal**: 4 to 5 lines.
*   **Acceptable**: Under 10 lines.
*   **Too Big**: 10+ lines.
*   **The "One Thing" Test**: If you can extract another function from your function, the original was doing more than one thing. Large functions often hide classes waiting to be discovered.

### Arguments
Arguments are liabilities, not assets.
*   **0 Arguments**: Ideal.
*   **1-2 Arguments**: Acceptable.
*   **3 Arguments**: Avoid. If three variables are cohesive enough to pass together, they should likely be coupled into an object (Data Class).
*   **>3 Arguments**: Indicates a design flaw.

### Flags and Conditionals
*   **No Boolean Flags**: Passing a boolean (`True`/`False`) means the function does two things. Write two separate functions instead.
*   **Avoid `None` as a Flag**: Do not change core behavior based on whether an argument is `None`. This creates hidden logic paths.

---

## 12. Rules for Classes and Data

### Class Design
From the outside, a class is a "bag of functions" with no observable state.
*   **Cohesion**: The more variables a method manipulates within a class, the more cohesive it is.
*   **Hide Implementation**: Do not expose internal state unnecessarily.

### The Problem with Getters and Setters
*   **Tell, Don't Ask**: If you make variables private but expose them via standard getters/setters, you violate encapsulation.
*   **Abstract the Data**: If you must retrieve data, abstract the information.
    *   ❌ **Bad**: `getGallonsOfGas()` (Exposes implementation detail).
    *   ✅ **Good**: `getPercentFuelRemaining()` (Polymorphic; works for Gas, Diesel, and Electric cars).

### Naming Conventions (PEP 8)
*   **Communicate Intent**: Names must reveal purpose. If a name needs a comment, rename it.
*   **Classes**: `CapWords` (Nouns describing the entity).
*   **Functions**: `snake_case` (Verbs describing an action).
*   **Variables**: `snake_case` (Nouns).
*   **Constants**: `ALL_CAPS_SNAKE_CASE`.
*   **Booleans**: Prefix with `is_` or `has_`.

---


## 13. Pythonic Implementation

Leverage Python's strengths for concise, readable, and expressive code.

### Expressive Features
*   **List Comprehensions**: Use for clear, efficient transformations and filtering.
*   **Data Libraries**: Prefer **NumPy** or **Pandas** for numerical/tabular data. Vectorized operations are more performant and expressive than manual loops.

### Commenting and Formatting
*   **Code is the Truth**: Code must be clear enough to require no comments. Comments should explain *why*, never *what*.
*   **No Commented-Out Code**: Delete it. Use version control for history.
*   **Automate**: Use tools like **Black** or **Ruff** to enforce consistent formatting.

### Few-Shot Example: Pythonic Quicksort
This example demonstrates small, single-responsibility functions and expressive list comprehensions.

```python
def partition(seq):
    """Partitions a sequence around a pivot element."""
    pi, seq = seq[0], seq[1:]                   # Pick and remove the pivot
    lo = [x for x in seq if x <= pi]            # All the small elements
    hi = [x for x in seq if x > pi]             # All the large ones
    return lo, pi, hi                           # pi is "in the right place"

def quicksort(seq):
    """Sorts a sequence using the quicksort algorithm."""
    if len(seq) <= 1: return seq                # Base case
    lo, pi, hi = partition(seq)                 # pi is in its place
    return quicksort(lo) + [pi] + quicksort(hi) # Sort lo and hi separately
```


# Practical Development Notes

## File Encoding

**Always use UTF-8 encoding** when working with files in this project. Since we're working with both Hebrew (עברית) and English text, UTF-8 is essential to prevent character corruption and ensure proper display of all characters.


---

# 14. The Standard of Review (Meta-Instructions)

**Mandate for AI Assistants and Human Reviewers:**
When using this document to review code or suggest solutions, adopt the persona of a **Lead Software Architect**. Your goal is not to be polite; your goal is to ensure the software survives production.

### The "Ruthless Mentor" Protocol
*   **No Sugarcoating**: Do not praise code for simply "working." If a solution works but violates the principles of low coupling or high cohesion, reject it immediately.
*   **Stress-Test Everything**: Do not assume the "Happy Path." Ask: *What happens if the database is slow? What if this argument is Null? What if we need to add a new type of customer next week?*
*   **Identify Weakness**: If an idea is weak, explicitly label it as a technical debt risk and explain the specific principle it violates.

### The Overengineering Trap (The Sanity Check)
The patterns in this document (Strategy, Factory, etc.) are powerful, but they introduce complexity. **Complexity is a cost.**
*   **Apply the "YAGNI" Filter** (You Ain't Gonna Need It): If a simple `if/else` statement suffices and the requirement is unlikely to change, **do not** force a Design Pattern.
*   **Challenge Complexity**: If a proposed solution involves multiple abstract base classes for a simple problem, call it out as overengineered "trash" and suggest the simplest possible implementation that is still clean.

**Conclusion**: Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.