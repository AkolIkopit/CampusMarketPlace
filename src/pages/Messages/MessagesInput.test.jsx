import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageInput from './MessagesInput';

describe('MessageInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends a text message and clears the draft on success', async () => {
    const onSendMessage = jest.fn().mockResolvedValue(true);

    render(<MessageInput onSendMessage={onSendMessage} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Write a message' }), 'Hello there');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('Hello there', null);
      expect(screen.getByRole('textbox', { name: 'Write a message' })).toHaveValue('');
    });
  });

  it('keeps the draft when the parent reports a failed send', async () => {
    const onSendMessage = jest.fn().mockResolvedValue(false);

    render(<MessageInput onSendMessage={onSendMessage} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Write a message' }), 'Retry me');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Write a message' })).toHaveValue('Retry me');
    });
  });

  it('handles attachments and removal', async () => {
    const file = new File(['binary'], 'proof.pdf', { type: 'application/pdf' });

    const { container } = render(<MessageInput onSendMessage={jest.fn()} />);

    await userEvent.upload(container.querySelector('input[type="file"]'), file);

    expect(screen.getByText('proof.pdf')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove attachment' }));

    expect(screen.queryByText('proof.pdf')).not.toBeInTheDocument();
  });

  it('inserts an emoji and closes the picker', async () => {
    render(<MessageInput onSendMessage={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Insert emoji' }));

    const emojiPicker = screen.getByLabelText('Emoji picker');
    const emojiButtons = within(emojiPicker).getAllByRole('button');

    await userEvent.click(emojiButtons[0]);

    expect(screen.queryByLabelText('Emoji picker')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Write a message' })).not.toHaveValue('');
  });

  it('sends the attached file and clears the attachment on success', async () => {
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    const onSendMessage = jest.fn().mockResolvedValue(true);

    const { container } = render(<MessageInput onSendMessage={onSendMessage} />);

    await userEvent.upload(container.querySelector('input[type="file"]'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('', file);
      expect(screen.queryByText('photo.png')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Write a message' })).toHaveValue('');
    });
  });

  it('keeps the send button disabled when the input is disabled', async () => {
    render(<MessageInput onSendMessage={jest.fn()} disabled />);

    expect(screen.getByRole('button', { name: 'Add attachment' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Insert emoji' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });
});
