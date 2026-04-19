import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversationList from './ConversationList';

describe('ConversationList', () => {
  const conversations = [
    {
      id: 'conv-1',
      name: 'Alice',
      avatar: '',
      unreadCount: 2,
      time: '09:00',
      item: 'Calculus textbook',
      message: 'Is this still available?'
    },
    {
      id: 'conv-2',
      name: 'Bob',
      avatar: '/bob.png',
      unreadCount: 120,
      time: '10:30',
      item: 'Laptop',
      message: 'I can collect tomorrow.'
    }
  ];

  it('renders conversation state, fallback avatars, and unread counts', () => {
    render(
      <ConversationList
        conversations={conversations}
        activeConversationId="conv-1"
        onSelectConversation={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Alice avatar/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Alice avatar' })).toHaveAttribute(
      'src',
      '/avatar-placeholder.svg'
    );
    expect(screen.getByLabelText('2 unread messages')).toHaveTextContent('2');
    expect(screen.getByLabelText('120 unread messages')).toHaveTextContent('99+');
  });

  it('calls back when a conversation is selected', async () => {
    const onSelectConversation = jest.fn();

    render(
      <ConversationList
        conversations={conversations}
        activeConversationId="conv-1"
        onSelectConversation={onSelectConversation}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Bob avatar/i }));

    expect(onSelectConversation).toHaveBeenCalledWith('conv-2');
  });
});
