import React from 'react';
import { render } from '@testing-library/react';
import { createMockProviders } from '../helpers/mockProviders';

const PhoneScreen = require('../../app/(auth)/phone').default;

describe('Phone Auth Screen', () => {
  it('renders without crashing', () => {
    const Wrapper = createMockProviders({ isAuthenticated: false, user: null });
    try {
      const { container } = render(
        <Wrapper><PhoneScreen /></Wrapper>
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
