import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RequestCardSkeleton, RequestListSkeleton } from './RequestCardSkeleton';

const meta: Meta<typeof RequestCardSkeleton> = {
  title: 'UI / RequestCardSkeleton',
  component: RequestCardSkeleton,
};
export default meta;

type Story = StoryObj<typeof RequestCardSkeleton>;

/** A single placeholder card — what My Requests shows for ~200ms on load. */
export const Single: Story = {
  render: () => (
    <View style={{ width: 360 }}>
      <RequestCardSkeleton />
    </View>
  ),
};

/** The full list — what the user actually sees while requests load. */
export const List: Story = {
  render: () => (
    <View style={{ width: 360 }}>
      <RequestListSkeleton />
    </View>
  ),
};
