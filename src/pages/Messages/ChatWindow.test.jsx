import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWindow from './ChatWindow';

describe('ChatWindow', () => {
  const conversation = {
    id: 'conv-1',
    name: 'Alice Seller',
    avatar: '',
    headline: 'MacBook Air',
    dateLabel: 'Today',
    messages: [
      {
        id: 'msg-1',
        incoming: true,
        text: 'Still interested?',
        time: '09:00',
        attachmentUrl: 'https://example.com/photo',
        attachmentLabel: 'View image'
      },
      {
        id: 'msg-2',
        incoming: false,
        text: 'Yes, can I see it later?',
        time: '09:05'
      }
    ]
  };

  it('renders a conversation with messages and attachments', () => {
    render(
      <ChatWindow
        conversation={conversation}
        onSendMessage={jest.fn()}
        isSending={false}
        onBackToList={jest.fn()}
      />
    );

    expect(screen.getByText('Alice Seller')).toBeInTheDocument();
    expect(screen.getByText('Still interested?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View image' })).toHaveAttribute(
      'href',
      'https://example.com/photo'
    );
    expect(screen.getAllByRole('img', { name: 'Alice Seller' })[0]).toHaveAttribute(
      'src',
      '/avatar-placeholder.svg'
    );
  });

  it('shows the self-conversation empty state and disables sending', () => {
    render(
      <ChatWindow
        conversation={conversation}
        onSendMessage={jest.fn()}
        isSending={false}
        isSelfConversation={true}
        onBackToList={jest.fn()}
      />
    );

    expect(screen.getByText('This is your own listing')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Write a message' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('calls the mobile back handler', async () => {
    const onBackToList = jest.fn();

    render(
      <ChatWindow
        conversation={conversation}
        onSendMessage={jest.fn()}
        isSending={false}
        onBackToList={onBackToList}
      />
    );

    await userEvent.click(screen.getAllByRole('button')[0]);

    expect(onBackToList).toHaveBeenCalled();
  });

  it('keeps the buyer payment prompt visible while a balance remains', () => {
    render(
      <ChatWindow
        conversation={{
          ...conversation,
          listingId: 'listing-1',
          sellerId: 'seller-1',
          transactionId: 'transaction-1',
          transactionStatus: 'accepted_pending_booking',
          bookingStatus: 'requested',
          paymentStatus: 'pending_payment',
          agreedAmount: 100,
          cashShortfallDue: 40
        }}
        currentUserId="buyer-1"
        onSendMessage={jest.fn()}
        isSending={false}
        onBackToList={jest.fn()}
        onMakePayment={jest.fn()}
      />
    );

    expect(screen.getByText('Amount due: R40.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make payment' })).toBeInTheDocument();
  });

  it('hides seller booking prompt after full payment', () => {
    render(
      <ChatWindow
        conversation={{
          ...conversation,
          listingId: 'listing-1',
          sellerId: 'seller-1',
          transactionId: 'transaction-1',
          transactionStatus: 'accepted_pending_booking',
          bookingStatus: 'requested',
          paymentStatus: 'FULLY_PAID',
          agreedAmount: 100,
          cashShortfallDue: 0
        }}
        currentUserId="seller-1"
        onSendMessage={jest.fn()}
        isSending={false}
        onBackToList={jest.fn()}
        onRequestBooking={jest.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Request a new booking' })).not.toBeInTheDocument();
  });

  it('hides seller booking prompt once staff marks the item ready for collection', () => {
    render(
      <ChatWindow
        conversation={{
          ...conversation,
          listingId: 'listing-1',
          sellerId: 'seller-1',
          transactionId: 'transaction-1',
          transactionStatus: 'accepted_pending_booking',
          bookingStatus: 'ready_for_collection',
          paymentStatus: 'pending_payment',
          agreedAmount: 100,
          cashShortfallDue: 100
        }}
        currentUserId="seller-1"
        onSendMessage={jest.fn()}
        isSending={false}
        onBackToList={jest.fn()}
        onRequestBooking={jest.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Request a new booking' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request facility booking' })).not.toBeInTheDocument();
  });
});
