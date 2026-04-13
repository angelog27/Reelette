import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SettingsTab } from './SettingsTab';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../services/api', () => ({
  clearUser: vi.fn(),
  clearServices: vi.fn(),
}));

import { clearUser, clearServices } from '../services/api';

describe('SettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs the user out and navigates to login page', () => {
    render(
      <MemoryRouter>
        <SettingsTab />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Log Out'));

    expect(clearUser).toHaveBeenCalled();
    expect(clearServices).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});