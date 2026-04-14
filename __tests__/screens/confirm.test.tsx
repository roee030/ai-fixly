import React from 'react';
import { render } from '@testing-library/react';
import { createMockProviders } from '../helpers/mockProviders';

// Override useLocalSearchParams to return confirm screen params
const routerModule = require('expo-router');
routerModule.useLocalSearchParams.mockReturnValue({
  images: '[]',
  base64Images: '[]',
  description: 'test description',
});

// Mock services used by confirm screen
jest.mock('../../src/services/ai', () => ({
  aiAnalysisService: {
    analyzeMedia: jest.fn(() => Promise.resolve({
      professions: ['plumber'],
      professionLabelsHe: ['אינסטלטור'],
      shortSummary: 'נזילה מתחת לכיור',
      problemId: 'leaking_faucet',
      urgency: 'normal',
    })),
  },
}));

jest.mock('../../src/services/media', () => ({
  mediaService: {
    uploadImages: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('../../src/services/requests', () => ({
  requestService: {
    createRequest: jest.fn(() => Promise.resolve('mock-req-id')),
    getUserRequests: jest.fn(() => Promise.resolve([])),
    onUserRequestsChanged: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../src/services/broadcast', () => ({
  broadcastToProviders: jest.fn(() => Promise.resolve()),
  notifyProviderSelected: jest.fn(() => Promise.resolve()),
  forwardChatMessage: jest.fn(() => Promise.resolve()),
}));

const ConfirmScreen = require('../../app/capture/confirm').default;

describe('Confirm Screen', () => {
  beforeEach(() => {
    routerModule.useLocalSearchParams.mockReturnValue({
      images: '[]',
      base64Images: '[]',
      description: 'test description',
    });
  });

  it('renders without crashing', () => {
    const Wrapper = createMockProviders();
    try {
      const { container } = render(
        <Wrapper><ConfirmScreen /></Wrapper>
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
