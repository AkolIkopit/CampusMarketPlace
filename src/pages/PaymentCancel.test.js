import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentCancel from './PaymentCancel';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

describe('PaymentCancel', () => {
  beforeEach(() => {
    __resetRouterMocks();
  });

  it('shows the cancelled message and returns to messages', async () => {
    const navigate = jest.fn();
    __setNavigateMock(navigate);

    render(<PaymentCancel />);

    expect(screen.getByText(/Payment Cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/booking is still reserved/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Back to Messages/i }));

    expect(navigate).toHaveBeenCalledWith('/messages');
  });
});
