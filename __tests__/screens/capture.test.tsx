import React from 'react';
import { render } from '@testing-library/react';
import { createMockProviders } from '../helpers/mockProviders';

// In jsdom, Platform.OS is 'web', so the capture screen tries to require WebUploadZone.web
jest.mock('../../src/components/web/WebUploadZone.web', () => ({
  WebUploadZone: () => 'MockUploadZone',
}));

const CaptureScreen = require('../../app/capture/index').default;

describe('Capture Screen', () => {
  it('renders without crashing', () => {
    const Wrapper = createMockProviders();
    try {
      const { container } = render(
        <Wrapper><CaptureScreen /></Wrapper>
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
