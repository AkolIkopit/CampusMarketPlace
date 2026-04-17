import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthPage from './AuthPage'; // Path is now ./

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

test('renders login page title', () => {
  window.history.pushState({}, 'Test', '/auth?mode=login');
  render(
    <BrowserRouter>
      <AuthPage />
    </BrowserRouter>
  );
  expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
});