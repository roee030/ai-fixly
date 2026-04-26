import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI / Skeleton',
  component: Skeleton,
  argTypes: {
    width: { control: 'text' },
    height: { control: 'number' },
    borderRadius: { control: 'number' },
  },
  args: {
    width: 280,
    height: 80,
    borderRadius: 14,
  },
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const SingleCard: Story = {};

export const Avatar: Story = {
  args: { width: 64, height: 64, borderRadius: 32 },
};

export const TextLine: Story = {
  args: { width: 240, height: 14, borderRadius: 6 },
};

/**
 * A "fake bid card" skeleton — what the user sees on Request Details
 * while the live Firestore subscription is still attaching.
 */
export const BidCardStack: Story = {
  render: () => (
    <View style={{ gap: 8, width: 320 }}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} width="100%" height={88} borderRadius={14} />
      ))}
    </View>
  ),
};

/**
 * "Profile row" — circular avatar + two text lines. Used by the
 * provider dashboard while it's waiting for the profile fetch.
 */
export const ProfileRow: Story = {
  render: () => (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        width: 320,
      }}
    >
      <Skeleton width={56} height={56} borderRadius={28} />
      <View style={{ gap: 6, flex: 1 }}>
        <Skeleton width="70%" height={16} borderRadius={6} />
        <Skeleton width="40%" height={12} borderRadius={4} />
      </View>
    </View>
  ),
};
