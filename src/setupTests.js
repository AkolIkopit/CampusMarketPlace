import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for jsPDF and related libs in Jest
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = global.TextEncoder || TextEncoder;
  global.TextDecoder = global.TextDecoder || TextDecoder;
}

jest.mock('lucide-react', () => {
  const React = require('react');

  return new Proxy(
    {},
    {
      get: (_, iconName) => {
        const Icon = ({ children, ...props }) =>
          React.createElement(
            'svg',
            { 'data-icon': String(iconName), role: 'img', ...props },
            children
          );

        Icon.displayName = String(iconName);
        return Icon;
      }
    }
  );
}, { virtual: true });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

class IntersectionObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;
window.IntersectionObserver = IntersectionObserverMock;
window.HTMLElement.prototype.scrollIntoView = jest.fn();
window.alert = jest.fn();
window.confirm = jest.fn(() => true);
window.URL.createObjectURL = jest.fn(() => 'blob:preview');
window.URL.revokeObjectURL = jest.fn();

delete window.location;
window.location = { 
  href: 'http://localhost/',
  origin: 'http://localhost',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(), 
  replace: jest.fn(),
  history: { replaceState: jest.fn() } 
};
