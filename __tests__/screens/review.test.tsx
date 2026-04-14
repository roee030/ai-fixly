import React from 'react';
import { render } from '@testing-library/react';
import { createMockProviders } from '../helpers/mockProviders';

// Override useLocalSearchParams to return requestId
const routerModule = require('expo-router');
routerModule.useLocalSearchParams.mockReturnValue({ requestId: 'mock-req-id' });

// Mock review service
jest.mock('../../src/services/reviews', () => ({
  reviewService: {
    hasReviewForRequest: jest.fn(() => Promise.resolve(false)),
    submitReview: jest.fn(() => Promise.resolve()),
  },
  REVIEW_CATEGORIES: [
    { key: 'punctuality', labelHe: 'דייקנות', icon: 'time-outline' },
    { key: 'quality', labelHe: 'איכות', icon: 'star-outline' },
    { key: 'price', labelHe: 'מחיר', icon: 'cash-outline' },
  ],
}));

// Mock request service for fetching request details
jest.mock('../../src/services/requests', () => ({
  requestService: {
    onRequestChanged: jest.fn((id, cb) => {
      const { mockRequestInProgress } = require('../helpers/mockData');
      cb({
        ...mockRequestInProgress,
        selectedProviderName: 'יוסי האינסטלטור',
        selectedProviderPhone: '+972521234567',
      });
      return jest.fn();
    }),
    getUserRequests: jest.fn(() => Promise.resolve([])),
    onUserRequestsChanged: jest.fn(() => jest.fn()),
  },
}));

const ReviewScreen = require('../../app/review/[requestId]').default;

describe('Review Screen', () => {
  beforeEach(() => {
    routerModule.useLocalSearchParams.mockReturnValue({ requestId: 'mock-req-id' });
  });

  it('renders without crashing', () => {
    const Wrapper = createMockProviders();
    try {
      const { container } = render(
        <Wrapper><ReviewScreen /></Wrapper>
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
