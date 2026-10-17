import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TabBar } from '../src/components/layout/TabBar';
import { useRequestStore, createDefaultRequest } from '../src/stores/requestStore';

describe('Tab Close 3-Action Confirmation Modal (OP-R2-003 / OP-AUDIT-011)', () => {
  beforeEach(() => {
    // Reset store state
    const req = createDefaultRequest({ name: 'Unsaved Test Request' });
    useRequestStore.setState({
      tabs: [
        {
          id: 'test-dirty-tab',
          name: 'Unsaved Test Request',
          isDirty: true,
          request: req,
          response: null,
          isLoading: false,
          error: null,
        },
      ],
      activeTabId: 'test-dirty-tab',
    });
  });

  it('renders all three actions: Save, Don\'t Save, and Cancel when closing dirty tab', () => {
    render(<TabBar />);

    // Click close button on dirty tab
    const closeBtn = screen.getByTitle('Close Tab');
    fireEvent.click(closeBtn);

    // Modal should be visible
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();

    // Verify all 3 action buttons exist
    const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    const dontSaveBtn = screen.getByRole('button', { name: /^don't save$/i });
    const saveBtn = screen.getByRole('button', { name: /^save$/i });

    expect(cancelBtn).toBeInTheDocument();
    expect(dontSaveBtn).toBeInTheDocument();
    expect(saveBtn).toBeInTheDocument();
  });

  it('cancels closing when Cancel is clicked', () => {
    render(<TabBar />);

    const closeBtn = screen.getByTitle('Close Tab');
    fireEvent.click(closeBtn);

    const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    fireEvent.click(cancelBtn);

    // Tab is still present in the store
    const tabs = useRequestStore.getState().tabs;
    expect(tabs.some((t) => t.id === 'test-dirty-tab')).toBe(true);
  });

  it('discards and closes tab when Don\'t Save is clicked', () => {
    render(<TabBar />);

    const closeBtn = screen.getByTitle('Close Tab');
    fireEvent.click(closeBtn);

    const dontSaveBtn = screen.getByRole('button', { name: /^don't save$/i });
    fireEvent.click(dontSaveBtn);

    // Dirty tab was closed
    const tabs = useRequestStore.getState().tabs;
    expect(tabs.some((t) => t.id === 'test-dirty-tab')).toBe(false);
  });
});
