import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoryPanel } from '../src/components/history/HistoryPanel';
import { useHistoryStore, HistoryEntry } from '../src/stores/historyStore';
import { useRequestStore } from '../src/stores/requestStore';

describe('HistoryPanel Component (Problem 2)', () => {
  beforeEach(() => {
    useHistoryStore.setState({ entries: [], searchQuery: '', isLoading: false, loadHistory: vi.fn() });
  });

  it('renders empty state when there are no history entries', () => {
    render(<HistoryPanel />);
    expect(screen.getByText('No request history yet')).toBeInTheDocument();
  });

  it('renders history entries with method, url, and status badges', () => {
    const mockEntry: HistoryEntry = {
      id: 'h-1',
      timestamp: Date.now(),
      method: 'GET',
      url: 'https://api.example.com/users',
      headersJson: '{}',
      responseStatus: 200,
      responseStatusText: 'OK',
      responseDurationMs: 45,
    };

    useHistoryStore.setState({ entries: [mockEntry] });
    render(<HistoryPanel />);

    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('45ms')).toBeInTheDocument();
  });

  it('filters history entries based on searchQuery', () => {
    const entry1: HistoryEntry = {
      id: 'h-1',
      timestamp: Date.now(),
      method: 'GET',
      url: 'https://api.example.com/users',
      headersJson: '{}',
    };
    const entry2: HistoryEntry = {
      id: 'h-2',
      timestamp: Date.now(),
      method: 'POST',
      url: 'https://api.example.com/posts',
      headersJson: '{}',
    };

    useHistoryStore.setState({ entries: [entry1, entry2], searchQuery: 'posts' });
    render(<HistoryPanel />);

    expect(screen.getByText('https://api.example.com/posts')).toBeInTheDocument();
    expect(screen.queryByText('https://api.example.com/users')).not.toBeInTheDocument();
  });

  it('restores entry to active tab when clicked', () => {
    const reqStore = useRequestStore.getState();
    reqStore.addTab();

    const mockEntry: HistoryEntry = {
      id: 'h-1',
      timestamp: Date.now(),
      method: 'DELETE',
      url: 'https://api.example.com/items/99',
      headersJson: '{"X-Trace":"test-trace"}',
    };

    useHistoryStore.setState({ entries: [mockEntry] });
    render(<HistoryPanel />);

    const itemRow = screen.getByText('https://api.example.com/items/99').closest('div[role="button"]');
    expect(itemRow).toBeInTheDocument();
    fireEvent.click(itemRow!);

    const activeTab = useRequestStore
      .getState()
      .tabs.find((t) => t.id === useRequestStore.getState().activeTabId);
    expect(activeTab?.request.method).toBe('DELETE');
    expect(activeTab?.request.url).toBe('https://api.example.com/items/99');
  });

  it('shows confirmation modal before clearing all history', async () => {
    const mockEntry: HistoryEntry = {
      id: 'h-1',
      timestamp: Date.now(),
      method: 'GET',
      url: 'https://api.example.com/users',
      headersJson: '{}',
    };

    useHistoryStore.setState({ entries: [mockEntry] });
    render(<HistoryPanel />);

    const clearBtn = screen.getByRole('button', { name: /clear all request history/i });
    fireEvent.click(clearBtn);

    // Modal dialog must be visible
    expect(screen.getByText('Clear Request History?')).toBeInTheDocument();
    expect(screen.getByText(/permanently delete all request history/i)).toBeInTheDocument();

    // Confirm button inside modal
    const confirmBtn = screen.getByRole('button', { name: /clear all history/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(useHistoryStore.getState().entries.length).toBe(0);
    });
  });
});
