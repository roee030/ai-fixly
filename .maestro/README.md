# Maestro E2E flows

End-to-end tests for the customer-side happy path. These run against a
**real** running app (Expo dev build, EAS internal build, or production)
and exercise the full stack — UI → broker → Firestore → push.

## Why Maestro

Cheap, declarative YAML. No JavaScript test runner to maintain, no
appium-style native bridges. The whole suite for our happy path is a few
hundred lines and can be run from CI with one binary.

## Install (Windows / macOS / Linux)

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (PowerShell, after WSL):
# Run the same command inside a WSL shell.

# Verify
maestro --version
```

## Run a flow

```bash
# Against an emulator with the app installed:
maestro test .maestro/01-onboarding.yaml

# Run the whole suite:
maestro test .maestro/

# With verbose output (useful when debugging):
maestro test .maestro/01-onboarding.yaml --debug-output debug-logs
```

## What's covered today

| File | Purpose |
|------|---------|
| `01-onboarding.yaml` | First launch → swipe through 3 onboarding slides → finish |
| `02-customer-create-request.yaml` | Tap home camera → pick gallery → describe → confirm AI summary → arrive at "sent" |
| `03-customer-view-bids.yaml` | Open My Requests → tap an in-flight request → see bid list / empty state |
| `04-language-switch.yaml` | Profile → switch language → verify Hebrew↔English flip persists |

## Why these four

The "money" flow is `01 → 02 → 03` — if that breaks, the customer can't
report a problem or compare offers. `04` is the smoke test for the i18n
plumbing we ship in every release.

## What's NOT covered (yet)

- Provider-side WhatsApp loop (it's external — Twilio sandbox required)
- Push notification arrival (FCM testing needs a real device)
- Admin dashboard (low traffic, manual QA is fine)
- Account deletion (destructive — easier as integration test)

Add a flow when a regression in any of those lands in production. Don't
build coverage for its own sake.

## CI integration

`eas-build-profile.dev` produces an internal-distribution APK on every
PR. Add a CI step:

```yaml
- name: Maestro E2E
  run: |
    curl -Ls "https://get.maestro.mobile.dev" | bash
    export PATH="$PATH:$HOME/.maestro/bin"
    maestro test .maestro/
```

The flows use `appId: com.aifixly.app` (Android) / `co.fixly.ai` (iOS) —
match this to your build's bundle id.
