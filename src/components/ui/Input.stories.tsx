import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI / Input',
  component: Input,
  args: {
    label: 'מספר טלפון',
    placeholder: '050-1234567',
  },
};
export default meta;

type Story = StoryObj<typeof Input>;

/** A controlled wrapper so each story has its own state (Storybook
 * doesn't otherwise re-render between text changes). */
function Controlled(props: any) {
  const [value, setValue] = useState(props.value ?? '');
  return <Input {...props} value={value} onChangeText={setValue} />;
}

export const Empty: Story = {
  render: (args) => (
    <View style={{ width: 320 }}>
      <Controlled {...args} />
    </View>
  ),
};

export const WithError: Story = {
  args: { error: 'מספר טלפון לא תקין', value: '050' },
  render: (args) => (
    <View style={{ width: 320 }}>
      <Controlled {...args} />
    </View>
  ),
};

export const Multiline: Story = {
  args: { label: 'תאר את הבעיה', multiline: true, placeholder: 'נזילה במטבח, התחילה הבוקר...' },
  render: (args) => (
    <View style={{ width: 320 }}>
      <Controlled {...args} />
    </View>
  ),
};
