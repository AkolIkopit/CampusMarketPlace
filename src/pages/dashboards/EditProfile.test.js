import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditProfile from './EditProfile';
import { supabase } from '../../supabase';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn()
    }
  }
}));

function createEditProfileMocks({ updateError = null, uploadError = null } = {}) {
  const updateEq = jest.fn().mockResolvedValue({ error: updateError });
  const update = jest.fn(() => ({ eq: updateEq }));
  const upload = jest.fn().mockResolvedValue({ error: uploadError });
  const getPublicUrl = jest.fn(() => ({
    data: { publicUrl: 'https://cdn.example.com/avatar.png' }
  }));

  supabase.from.mockImplementation((table) => {
    if (table === 'profiles') {
      return { update };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  supabase.storage.from.mockReturnValue({
    upload,
    getPublicUrl
  });

  return {
    getPublicUrl,
    update,
    updateEq,
    upload
  };
}

describe('EditProfile', () => {
  const profile = {
    id: 'user-1',
    full_name: 'Jane Student',
    campus: 'Main Campus',
    phone_number: '0123456789',
    student_number: '12345',
    bio: 'Chemistry major',
    avatar_url: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves the edited profile details', async () => {
    const { update, updateEq } = createEditProfileMocks();
    const onSaveSuccess = jest.fn();

    const { container } = render(
      <EditProfile profile={profile} onCancel={jest.fn()} onSaveSuccess={onSaveSuccess} />
    );

    await userEvent.clear(container.querySelector('input[name="full_name"]'));
    await userEvent.type(container.querySelector('input[name="full_name"]'), 'Jane Admin');
    await userEvent.clear(container.querySelector('textarea[name="bio"]'));
    await userEvent.type(container.querySelector('textarea[name="bio"]'), 'Now leading the marketplace');
    await userEvent.selectOptions(container.querySelector('select[name="campus"]'), 'Med Campus');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Jane Admin',
          bio: 'Now leading the marketplace',
          campus: 'Med Campus',
          updated_at: expect.any(Date)
        })
      );
      expect(updateEq).toHaveBeenCalledWith('id', 'user-1');
      expect(window.alert).toHaveBeenCalledWith('Profile updated successfully!');
      expect(onSaveSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Jane Admin',
          bio: 'Now leading the marketplace',
          campus: 'Med Campus'
        })
      );
    });
  });

  it('uploads a new avatar and updates the preview URL', async () => {
    const { upload } = createEditProfileMocks();
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.25);
    const { container } = render(
      <EditProfile profile={profile} onCancel={jest.fn()} onSaveSuccess={jest.fn()} />
    );
    const fileInput = container.querySelector('input[type="file"]');

    await userEvent.upload(fileInput, new File(['avatar'], 'avatar.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith('user-1/user-1-0.25.png', expect.any(File));
      expect(screen.getByAltText('Profile')).toHaveAttribute(
        'src',
        'https://cdn.example.com/avatar.png'
      );
    });

    randomSpy.mockRestore();
  });

  it('shows an upload error to the user', async () => {
    createEditProfileMocks({
      uploadError: { message: 'Upload failed' }
    });

    const { container } = render(
      <EditProfile profile={profile} onCancel={jest.fn()} onSaveSuccess={jest.fn()} />
    );
    const fileInput = container.querySelector('input[type="file"]');

    await userEvent.upload(fileInput, new File(['avatar'], 'avatar.png', { type: 'image/png' }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Upload error: Upload failed');
    });
  });

  it('shows a save error to the user', async () => {
    createEditProfileMocks({
      updateError: { message: 'Update failed' }
    });

    render(<EditProfile profile={profile} onCancel={jest.fn()} onSaveSuccess={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Update failed');
    });
  });

  it('lets the user cancel out of the form', async () => {
    createEditProfileMocks();
    const onCancel = jest.fn();

    render(<EditProfile profile={profile} onCancel={onCancel} onSaveSuccess={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
