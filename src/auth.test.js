import {
  clearAuthIntent,
  getDefaultFullName,
  getRoleLabel,
  normalizeRole,
  readAuthIntent,
  saveAuthIntent
} from './auth';

describe('auth helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('normalizes supported roles and rejects unknown values', () => {
    expect(normalizeRole()).toBe('');
    expect(normalizeRole(' Student ')).toBe('student');
    expect(normalizeRole('trade facility staff')).toBe('staff');
    expect(normalizeRole('trade_staff')).toBe('staff');
    expect(normalizeRole('ADMIN')).toBe('admin');
    expect(normalizeRole('moderator')).toBe('');
  });

  it('returns the display label for a role and falls back to Student', () => {
    expect(getRoleLabel('staff')).toBe('Trade Facility Staff');
    expect(getRoleLabel('admin')).toBe('Admin');
    expect(getRoleLabel('unknown')).toBe('Student');
  });

  it('derives a default full name from metadata or email', () => {
    expect(getDefaultFullName({ user_metadata: { full_name: ' Jane Doe ' } })).toBe('Jane Doe');
    expect(getDefaultFullName({ user_metadata: { name: 'Campus User' } })).toBe('Campus User');
    expect(getDefaultFullName({ user_metadata: { user_name: 'student_handle' } })).toBe('student_handle');
    expect(getDefaultFullName({ email: 'learner@wits.ac.za' })).toBe('learner');
    expect(getDefaultFullName({})).toBe('');
  });

  it('saves the auth intent with normalized values', () => {
    jest.spyOn(Date, 'now').mockReturnValue(12345);

    saveAuthIntent({ mode: 'signup', role: 'trade facility staff' });

    expect(JSON.parse(window.localStorage.getItem('uniMart.authIntent'))).toEqual({
      mode: 'signup',
      role: 'staff',
      savedAt: 12345
    });
  });

  it('reads the current auth intent and supports the legacy storage key', () => {
    window.localStorage.setItem(
      'uniMart.authIntent',
      JSON.stringify({ mode: 'signup', role: 'admin' })
    );

    expect(readAuthIntent()).toEqual({ mode: 'signup', role: 'admin' });

    window.localStorage.removeItem('uniMart.authIntent');
    window.localStorage.setItem(
      'campusSwap.authIntent',
      JSON.stringify({ mode: 'login', role: 'trade_staff' })
    );

    expect(readAuthIntent()).toEqual({ mode: 'login', role: 'staff' });
  });

  it('returns null for missing or invalid auth intent values', () => {
    expect(readAuthIntent()).toBeNull();

    window.localStorage.setItem('uniMart.authIntent', 'not-json');
    expect(readAuthIntent()).toBeNull();
  });

  it('clears both auth intent keys', () => {
    window.localStorage.setItem('uniMart.authIntent', '{"mode":"login"}');
    window.localStorage.setItem('campusSwap.authIntent', '{"mode":"signup"}');

    clearAuthIntent();

    expect(window.localStorage.getItem('uniMart.authIntent')).toBeNull();
    expect(window.localStorage.getItem('campusSwap.authIntent')).toBeNull();
  });
});
