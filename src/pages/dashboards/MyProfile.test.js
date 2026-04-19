import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyProfile from './MyProfile';
import { supabase } from '../../supabase';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

function createMyProfileMocks({
  existingApplication = null
} = {}) {
  const maybeSingle = jest
    .fn()
    .mockResolvedValueOnce({ data: existingApplication })
    .mockResolvedValue({ data: existingApplication });
  const selectEq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq: selectEq }));
  const insert = jest.fn().mockResolvedValue({ error: null });
  const deleteEq = jest.fn().mockResolvedValue({ error: null });
  const remove = jest.fn(() => ({ eq: deleteEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'role_applications') {
      return {
        select,
        insert,
        delete: remove
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    deleteEq,
    insert,
    maybeSingle
  };
}

describe('MyProfile', () => {
  const profile = {
    id: 'user-1',
    full_name: 'Jane Student',
    campus: 'Main Campus',
    bio: 'Chemistry major'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the loading screen when no profile is available yet', () => {
    render(
      <MyProfile
        profile={null}
        onEditClick={jest.fn()}
        onBack={jest.fn()}
        navigate={jest.fn()}
      />
    );

    expect(screen.getByText('Loading UniMart...')).toBeInTheDocument();
  });

  it('loads the existing application and lets the user withdraw it', async () => {
    const { deleteEq } = createMyProfileMocks({
      existingApplication: { requested_role: 'staff' }
    });

    window.confirm.mockReturnValue(true);

    render(
      <MyProfile
        profile={profile}
        onEditClick={jest.fn()}
        onBack={jest.fn()}
        navigate={jest.fn()}
      />
    );

    expect(await screen.findByText('Pending staff')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Withdraw/i }));

    await waitFor(() => {
      expect(deleteEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(screen.queryByText('Pending staff')).not.toBeInTheDocument();
    });
  });

  it('submits a staff application and returns to the profile view', async () => {
    const { insert } = createMyProfileMocks();

    render(
      <MyProfile
        profile={profile}
        onEditClick={jest.fn()}
        onBack={jest.fn()}
        navigate={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('role_applications');
    });

    fireEvent.click(screen.getByText('Apply Staff').closest('article'));

    await userEvent.type(screen.getAllByRole('textbox')[0], 'Education Campus');
    await userEvent.type(screen.getByPlaceholderText('e.g. Mon-Fri'), 'Weekdays');
    await userEvent.click(screen.getByRole('button', { name: 'Submit Application' }));

    await waitFor(() => {
      expect(insert).toHaveBeenCalledWith([
        {
          user_id: 'user-1',
          full_name: 'Jane Student',
          requested_role: 'staff',
          motivation: '',
          experience: '',
          campus_location: 'Education Campus',
          availability: 'Weekdays',
          scenario_response: ''
        }
      ]);
      expect(window.alert).toHaveBeenCalledWith('Application submitted!');
      expect(screen.getByText('Apply Staff')).toBeInTheDocument();
    });
  });

  it('wires the profile navigation actions', async () => {
    createMyProfileMocks();
    const onBack = jest.fn();
    const onEditClick = jest.fn();
    const navigate = jest.fn();

    render(
      <MyProfile
        profile={profile}
        onEditClick={onEditClick}
        onBack={onBack}
        navigate={navigate}
      />
    );

    expect(await screen.findByText('Jane Student')).toBeInTheDocument();
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('role_applications');
    });

    await userEvent.click(screen.getByRole('button', { name: /Back to Dashboard/i }));
    await userEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    fireEvent.click(screen.getByText('My Listings').closest('article'));

    expect(onBack).toHaveBeenCalled();
    expect(onEditClick).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/my-listings');
  });
});