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
});
