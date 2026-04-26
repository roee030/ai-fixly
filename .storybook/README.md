# Storybook

Visual playground for the UI primitives in `src/components/**`. Runs as a
local web server via `react-native-web`, so no Expo dev build or simulator
is required.

## Run

```bash
npm run storybook        # dev server on http://localhost:6006
npm run build-storybook  # static build to ./storybook-static/
```

## Where stories live

Stories live next to the component they document:

```
src/components/ui/
  Button.tsx
  Button.stories.tsx        ← shows Primary / Secondary / Ghost / Loading / Disabled
  EmptyState.tsx
  EmptyState.stories.tsx
  Skeleton.tsx
  Skeleton.stories.tsx
  ...
```

That keeps the story authoring loop tight: edit the component, edit its
story, see both update on the same hot-reload.

## What is in scope

**In scope:** UI primitives — Button, Input, EmptyState, Skeleton,
RequestCardSkeleton, FadeInView, etc. These render with no Firebase, no
Twilio, no router, no native modules.

**Out of scope:** full screens (Home, Capture, RequestDetails, …) —
they pull in the auth store, Firestore listeners, navigation params.
For screen-level browsing use the in-app dev gallery
(`Profile → Dev tools → Screen gallery`).

## How the bundling works

We use `@storybook/react-native-web-vite` so React Native components
(`<View>`, `<Pressable>`, `<Text>`, etc.) compile to their
`react-native-web` equivalents. The setup ships three things in
`.storybook/`:

| File | Purpose |
|------|---------|
| `main.ts` | Storybook config: where stories live, framework, Vite aliases |
| `preview.tsx` | Global decorator + canvas (dark Fixly background, RTL by default) |
| `mocks/reanimated.tsx` | Reanimated stub — Vite can't run the babel plugin |
| `mocks/empty.ts` | No-op for native-only modules (Sentry RN, FCM) |

If a UI primitive imports something that pulls in a native module, add
the import path to the alias map in `main.ts → viteFinal.alias`.

## When to add a story

Whenever you add a UI primitive that has more than one visible state
(loading, error, empty, etc) write a story per state. The story
doubles as the visual spec — designers and reviewers can see "what
this looks like in error mode" without running the app.

A typical story file:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'UI / MyComponent',
  component: MyComponent,
  args: { /* defaults */ },
};
export default meta;

type Story = StoryObj<typeof MyComponent>;
export const Default: Story = {};
export const Loading: Story = { args: { isLoading: true } };
```
