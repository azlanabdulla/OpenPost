import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportModal } from '../src/components/modals/ImportModal';
import { useRequestStore } from '../src/stores/requestStore';

describe('ImportModal Unit & Integration Tests (OP-R2-014, OP-R2-015)', () => {
  beforeEach(() => {
    useRequestStore.setState({
      tabs: [],
      activeTabId: undefined,
    });
  });

  it('renders cURL input and detects unsupported flags, showing the dedicated report', async () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />);

    // Textarea for cURL command
    const textarea = screen.getByPlaceholderText(/curl -X POST/i);
    fireEvent.change(textarea, {
      target: {
        value: 'curl https://api.example.com/v1/stream --limit-rate 50k --socks5 127.0.0.1:9050 -x http://127.0.0.1:8080 -H "Authorization: Bearer secret-token"',
      },
    });

    const processBtn = screen.getByRole('button', { name: /Process Import/i });
    fireEvent.click(processBtn);

    // Verify cURL Unsupported-Flag Report header and flags
    expect(screen.getByText(/cURL Unsupported-Flag Report/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Unsupported Flag\(s\) Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/--limit-rate/i)).toBeInTheDocument();
    expect(screen.getByText(/--socks5/i)).toBeInTheDocument();
    expect(screen.getByText(/-x/i)).toBeInTheDocument();

    // Verify button to import omitting flags
    const importOmitBtn = screen.getByRole('button', { name: /Import Request \(Omit Flags\)/i });
    expect(importOmitBtn).toBeInTheDocument();

    // Click Import
    fireEvent.click(importOmitBtn);

    // Verify request was added to request store
    const tabs = useRequestStore.getState().tabs;
    expect(tabs.length).toBe(1);
    expect(tabs[0].request.url).toBe('https://api.example.com/v1/stream');
    expect(tabs[0].request.headers.some((h) => h.key === 'Authorization')).toBe(true);
  });

  it('renders Postman collection summary dialog with requests count and preview', async () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />);

    // Switch to Postman tab
    const postmanTabBtn = screen.getByRole('button', { name: /Postman \/ OpenPost JSON/i });
    fireEvent.click(postmanTabBtn);

    const postmanJson = JSON.stringify({
      info: {
        name: 'Inventory Gateway API',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Warehouse',
          item: [
            {
              name: 'Get Stock Level',
              request: {
                method: 'GET',
                url: 'https://api.inventory.com/v1/stock',
              },
            },
            {
              name: 'Update Item Count',
              request: {
                method: 'POST',
                url: 'https://api.inventory.com/v1/stock/update',
              },
            },
          ],
        },
      ],
    });

    const jsonTextarea = screen.getByPlaceholderText(/Paste collection JSON here/i);
    fireEvent.change(jsonTextarea, { target: { value: postmanJson } });

    const processBtn = screen.getByRole('button', { name: /Process Import/i });
    fireEvent.click(processBtn);

    // Verify Summary View
    expect(screen.getByText(/Postman Collection Summary/i)).toBeInTheDocument();
    expect(screen.getByText('Inventory Gateway API')).toBeInTheDocument();
    expect(screen.getByText('Get Stock Level')).toBeInTheDocument();
    expect(screen.getByText('Update Item Count')).toBeInTheDocument();

    // Add to workspace
    const addToWorkspaceBtn = screen.getByRole('button', { name: /Add 2 Request\(s\) to Workspace/i });
    expect(addToWorkspaceBtn).toBeInTheDocument();
    fireEvent.click(addToWorkspaceBtn);

    const tabs = useRequestStore.getState().tabs;
    expect(tabs.length).toBe(2);
    expect(tabs[0].name).toBe('Get Stock Level');
    expect(tabs[1].name).toBe('Update Item Count');
  });

  it('rejects oversized inputs exceeding 10MB limit with OP-IMP-005 error message', async () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />);

    const postmanTabBtn = screen.getByRole('button', { name: /Postman \/ OpenPost JSON/i });
    fireEvent.click(postmanTabBtn);

    const oversizedPayload = 'a'.repeat(10 * 1024 * 1024 + 10);
    const jsonTextarea = screen.getByPlaceholderText(/Paste collection JSON here/i);
    fireEvent.change(jsonTextarea, { target: { value: oversizedPayload } });

    const processBtn = screen.getByRole('button', { name: /Process Import/i });
    fireEvent.click(processBtn);

    expect(screen.getByText(/OP-IMP-005/i)).toBeInTheDocument();
    expect(screen.getByText(/10 MB/i)).toBeInTheDocument();
  });
});
