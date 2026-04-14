/**
 * Screen render test: Request Details (/request/[id])
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createMockProviders } from '../helpers/mockProviders';
import { mockBids } from '../helpers/mockData';

// Override useLocalSearchParams for this screen
const routerModule = require('expo-router');
routerModule.useLocalSearchParams.mockReturnValue({ id: 'req-open-001' });

// Mock services
jest.mock('../../src/services/requests', () => ({
  requestService: {
    onRequestChanged: jest.fn((id, cb) => {
      const { mockRequestOpen } = require('../helpers/mockData');
      cb(mockRequestOpen);
      return jest.fn();
    }),
    updateStatus: jest.fn(() => Promise.resolve()),
    getUserRequests: jest.fn(() => Promise.resolve([])),
    onUserRequestsChanged: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../src/services/bids', () => ({
  bidService: {
    onBidsChanged: jest.fn((id, cb) => {
      const { mockBids } = require('../helpers/mockData');
      cb(mockBids);
      return jest.fn();
    }),
    selectBid: jest.fn(() => Promise.resolve()),
    getBidsForRequest: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('../../src/services/chat', () => ({
  chatService: { clearMessages: jest.fn(() => Promise.resolve()) },
  monitorAndUpdateStatus: jest.fn(),
}));

jest.mock('../../src/services/broadcast', () => ({
  notifyProviderSelected: jest.fn(() => Promise.resolve()),
}));

const RequestDetailsScreen = require('../../app/request/[id]').default;

describe('Request Details Screen', () => {
  it('renders without crashing', () => {
    const Wrapper = createMockProviders();
    const { container } = render(
      <Wrapper><RequestDetailsScreen /></Wrapper>
    );
    expect(container).toBeTruthy();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
