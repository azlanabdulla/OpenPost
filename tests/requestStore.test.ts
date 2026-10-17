import { describe, it, expect, beforeEach } from 'vitest';
import { useRequestStore, createDefaultTab } from '../src/stores/requestStore';

describe('useRequestStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const freshTab = createDefaultTab('Initial Tab');
    useRequestStore.setState({
      tabs: [freshTab],
      activeTabId: freshTab.id,
    });
  });

  it('initializes with default tab', () => {
    const { tabs, activeTabId } = useRequestStore.getState();
    expect(tabs.length).toBe(1);
    expect(activeTabId).toBe(tabs[0].id);
    expect(tabs[0].request.method).toBe('GET');
  });

  it('can add a new tab and switch active tab to it', () => {
    useRequestStore.getState().addTab({ name: 'Second Tab', method: 'POST' });
    const { tabs, activeTabId } = useRequestStore.getState();

    expect(tabs.length).toBe(2);
    expect(activeTabId).toBe(tabs[1].id);
    expect(tabs[1].request.name).toBe('New Request');
  });

  it('updates method and marks tab as dirty', () => {
    useRequestStore.getState().setMethod('DELETE');
    const { tabs, activeTabId } = useRequestStore.getState();
    const active = tabs.find((t) => t.id === activeTabId);

    expect(active?.request.method).toBe('DELETE');
    expect(active?.isDirty).toBe(true);
  });

  it('updates URL and extracts params into the table', () => {
    useRequestStore.getState().setUrl('https://api.example.com/items?color=blue&size=large');
    const { tabs, activeTabId } = useRequestStore.getState();
    const active = tabs.find((t) => t.id === activeTabId);

    expect(active?.request.url).toBe('https://api.example.com/items?color=blue&size=large');
    const activeParams = active?.request.params.filter((p) => p.key);
    expect(activeParams?.length).toBe(2);
    expect(activeParams?.[0].key).toBe('color');
    expect(activeParams?.[0].value).toBe('blue');
    expect(activeParams?.[1].key).toBe('size');
    expect(activeParams?.[1].value).toBe('large');
  });

  it('updates Params table and updates URL in sync', () => {
    useRequestStore.getState().setUrl('https://api.example.com/items');
    useRequestStore.getState().setParams([
      { id: '1', key: 'category', value: 'books', enabled: true },
      { id: '2', key: 'sort', value: 'desc', enabled: true },
    ]);

    const { tabs, activeTabId } = useRequestStore.getState();
    const active = tabs.find((t) => t.id === activeTabId);

    expect(active?.request.url).toBe('https://api.example.com/items?category=books&sort=desc');
  });

  it('triggers confirmation when requesting to close a dirty tab', () => {
    // Mark active tab dirty
    useRequestStore.getState().setUrl('https://api.example.com/modified');
    const { activeTabId } = useRequestStore.getState();

    // Request close
    useRequestStore.getState().requestCloseTab(activeTabId);
    expect(useRequestStore.getState().pendingCloseTabId).toBe(activeTabId);

    // Cancel close keeps tab open
    useRequestStore.getState().cancelCloseTab();
    expect(useRequestStore.getState().pendingCloseTabId).toBeNull();
    expect(useRequestStore.getState().tabs.length).toBe(1);

    // Confirm close closes the dirty tab
    useRequestStore.getState().requestCloseTab(activeTabId);
    useRequestStore.getState().confirmCloseTab();
    expect(useRequestStore.getState().pendingCloseTabId).toBeNull();
    // Default tab replacement ensures at least 1 tab remains
    expect(useRequestStore.getState().tabs.length).toBe(1);
    expect(useRequestStore.getState().tabs[0].isDirty).toBe(false);
  });
});
