import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './AdminDashboard';

describe('AdminDashboard', () => {
  it('toggles the burger menu', async () => {
    render(<AdminDashboard />);

    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});
