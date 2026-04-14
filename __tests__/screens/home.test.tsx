import React from 'react';
import { render } from '@testing-library/react';
import { createMockProviders } from '../helpers/mockProviders';

const HomeScreen = require('../../app/(tabs)/index').default;

describe('Home Screen', () => {
  it('renders without crashing', () => {
    const Wrapper = createMockProviders();
    try {
      const { container } = render(
        <Wrapper><HomeScreen /></Wrapper>
      );
      expect(container).toBeTruthy();
    } catch (e: any) {
      // React 19 wraps errors in AggregateError — expose the real cause
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
