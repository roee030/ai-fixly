import React from 'react';
import { render } from '@testing-library/react';
import { createMockProviders } from '../helpers/mockProviders';

// Override useLocalSearchParams to return requestId
const routerModule = require('expo-router');
routerModule.useLocalSearchParams.mockReturnValue({ requestId: 'mock-req-id' });

// Mock chat service
jest.mock('../../src/services/chat', () => ({
  chatService: {
    onNewMessages: jest.fn(() => jest.fn()),
    sendMessage: jest.fn(() => Promise.resolve()),
    clearMessages: jest.fn(() => Promise.resolve()),
  },
  monitorAndUpdateStatus: jest.fn(),
  detectStatusChange: jest.fn(),
}));

// Mock request service for fetching request details in chat
jest.mock('../../src/services/requests', () => ({
  requestService: {
    onRequestChanged: jest.fn((id, cb) => {
      const { mockRequestInProgress } = require('../helpers/mockData');
      cb(mockRequestInProgress);
      return jest.fn();
    }),
    getUserRequests: jest.fn(() => Promise.resolve([])),
    onUserRequestsChanged: jest.fn(() => jest.fn()),
  },
}));

// Mock broadcast service
jest.mock('../../src/services/broadcast', () => ({
  broadcastToProviders: jest.fn(() => Promise.resolve()),
  notifyProviderSelected: jest.fn(() => Promise.resolve()),
  forwardChatMessage: jest.fn(() => Promise.resolve()),
}));

const ChatScreen = require('../../app/chat/[requestId]').default;

describe('Chat Screen', () => {
  beforeEach(() => {
    routerModule.useLocalSearchParams.mockReturnValue({ requestId: 'mock-req-id' });
  });

  it('renders without crashing', () => {
    const Wrapper = createMockProviders();
    try {
      const { container } = render(
        <Wrapper><ChatScreen /></Wrapper>
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
