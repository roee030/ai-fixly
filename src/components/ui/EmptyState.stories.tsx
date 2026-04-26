import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'UI / EmptyState',
  component: EmptyState,
  argTypes: {
    variant: { control: 'select', options: ['waiting', 'empty', 'error', 'offline'] },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    actionLabel: { control: 'text' },
    onAction: { action: 'action' },
  },
  args: {
    variant: 'empty',
    title: 'אין כאן עדיין כלום',
    subtitle: 'כשיהיה משהו, זה יופיע כאן.',
  },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

/**
 * The four variants exist to make the screen tell the user *why* it's
 * empty: "we're waiting" vs "we couldn't load" vs "you have no data".
 */
export const Waiting: Story = {
  args: {
    variant: 'waiting',
    title: 'ממתינים שבעלי המקצוע יענו',
    subtitle: 'הצעות מגיעות בדרך כלל תוך 5 דקות. נשלח התראה.',
  },
};

export const Empty: Story = {
  args: {
    variant: 'empty',
    title: 'אין לך קריאות עדיין',
    subtitle: 'דווח על תקלה ראשונה ונמצא לך בעלי מקצוע.',
    actionLabel: 'דווח על תקלה',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'משהו השתבש',
    subtitle: 'לא הצלחנו לטעון את הרשימה. נסה שוב.',
    actionLabel: 'נסה שוב',
  },
};

export const Offline: Story = {
  args: {
    variant: 'offline',
    title: 'אין חיבור לאינטרנט',
    subtitle: 'נחזור לעדכן ברגע שתחזור לרשת.',
  },
};

/** A title-only EmptyState — no subtitle, no action. The minimal form. */
export const Minimal: Story = {
  args: {
    variant: 'waiting',
    title: 'טוען...',
    subtitle: undefined,
    actionLabel: undefined,
  },
};
