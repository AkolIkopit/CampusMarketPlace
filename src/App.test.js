import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App'; // Path is now ./ because it's in the same folder
import { supabase } from './supabase';

// Mock Supabase locally in this file
jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({ 
        data: { subscription: { unsubscribe: jest.fn() } } 
      })),
    },
  },
}));

test('renders landing page for unauthenticated users', async () => {
  render(<App />);
  // Adjust this text to match something actually on your LandingPage
  const linkElement = screen.getByText(/Buy, sell and/i);
  expect(linkElement).toBeInTheDocument();
});