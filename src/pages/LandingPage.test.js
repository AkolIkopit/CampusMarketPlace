import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingPage from './LandingPage';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

describe('LandingPage', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
    document.body.style.overflow = '';
  });

  it('routes users into the correct auth mode from the main CTAs', async () => {
    render(<LandingPage />);

    await userEvent.click(screen.getAllByRole('button', { name: 'Sign up free' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Start trading' }));

    expect(navigateMock).toHaveBeenNthCalledWith(1, '/auth?mode=signup');
    expect(navigateMock).toHaveBeenNthCalledWith(2, '/auth?mode=login');
    expect(navigateMock).toHaveBeenNthCalledWith(3, '/auth?mode=signup');
  });

  it('opens the mobile menu, locks scrolling, and closes again on resize', async () => {
    render(<LandingPage />);

    const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });
    await userEvent.click(menuButton);

    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toBeInTheDocument();

    window.innerWidth = 1200;
    fireEvent(window, new Event('resize'));

    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('uses the category cards as signup entry points', async () => {
    render(<LandingPage />);

    await userEvent.click(screen.getByRole('button', { name: /Textbooks/i }));

    expect(navigateMock).toHaveBeenCalledWith('/auth?mode=signup');
  });

  it('closes the menu when a mobile link is selected', async () => {
    render(<LandingPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    await userEvent.click(screen.getAllByRole('link', { name: 'How it works' })[1]);

    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument();
  });
});
