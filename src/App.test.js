import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProtectedRoute,
  SessionErrorScreen,
  ensureProfile,
  fetchProfile,
  getDashboardPath,
  withTimeout
} from './App';
import { supabase } from './supabase';
const mockClearAuthIntent = jest.fn();
const mockReadAuthIntent = jest.fn();
const mockGetDefaultFullName = jest.fn();

jest.mock('./pages/dashboards/Analytics', () => () => <div>Analytics</div>);
jest.mock('./pages/AuthPage', () => () => <div>AuthPage</div>);

jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn()
    }
  }
}));

jest.mock('./auth', () => {
  const actual = jest.requireActual('./auth');

  return {
    ...actual,
    clearAuthIntent: (...args) => mockClearAuthIntent(...args),
    readAuthIntent: (...args) => mockReadAuthIntent(...args),
    getDefaultFullName: (...args) => mockGetDefaultFullName(...args)
  };
});

function createProfileSelectQuery(maybeSingle) {
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));

  return { select, eq, maybeSingle };
}

describe('App helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = 'http://localhost/';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the correct dashboard path for a role and status', () => {
    expect(getDashboardPath('student', 'approved')).toBe('/dashboard/student');
    expect(getDashboardPath('staff', 'approved')).toBe('/dashboard/staff');
    expect(getDashboardPath('admin', 'approved')).toBe('/dashboard/admin');
    expect(getDashboardPath('student', 'pending')).toBe('/waiting-room');
  });

  it('resolves a promise before the timeout', async () => {
    jest.useFakeTimers();

    const promise = withTimeout(
      new Promise((resolve) => {
        window.setTimeout(() => resolve('done'), 25);
      }),
      1000,
      'Timed out'
    );

    jest.advanceTimersByTime(25);

    await expect(promise).resolves.toBe('done');
  });

  it('rejects when the timeout wins the race', async () => {
    jest.useFakeTimers();

    const promise = withTimeout(new Promise(() => {}), 50, 'Timed out');

    jest.advanceTimersByTime(50);

    await expect(promise).rejects.toThrow('Timed out');
  });

  it('fetches a user profile from Supabase', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'user-1', role: 'student' } });
    const query = createProfileSelectQuery(maybeSingle);

    supabase.from.mockReturnValue(query);

    await expect(fetchProfile('user-1')).resolves.toEqual({ id: 'user-1', role: 'student' });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('returns an existing profile without creating a new one', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'user-1', role: 'staff' } });
    const query = createProfileSelectQuery(maybeSingle);

    supabase.from.mockReturnValue(query);
    mockReadAuthIntent.mockReturnValue({ mode: 'signup', role: 'student' });

    await expect(
      ensureProfile({
        id: 'user-1',
        app_metadata: { provider: 'email' },
        user_metadata: {}
      })
    ).resolves.toEqual({ id: 'user-1', role: 'staff' });

    expect(mockClearAuthIntent).toHaveBeenCalled();
  });

  it('signs a Google user out when no matching profile exists for login', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null });
    const query = createProfileSelectQuery(maybeSingle);

    supabase.from.mockReturnValue(query);
    supabase.auth.signOut.mockResolvedValue({});
    mockReadAuthIntent.mockReturnValue(null);

    await expect(
      ensureProfile({
        id: 'google-user',
        app_metadata: { provider: 'google' },
        user_metadata: {}
      })
    ).resolves.toBeNull();

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(mockClearAuthIntent).toHaveBeenCalled();
    expect(window.location.href).toBe('/auth?mode=login&error=Account+not+found.+Please+sign+up+first.');
  });

  it('creates a default student profile when one does not exist', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null });
    const selectProfileQuery = createProfileSelectQuery(maybeSingle);
    const maybeSingleInsert = jest.fn().mockResolvedValue({
      data: { id: 'new-user', full_name: 'Campus Starter', role: 'student' },
      error: null
    });
    const insert = jest.fn(() => ({
      select: jest.fn(() => ({ maybeSingle: maybeSingleInsert }))
    }));

    supabase.from.mockImplementation(() => ({
      ...selectProfileQuery,
      insert
    }));
    mockReadAuthIntent.mockReturnValue({ mode: 'signup', role: 'student' });
    mockGetDefaultFullName.mockReturnValue('Campus Starter');

    const profile = await ensureProfile({
      id: 'new-user',
      app_metadata: { provider: 'email' },
      user_metadata: {}
    });

    expect(insert).toHaveBeenCalledWith([
      {
        id: 'new-user',
        full_name: 'Campus Starter',
        role: 'student',
        application_status: 'approved',
        requested_role: 'student',
        campus: 'Main Campus'
      }
    ]);
    expect(profile).toEqual({ id: 'new-user', full_name: 'Campus Starter', role: 'student' });
    expect(mockClearAuthIntent).toHaveBeenCalled();
  });

  it('re-fetches the profile after a duplicate insert error', async () => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { id: 'dupe-user', role: 'student' } });
    const selectProfileQuery = createProfileSelectQuery(maybeSingle);
    const maybeSingleInsert = jest.fn().mockResolvedValue({
      data: null,
      error: { code: '23505' }
    });
    const insert = jest.fn(() => ({
      select: jest.fn(() => ({ maybeSingle: maybeSingleInsert }))
    }));

    supabase.from.mockImplementation(() => ({
      ...selectProfileQuery,
      insert
    }));
    mockReadAuthIntent.mockReturnValue({ mode: 'signup', role: 'student' });
    mockGetDefaultFullName.mockReturnValue('Recovered User');

    await expect(
      ensureProfile({
        id: 'dupe-user',
        app_metadata: { provider: 'email' },
        user_metadata: {}
      })
    ).resolves.toEqual({ id: 'dupe-user', role: 'student' });

    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the loading screen while auth is resolving', () => {
    render(
      <ProtectedRoute
        loading={true}
        session={null}
        profile={null}
        authError=""
        requiredRole="student"
        element={<div>Protected content</div>}
      />
    );

    expect(screen.getByText('Loading UniMart...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to the home route', () => {
    render(
      <ProtectedRoute
        loading={false}
        session={null}
        profile={null}
        authError=""
        requiredRole="student"
        element={<div>Protected content</div>}
      />
    );

    expect(screen.getByTestId('navigate')).toHaveTextContent('/');
  });

  it('shows the session error screen when the profile cannot be loaded', () => {
    render(
      <ProtectedRoute
        loading={false}
        session={{ user: { id: 'user-1' } }}
        profile={null}
        authError="Broken profile"
        requiredRole="student"
        element={<div>Protected content</div>}
      />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Broken profile')).toBeInTheDocument();
  });

  it('redirects pending users to the waiting room', () => {
    render(
      <ProtectedRoute
        loading={false}
        session={{ user: { id: 'user-1' } }}
        profile={{ role: 'student', application_status: 'pending' }}
        authError=""
        requiredRole="student"
        element={<div>Protected content</div>}
      />
    );

    expect(screen.getByTestId('navigate')).toHaveTextContent('/waiting-room');
  });

  it('redirects users to their own dashboard when the required role mismatches', () => {
    render(
      <ProtectedRoute
        loading={false}
        session={{ user: { id: 'user-1' } }}
        profile={{ role: 'staff', application_status: 'approved' }}
        authError=""
        requiredRole="student"
        element={<div>Protected content</div>}
      />
    );

    expect(screen.getByTestId('navigate')).toHaveTextContent('/dashboard/staff');
  });

  it('renders the protected element when the session and role are valid', () => {
    render(
      <ProtectedRoute
        loading={false}
        session={{ user: { id: 'user-1' } }}
        profile={{ role: 'student', application_status: 'approved' }}
        authError=""
        requiredRole="student"
        element={<div>Protected content</div>}
      />
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});

describe('SessionErrorScreen', () => {
  it('lets the user sign out from the error state', async () => {
    supabase.auth.signOut.mockResolvedValue({});

    render(<SessionErrorScreen message="Try again later." />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
