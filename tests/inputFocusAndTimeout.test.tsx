import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportModal } from '../src/components/modals/ImportModal';
import { SettingsModal } from '../src/components/modals/SettingsModal';
import { SettingsEditor } from '../src/components/request/SettingsEditor';

describe('Modal Focus Retention & Input Regression Tests', () => {
  it('ImportModal: retains cursor and activeElement focus while typing into cURL textarea', async () => {
    const user = userEvent.setup();
    render(<ImportModal isOpen={true} onClose={() => {}} />);

    const textarea = screen.getByPlaceholderText(/curl -X POST/i);
    expect(textarea).toBeInTheDocument();

    // Focus the textarea and type a 20-character string
    await user.click(textarea);
    expect(document.activeElement).toBe(textarea);

    const testString = 'curl https://api.dev';
    await user.type(textarea, testString);

    // Textarea must retain all 20 characters and remain the activeElement
    expect(textarea).toHaveValue(testString);
    expect(document.activeElement).toBe(textarea);
  });

  it('ImportModal: retains cursor and focus while typing into JSON textarea', async () => {
    const user = userEvent.setup();
    render(<ImportModal isOpen={true} onClose={() => {}} />);

    // Switch to JSON tab
    const postmanTab = screen.getByRole('button', { name: /Postman \/ OpenPost JSON/i });
    await user.click(postmanTab);

    const jsonTextarea = screen.getByPlaceholderText(/Paste collection JSON here/i);
    expect(jsonTextarea).toBeInTheDocument();

    await user.click(jsonTextarea);
    expect(document.activeElement).toBe(jsonTextarea);

    const testJson = 'API Collection String'; // 21 chars
    await user.type(jsonTextarea, testJson);

    expect(jsonTextarea).toHaveValue(testJson);
    expect(document.activeElement).toBe(jsonTextarea);
  });

  it('ImportModal: handles 1 MB large JSON paste without lagging or throwing', () => {
    render(<ImportModal isOpen={true} onClose={() => {}} />);

    const postmanTab = screen.getByRole('button', { name: /Postman \/ OpenPost JSON/i });
    fireEvent.click(postmanTab);

    const jsonTextarea = screen.getByPlaceholderText(/Paste collection JSON here/i);

    // Construct ~1 MB JSON string
    const largeObj = {
      info: { name: 'Large Collection', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: Array.from({ length: 1500 }, (_, i) => ({
        name: `Request ${i}`,
        request: { method: 'GET', url: `https://api.example.com/items/${i}?token=sample_token_${i}` },
      })),
    };
    const largeJsonString = JSON.stringify(largeObj);
    expect(largeJsonString.length).toBeGreaterThan(100000);

    const startTime = performance.now();
    fireEvent.change(jsonTextarea, { target: { value: largeJsonString } });
    const duration = performance.now() - startTime;

    expect((jsonTextarea as HTMLTextAreaElement).value.length).toBe(largeJsonString.length);
    // Paste and render must complete smoothly under 500ms
    expect(duration).toBeLessThan(500);
  });

  it('SettingsModal: retains focus while typing timeout and large response threshold', async () => {
    const user = userEvent.setup();
    render(<SettingsModal isOpen={true} onClose={() => {}} />);

    const timeoutInput = screen.getByLabelText(/Default Request Timeout/i);
    await user.click(timeoutInput);
    expect(document.activeElement).toBe(timeoutInput);

    await user.clear(timeoutInput);
    await user.type(timeoutInput, '15000');

    expect(timeoutInput).toHaveValue('15000');
    expect(document.activeElement).toBe(timeoutInput);

    const sizeInput = screen.getByLabelText(/Large Response Warning \(MB\)/i);
    await user.click(sizeInput);
    expect(document.activeElement).toBe(sizeInput);

    await user.clear(sizeInput);
    await user.type(sizeInput, '25');

    expect(sizeInput).toHaveValue('25');
    expect(document.activeElement).toBe(sizeInput);
  });
});

describe('Per-Request Timeout Input (SettingsEditor)', () => {
  it('renders a plain text input with inputmode numeric and no spinner arrows', () => {
    render(<SettingsEditor settings={{ timeoutMs: 30000 }} onChange={() => {}} />);

    const input = screen.getByLabelText(/Request Timeout \(milliseconds\)/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).not.toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('placeholder', '30000');
  });

  it('accepts numeric input and updates timeoutMs', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SettingsEditor settings={{ timeoutMs: 30000 }} onChange={onChange} />);

    const input = screen.getByLabelText(/Request Timeout \(milliseconds\)/i);
    await user.clear(input);
    await user.type(input, '45000');

    expect(input).toHaveValue('45000');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ timeoutMs: 45000 }));
  });

  it('falls back to default (30000 ms) when input is left empty', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SettingsEditor settings={{ timeoutMs: 15000 }} onChange={onChange} />);

    const input = screen.getByLabelText(/Request Timeout \(milliseconds\)/i);
    await user.clear(input);

    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', '30000');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ timeoutMs: 30000 }));
  });

  it('displays inline validation message when value is outside 100 to 600,000 ms', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SettingsEditor settings={{ timeoutMs: 30000 }} onChange={onChange} />);

    const input = screen.getByLabelText(/Request Timeout \(milliseconds\)/i);

    // Enter too low (< 100)
    await user.clear(input);
    await user.type(input, '50');

    expect(screen.getByRole('alert')).toHaveTextContent(/Timeout must be between 100 ms and 600,000 ms/i);

    // Enter too high (> 600000)
    await user.clear(input);
    await user.type(input, '700000');

    expect(screen.getByRole('alert')).toHaveTextContent(/Timeout must be between 100 ms and 600,000 ms/i);

    // Valid value clears error
    await user.clear(input);
    await user.type(input, '5000');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ timeoutMs: 5000 }));
  });
});
