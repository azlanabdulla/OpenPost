import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualList } from '../src/components/common/VirtualList';

describe('VirtualList Component (1,000+ requests performance)', () => {
  it('renders only visible window for 1,000 items instead of 1,000 DOM nodes', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: `req-${i}`,
      name: `Request ${i}`,
    }));

    render(
      <VirtualList
        items={items}
        itemHeight={30}
        maxHeight={300} // Visible height fits ~10 items + overscan
        overscan={5}
        ariaLabel="Virtualized requests test"
        renderItem={(item) => (
          <div key={item.id} data-testid="virtual-row" className="h-[30px]">
            {item.name}
          </div>
        )}
      />
    );

    const renderedRows = screen.getAllByTestId('virtual-row');
    // For 1,000 items, should render ~25-35 DOM nodes, NOT 1,000
    expect(renderedRows.length).toBeLessThan(50);
    expect(renderedRows.length).toBeGreaterThan(0);

    // Verify first row is present
    expect(screen.getByText('Request 0')).toBeInTheDocument();
    // 999th row is NOT yet rendered in DOM
    expect(screen.queryByText('Request 999')).not.toBeInTheDocument();
  });

  it('renders empty placeholder when item list is empty', () => {
    render(
      <VirtualList
        items={[]}
        itemHeight={30}
        emptyPlaceholder={<div data-testid="empty-msg">No items found</div>}
        renderItem={() => null}
      />
    );

    expect(screen.getByTestId('empty-msg')).toHaveTextContent('No items found');
  });

  it('updates visible window offset when scrolled', () => {
    const items = Array.from({ length: 500 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item #${i}`,
    }));

    const { container } = render(
      <VirtualList
        items={items}
        itemHeight={30}
        maxHeight={300}
        overscan={2}
        renderItem={(item) => (
          <div key={item.id} data-testid="scroll-row">
            {item.name}
          </div>
        )}
      />
    );

    const scrollContainer = container.querySelector('[role="region"]');
    expect(scrollContainer).not.toBeNull();

    // Scroll down by 600px (20 items down)
    fireEvent.scroll(scrollContainer!, { target: { scrollTop: 600 } });

    // After scrolling down, items around #20 should be rendered
    expect(screen.getByText('Item #20')).toBeInTheDocument();
  });
});
