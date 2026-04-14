import React from 'react';
import { render } from '@testing-library/react';
import { createMockProviders } from '../helpers/mockProviders';

// Mock react-i18next for this screen (uses useTranslation hook)
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'he', changeLanguage: jest.fn(() => Promise.resolve()) },
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  Trans: ({ children }: any) => children,
}));

const PermissionsScreen = require('../../app/(auth)/permissions').default;

describe('Permissions Screen', () => {
  it('renders without crashing', () => {
    const Wrapper = createMockProviders({ hasCompletedPermissions: false });
    try {
      const { container } = render(
        <Wrapper><PermissionsScreen /></Wrapper>
      );
      expect(container).toBeTruthy();
      expect(container.innerHTML.length).toBeGreaterThan(0);
    } catch (e: any) {
      if (e.errors) {
        console.error('=== Underlying render errors ===');
        e.errors.forEach((err: any, i: number) => {
          console.error(`Error ${i}:`, err.message);
          console.error(err.stack?.split('\n').slice(0, 5).join('\n'));
        });
      }
      throw e;
    }
  });
});
