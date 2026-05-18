import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from './AuthPage';
import { supabase } from '../supabase';
import { __resetRouterMocks, __setNavigateMock, __setSearchParams } from 'react-router-dom';

const mockSaveAuthIntent = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn()
    }
  }
}));

jest.mock('../auth', () => {
  const actual = jest.requireActual('../auth');

  return {
    ...actual,
    saveAuthIntent: (...args) => mockSaveAuthIntent(...args)
  };
});

describe('AuthPage', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
    __setSearchParams('mode=login');
  });

  it('validates login fields before submitting', async () => {
    render(<AuthPage />);

    const loginButton = screen
      .getAllByRole('button', { name: 'Log in' })
      .find((button) => button.getAttribute('type') === 'submit');

    await userEvent.click(loginButton);
    expect(screen.getByText('Email is required.')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('student@wits.ac.za'), 'invalid-email');
    await userEvent.type(document.querySelector('input[type="password"]'), 'short');
    await userEvent.click(loginButton);

    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('logs a user in with email and password', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    render(<AuthPage />);

    const loginButton = screen
      .getAllByRole('button', { name: 'Log in' })
      .find((button) => button.getAttribute('type') === 'submit');

    await userEvent.type(screen.getByPlaceholderText('student@wits.ac.za'), ' student@wits.ac.za ');
    await userEvent.type(document.querySelector('input[type="password"]'), 'password123');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(mockSaveAuthIntent).toHaveBeenCalledWith({ mode: 'login', role: 'student' });
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'student@wits.ac.za',
        password: 'password123'
      });
    });
  });

  it('creates a new account in signup mode', async () => {
    supabase.auth.signUp.mockResolvedValue({ error: null });
    __setSearchParams('mode=signup');

    render(<AuthPage />);

    const passwordInputs = document.querySelectorAll('input[type="password"]');

    await userEvent.type(screen.getByPlaceholderText('Jane Doe'), 'Jane Student');
    await userEvent.type(screen.getByPlaceholderText('student@wits.ac.za'), 'jane@wits.ac.za');
    await userEvent.type(passwordInputs[0], 'securepass');
    await userEvent.type(passwordInputs[1], 'securepass');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mockSaveAuthIntent).toHaveBeenCalledWith({ mode: 'signup', role: 'student' });
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'jane@wits.ac.za',
        password: 'securepass',
        options: {
          emailRedirectTo: 'http://localhost/',
          data: { full_name: 'Jane Student', role: 'student' }
        }
      });
    });

    expect(
      screen.getByText('Account created! Check your email to confirm your address.')
    ).toBeInTheDocument();
  });

  it('surfaces signup validation errors before calling Supabase', async () => {
    __setSearchParams('mode=signup');

    render(<AuthPage />);

    const passwordInputs = document.querySelectorAll('input[type="password"]');

    await userEvent.type(screen.getByPlaceholderText('student@wits.ac.za'), 'new@wits.ac.za');
    await userEvent.type(passwordInputs[0], 'securepass');
    await userEvent.type(passwordInputs[1], 'differentpass');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('starts Google auth and shows OAuth errors', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({
      error: { message: 'Google login is unavailable.' }
    });
    __setSearchParams('mode=signup');

    render(<AuthPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => {
      expect(mockSaveAuthIntent).toHaveBeenCalledWith({ mode: 'signup', role: 'student' });
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'http://localhost/auth?mode=signup' }
      });
    });

    expect(screen.getByText('Google login is unavailable.')).toBeInTheDocument();
  });

  it('switches between login and signup modes through search params', async () => {
    const setSearchParams = __setSearchParams('mode=login');

    render(<AuthPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(setSearchParams).toHaveBeenCalledWith({ mode: 'signup' });
  });

  it('displays OAuth redirect error from search params', async () => {
    __setSearchParams('mode=login&error_description=Access+Denied');

    render(<AuthPage />);

    expect(await screen.findByText('Access Denied')).toBeInTheDocument();
  });

  it('shows a sign in error from Supabase when login fails', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } });

    render(<AuthPage />);

    const loginButton = screen
      .getAllByRole('button', { name: 'Log in' })
      .find((button) => button.getAttribute('type') === 'submit');

    await userEvent.type(screen.getByPlaceholderText('student@wits.ac.za'), 'student@wits.ac.za');
    await userEvent.type(document.querySelector('input[type="password"]'), 'password123');
    await userEvent.click(loginButton);

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('navigates to the site root when history is too short', async () => {
    __setSearchParams('mode=login');
    const originalLength = window.history.length;
    Object.defineProperty(window.history, 'length', { value: 1, configurable: true });

    try {
      render(<AuthPage />);

      await userEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(navigateMock).toHaveBeenCalledWith('/');
    } finally {
      Object.defineProperty(window.history, 'length', { value: originalLength, configurable: true });
    }
  });

  it('toggles password visibility in the form', async () => {
    const { container } = render(<AuthPage />);
    const toggleButton = container.querySelector('.input-toggle');
    const passwordInput = document.querySelector('input[type="password"]');

    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(toggleButton);

    expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
  });

  it('uses backward navigation when history has more than one entry', async () => {
    window.history.pushState({}, '', '/first');
    window.history.pushState({}, '', '/second');

    render(<AuthPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('starts Google auth successfully when no OAuth error is returned', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({ error: null });
    __setSearchParams('mode=signup');

    render(<AuthPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'http://localhost/auth?mode=signup' }
      });
    });

    expect(screen.queryByText('Google login is unavailable.')).not.toBeInTheDocument();
  });
});
