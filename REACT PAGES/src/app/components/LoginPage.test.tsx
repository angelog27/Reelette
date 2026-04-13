import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { LoginPage } from './LoginPage';

vi.mock('../services/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  saveUser: vi.fn(),
  getUserStreaming: vi.fn(),
  saveServices: vi.fn(),
  hasServicesConfigured: vi.fn(),
  forgotPassword: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login view by default', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
  });

  it('switches to forgot-password view when link is clicked', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Forgot your password?'));

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByText('Send Reset Email')).toBeInTheDocument();
  });

  it('returns to login view when Log in is clicked', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Forgot your password?'));
    fireEvent.click(screen.getByText('Log in'));

    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('copies the typed email into forgot-password view', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    fireEvent.click(screen.getByText('Forgot your password?'));

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });
});