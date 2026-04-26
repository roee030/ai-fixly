import React from 'react';
import { View } from 'react-native';
import type { Preview } from '@storybook/react-vite';

/**
 * Global decorator for every story. Wraps each component in a dark
 * canvas so the visuals match the actual app (which is dark-themed).
 */
const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'fixly-dark',
      values: [
        { name: 'fixly-dark', value: '#0F0F1A' },
        { name: 'paper', value: '#FBFAF7' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
    // RTL by default — the app is Hebrew-first, so most components are
    // designed and reviewed in RTL. Toggle per-story via parameters.
    direction: 'rtl',
  },

  decorators: [
    (Story) => (
      <View
        style={{
          padding: 24,
          backgroundColor: '#0F0F1A',
          minWidth: 320,
          minHeight: 200,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Story />
      </View>
    ),
  ],
};

export default preview;
