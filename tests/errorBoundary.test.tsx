import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

const FaultyComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test render crash simulation');
  }
  return <div>Component is healthy</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component is healthy')).toBeInTheDocument();
  });

  it('renders crash screen and error code when child throws', () => {
    // Suppress console.error in test output for simulated crash
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('OP-SYS-001')).toBeInTheDocument();
    expect(screen.getByText('Application Render Error')).toBeInTheDocument();
    expect(screen.getByText('Reload Application')).toBeInTheDocument();
    expect(screen.getByText('Copy Sanitized Diagnostics')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('copies sanitized diagnostics to clipboard', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const copyBtn = screen.getByText('Copy Sanitized Diagnostics');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    const clipboardContent = writeTextMock.mock.calls[0][0];
    expect(clipboardContent).toContain('OpenPost Crash Diagnostic Report');
    expect(clipboardContent).toContain('Test render crash simulation');

    spy.mockRestore();
  });
});
