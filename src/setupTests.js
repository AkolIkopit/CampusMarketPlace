import '@testing-library/jest-dom';

// 1. Mock Lucide Icons (This stops the "Unexpected Token" crash)
jest.mock('lucide-react', () => ({
  Plus: () => <div />,
  ShoppingBag: () => <div />,
  Box: () => <div />,
  MessageCircle: () => <div />,
  Star: () => <div />,
  Search: () => <div />,
  Menu: () => <div />,
  X: () => <div />,
  User: () => <div />,
  Settings: () => <div />,
  LogOut: () => <div />,
  Loader2: () => <div />,
  Filter: () => <div />,
  MapPin: () => <div />,
  ArrowLeft: () => <div />,
  Eye: () => <div />,
  EyeOff: () => <div />
}));

// 2. Mock window.location for your redirects
delete window.location;
window.location = { 
  href: '', 
  assign: jest.fn(), 
  replace: jest.fn(),
  history: { replaceState: jest.fn() } 
};
