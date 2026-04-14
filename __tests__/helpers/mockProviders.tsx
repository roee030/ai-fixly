/**
 * Shared test wrapper that provides ALL the context a screen needs to render.
 *
 * Usage in tests:
 *   render(<HomeScreen />, { wrapper: createMockProviders() });
 *
 * This is the SINGLE wrapper used by every screen test. If a screen needs
 * specific mock state (e.g., "user has 3 requests"), override via the
 * options parameter — don't create per-screen wrappers.
 */

import React from 'react';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAppStore } from '../../src/stores/useAppStore';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { mockUser, mockRequestOpen, mockBids } from './mockData';

/**
 * Options to customize mock state per test.
 * Defaults produce a "fully onboarded, signed-in user with one open request".
 */
export interface MockProviderOptions {
  /** null = not signed in */
  user?: typeof mockUser | null;
  isAuthenticated?: boolean;
  hasCompletedProfile?: boolean;
  hasSeenOnboarding?: boolean;
  hasCompletedPermissions?: boolean;
  /** Pre-loaded requests for the requests store */
  requests?: typeof mockRequestOpen[];
  /** Bid counts per request ID */
  bidCounts?: Record<string, number>;
}

const DEFAULTS: Required<MockProviderOptions> = {
  user: mockUser,
  isAuthenticated: true,
  hasCompletedProfile: true,
  hasSeenOnboarding: true,
  hasCompletedPermissions: true,
  requests: [mockRequestOpen],
  bidCounts: { [mockRequestOpen.id]: mockBids.length },
};

/**
 * Reset ALL Zustand stores to a clean state. Call this in beforeEach
 * or in jest.setup.js to prevent test pollution.
 */
export function resetAllStores(): void {
  useAuthStore.setState({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    hasCompletedProfile: false,
  });
  useAppStore.setState({
    hasSeenOnboarding: false,
    hasCompletedPermissions: false,
  });
  useRequestsStore.setState({
    requests: [],
    bidCounts: {},
    unreadBaseline: {},
    isInitialized: false,
  });
}

/**
 * Hydrate Zustand stores with mock state. Called by the wrapper component
 * before rendering children.
 */
function hydrateMockStores(opts: Required<MockProviderOptions>): void {
  useAuthStore.setState({
    user: opts.user,
    isLoading: false,
    isAuthenticated: opts.isAuthenticated,
    hasCompletedProfile: opts.hasCompletedProfile,
  });
  useAppStore.setState({
    hasSeenOnboarding: opts.hasSeenOnboarding,
    hasCompletedPermissions: opts.hasCompletedPermissions,
  });
  useRequestsStore.setState({
    requests: opts.requests,
    bidCounts: opts.bidCounts,
    unreadBaseline: {},
    isInitialized: true,
  });
}

/**
 * Create a React wrapper component that provides all necessary context
 * for rendering any screen in isolation.
 *
 * Usage:
 *   const wrapper = createMockProviders({ user: null }); // not signed in
 *   render(<PhoneScreen />, { wrapper });
 */
export function createMockProviders(overrides: MockProviderOptions = {}) {
  const opts = { ...DEFAULTS, ...overrides };

  return function MockProviders({ children }: { children: React.ReactNode }) {
    // Hydrate stores synchronously before first render
    React.useMemo(() => hydrateMockStores(opts), []);

    // SafeAreaProvider is mocked globally in jest.setup.js — no need to
    // import it here. Just render children directly.
    return <>{children}</>;
  };
}

/**
 * Default wrapper for most tests (signed-in user, fully onboarded).
 * For tests that need custom state, use createMockProviders({ ... }) instead.
 */
export const defaultWrapper = createMockProviders();
