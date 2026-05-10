import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessagesPage from './MessagesPage';
import { supabase } from '../../supabase';
import { __resetRouterMocks, __setNavigateMock, __setSearchParams } from 'react-router-dom';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    },
    storage: {
      from: jest.fn()
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    })),
    removeChannel: jest.fn()
  }
}));

const profile = {
  id: 'user-1',
  full_name: 'Jane Student',
  avatar_url: ''
};

function createMessagesPageMocks({ messages = [], profileRows = [] } = {}) {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } }
  });

  const userProfileEq = jest.fn().mockResolvedValue({
    data: { id: 'user-1', full_name: 'Jane Student', avatar_url: '' }
  });
  const userProfileSelect = jest.fn(() => ({ eq: userProfileEq }));

  // messages query chain
  const messagesOrder = jest.fn().mockResolvedValue({ data: messages });
  const messagesOr = jest.fn(() => ({ order: messagesOrder }));
  const messagesSelect = jest.fn(() => ({ or: messagesOr }));

  // profiles query for conversation participants
  const profilesIn = jest.fn().mockResolvedValue({ data: profileRows });
  const profilesSelect = jest.fn(() => ({ in: profilesIn }));

  // listings query for context
  const listingsIn = jest.fn().mockResolvedValue({ data: [] });
  const listingsSelect = jest.fn(() => ({ in: listingsIn }));

  // read receipts update
  const updateEq = jest.fn().mockResolvedValue({ error: null });
  const updateFilter = jest.fn(() => ({ eq: updateEq }));
  const update = jest.fn(() => ({ eq: updateEq, filter: updateFilter }));

  supabase.from.mockImplementation((table) => {
    if (table === 'profiles') return { select: jest.fn(() => ({ eq: userProfileEq, in: profilesIn })) };
    if (table === 'messages') return { select: messagesSelect, update };
    if (table === 'listings') return { select: listingsSelect };
    return { select: jest.fn().mockResolvedValue({ data: [] }) };
  });
}

describe('MessagesPage', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
    __setSearchParams('');
  });

  it('renders the Messages heading and hero copy', async () => {
    createMessagesPageMocks();

    render(<MessagesPage profile={profile} />);

    expect(await screen.findByText('Messages')).toBeInTheDocument();
    expect(
      screen.getByText('Open a conversation to read the full thread and continue the chat.')
    ).toBeInTheDocument();
  });

  it('shows the signed-in user name in the header', async () => {
    createMessagesPageMocks();

    render(<MessagesPage profile={profile} />);

    expect(await screen.findByText('Signed in as Jane Student')).toBeInTheDocument();
  });

  it('navigates back to the student dashboard on Back button click', async () => {
    createMessagesPageMocks();

    render(<MessagesPage profile={profile} />);

    await screen.findByText('Messages');

    await userEvent.click(screen.getByRole('button', { name: 'Back to Dashboard' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/student');
  });

  it('shows the empty state when no conversation is selected', async () => {
    createMessagesPageMocks();

    render(<MessagesPage profile={profile} />);

    expect(await screen.findByText('Select a conversation')).toBeInTheDocument();
  });

  it('shows loading conversations while fetching', () => {
    // Hang all queries so loading stays true
    supabase.auth.getUser.mockReturnValue(new Promise(() => {}));
    supabase.from.mockReturnValue({
      select: jest.fn(() => ({ or: jest.fn(() => new Promise(() => {})) }))
    });

    render(<MessagesPage profile={profile} />);

    expect(screen.getByText('Loading conversations...')).toBeInTheDocument();
  });

  it('renders the conversation list panel', async () => {
    createMessagesPageMocks();

    render(<MessagesPage profile={profile} />);

    await waitFor(() => {
      expect(
        screen.getByRole('complementary', { name: 'Conversation list' })
      ).toBeInTheDocument();
    });
  });
});
