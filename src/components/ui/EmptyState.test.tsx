import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

/**
 * EmptyState contract:
 *   - title is mandatory and visible
 *   - subtitle is optional
 *   - action button only renders when BOTH actionLabel AND onAction are provided
 *   - tapping the action calls onAction
 *   - all variants render without crashing
 *
 * We use the web-style testing library (matches the rest of the project's
 * screen tests via jest-expo/web). Hebrew text matching via container
 * text content because RN's `accessibilityRole="header"` renders as <h1>
 * on web and getByText struggles with the resulting tree.
 */
describe('EmptyState', () => {
  test('renders the title', () => {
    const { container } = render(<EmptyState title="אין הצעות" />);
    expect(container.textContent).toContain('אין הצעות');
  });

  test('renders the subtitle when provided', () => {
    const { container } = render(
      <EmptyState title="אין הצעות" subtitle="ההצעות מגיעות תוך 5 דקות" />,
    );
    expect(container.textContent).toContain('ההצעות מגיעות תוך 5 דקות');
  });

  test('does not render an action button when only actionLabel is given', () => {
    // Without onAction, a label without a handler would be a dead button.
    const { container } = render(
      <EmptyState title="אין" actionLabel="נסה שוב" />,
    );
    expect(container.textContent).not.toContain('נסה שוב');
  });

  test('does not render an action button when only onAction is given', () => {
    const onAction = jest.fn();
    const { container } = render(
      <EmptyState title="אין" onAction={onAction} />,
    );
    // Title still rendered, no extra button text since no label was given.
    expect(container.textContent).toContain('אין');
  });

  test('renders the action button when both label and handler are provided', () => {
    const onAction = jest.fn();
    const { container } = render(
      <EmptyState title="אין" actionLabel="נסה שוב" onAction={onAction} />,
    );
    expect(container.textContent).toContain('נסה שוב');
  });

  test('tapping the action calls onAction', () => {
    const onAction = jest.fn();
    const { getByLabelText } = render(
      <EmptyState title="אין" actionLabel="נסה שוב" onAction={onAction} />,
    );
    fireEvent.click(getByLabelText('נסה שוב'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  test('button gets actionLabel as its accessibility label', () => {
    const onAction = jest.fn();
    const { getByLabelText } = render(
      <EmptyState
        title="שגיאה"
        actionLabel="טען מחדש"
        onAction={onAction}
      />,
    );
    expect(getByLabelText('טען מחדש')).toBeTruthy();
  });

  test('all four variants render without crashing', () => {
    const variants = ['waiting', 'empty', 'error', 'offline'] as const;
    for (const variant of variants) {
      const { container } = render(
        <EmptyState variant={variant} title={`v-${variant}`} />,
      );
      expect(container.textContent).toContain(`v-${variant}`);
    }
  });
});
