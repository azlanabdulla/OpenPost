import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../src/components/layout/Sidebar';
import { SettingsModal, DEFAULT_SETTINGS } from '../src/components/modals/SettingsModal';

describe('Sidebar and Settings Enhancements (Step 1 Items 1, 3, 4)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Sidebar Chevron Toggle and Keyboard Accessibility', () => {
    it('renders collection and toggles expand/collapse on click with state persistence', () => {
      render(<Sidebar />);

      const collectionToggle = screen.getByRole('button', { name: /Toggle Sample REST Collection/i });
      expect(collectionToggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Get Todo')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(collectionToggle);
      expect(collectionToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Get Todo')).not.toBeInTheDocument();
      expect(localStorage.getItem('openpost_sidebar_sample_expanded')).toBe('false');

      // Click to expand again
      fireEvent.click(collectionToggle);
      expect(collectionToggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Get Todo')).toBeInTheDocument();
      expect(localStorage.getItem('openpost_sidebar_sample_expanded')).toBe('true');
    });

    it('supports Enter and Space key navigation to expand/collapse', () => {
      render(<Sidebar />);

      const collectionToggle = screen.getByRole('button', { name: /Toggle Sample REST Collection/i });
      expect(collectionToggle).toHaveAttribute('aria-expanded', 'true');

      // Press Space
      fireEvent.keyDown(collectionToggle, { key: ' ' });
      expect(collectionToggle).toHaveAttribute('aria-expanded', 'false');

      // Press Enter
      fireEvent.keyDown(collectionToggle, { key: 'Enter' });
      expect(collectionToggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('does not contain a duplicate settings button at the bottom of the sidebar', () => {
      render(<Sidebar />);
      expect(screen.queryByTitle('App Settings')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Open application settings')).not.toBeInTheDocument();
      expect(screen.getByText('OpenPost Local')).toBeInTheDocument();
    });
  });

  describe('Settings Dialog Numeric Inputs and Inline Validation', () => {
    it('uses plain numeric text inputs without stepper buttons', () => {
      render(<SettingsModal isOpen={true} onClose={() => {}} />);

      const timeoutInput = screen.getByLabelText(/Default Request Timeout/i) as HTMLInputElement;
      const sizeInput = screen.getByLabelText(/Large Response Warning/i) as HTMLInputElement;

      expect(timeoutInput.type).toBe('text');
      expect(timeoutInput.inputMode).toBe('numeric');
      expect(timeoutInput.placeholder).toBe('30000');

      expect(sizeInput.type).toBe('text');
      expect(sizeInput.inputMode).toBe('numeric');
      expect(sizeInput.placeholder).toBe('5');
    });

    it('validates timeout limits (100 to 600,000 ms) and shows inline message', () => {
      render(<SettingsModal isOpen={true} onClose={() => {}} />);

      const timeoutInput = screen.getByLabelText(/Default Request Timeout/i);

      // Value below minimum (e.g. 50 ms)
      fireEvent.change(timeoutInput, { target: { value: '50' } });
      expect(screen.getByText(/Timeout must be between 100 ms and 600,000 ms/i)).toBeInTheDocument();

      // Save button should be disabled when in error
      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveBtn).toBeDisabled();

      // Valid value (e.g. 5000 ms)
      fireEvent.change(timeoutInput, { target: { value: '5000' } });
      expect(screen.queryByText(/Timeout must be between 100 ms and 600,000 ms/i)).not.toBeInTheDocument();
      expect(saveBtn).not.toBeDisabled();
    });

    it('validates large response warning limits (1 to 500 MB) with inline message', () => {
      render(<SettingsModal isOpen={true} onClose={() => {}} />);

      const sizeInput = screen.getByLabelText(/Large Response Warning/i);

      // Value above maximum (e.g. 999 MB)
      fireEvent.change(sizeInput, { target: { value: '999' } });
      expect(screen.getByText(/Warning threshold must be between 1 MB and 500 MB/i)).toBeInTheDocument();

      // Valid value (e.g. 10 MB)
      fireEvent.change(sizeInput, { target: { value: '10' } });
      expect(screen.queryByText(/Warning threshold must be between 1 MB and 500 MB/i)).not.toBeInTheDocument();
    });

    it('falls back to default 30,000 ms and 5 MB when fields are left empty', () => {
      const onClose = vi.fn();
      render(<SettingsModal isOpen={true} onClose={onClose} />);

      const timeoutInput = screen.getByLabelText(/Default Request Timeout/i);
      const sizeInput = screen.getByLabelText(/Large Response Warning/i);

      fireEvent.change(timeoutInput, { target: { value: '' } });
      fireEvent.change(sizeInput, { target: { value: '' } });

      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveBtn).not.toBeDisabled();
      fireEvent.click(saveBtn);

      const saved = JSON.parse(localStorage.getItem('openpost_settings_v1') || '{}');
      expect(saved.defaultTimeoutMs).toBe(30000);
      expect(saved.largeResponseThresholdMb).toBe(5);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
