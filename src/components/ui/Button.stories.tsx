import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI / Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    title: { control: 'text' },
    onPress: { action: 'pressed' },
  },
  args: {
    title: 'שלח לבעלי מקצוע',
    variant: 'primary',
    isLoading: false,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

/** Default primary button — the main CTA used everywhere. */
export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary', title: 'אפשר אחר כך' } };

export const Ghost: Story = { args: { variant: 'ghost', title: 'בטל בקשה' } };

export const Loading: Story = { args: { isLoading: true } };

export const Disabled: Story = { args: { disabled: true, title: 'מלא את הפרטים קודם' } };

/** All five visual states stacked — quick visual diff during refactors. */
export const Gallery: Story = {
  render: () => (
    <View style={{ gap: 12, width: 280 }}>
      <Button title="ראשי" onPress={() => {}} />
      <Button title="משני" onPress={() => {}} variant="secondary" />
      <Button title="רוח" onPress={() => {}} variant="ghost" />
      <Button title="טוען" onPress={() => {}} isLoading />
      <Button title="חסום" onPress={() => {}} disabled />
    </View>
  ),
};
