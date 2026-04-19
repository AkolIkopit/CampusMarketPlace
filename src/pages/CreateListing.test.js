import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateListing from './CreateListing';
import { supabase } from '../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    },
    storage: {
      from: jest.fn()
    }
  }
}));

function createCreateListingMocks({
  categories = [{ id: 1, name: 'Books' }],
  uploadError = null,
  listingError = null
} = {}) {
  const categorySelect = jest.fn().mockResolvedValue({ data: categories });
  const listingSingle = jest.fn().mockResolvedValue({
    data: listingError ? null : { id: 'listing-1' },
    error: listingError
  });
  const listingSelect = jest.fn(() => ({ single: listingSingle }));
  const listingInsert = jest.fn(() => ({ select: listingSelect }));
  const listingImagesInsert = jest.fn().mockResolvedValue({ error: null });
  const upload = jest.fn().mockResolvedValue({ error: uploadError });
  const getPublicUrl = jest.fn(() => ({
    data: { publicUrl: 'https://cdn.example.com/listing.png' }
  }));

  supabase.from.mockImplementation((table) => {
    if (table === 'categories') {
      return { select: categorySelect };
    }

    if (table === 'listings') {
      return { insert: listingInsert };
    }

    if (table === 'listing_images') {
      return { insert: listingImagesInsert };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  supabase.storage.from.mockReturnValue({
    upload,
    getPublicUrl
  });

  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } }
  });

  return {
    categorySelect,
    getPublicUrl,
    listingImagesInsert,
    listingInsert,
    listingSingle,
    upload
  };
}

describe('CreateListing', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
  });

  it('loads category options from Supabase', async () => {
    createCreateListingMocks();

    render(<CreateListing />);

    expect(await screen.findByRole('option', { name: 'Books' })).toBeInTheDocument();
  });

  it('requires an image before posting', async () => {
    createCreateListingMocks();

    const { container } = render(<CreateListing />);

    await screen.findByRole('option', { name: 'Books' });
    fireEvent.submit(container.querySelector('form'));

    expect(window.alert).toHaveBeenCalledWith('Please add a picture!');
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('requires a category after an image is chosen', async () => {
    createCreateListingMocks();

    const { container } = render(<CreateListing />);
    const fileInput = container.querySelector('#pic-upload');

    await screen.findByRole('option', { name: 'Books' });
    await userEvent.upload(fileInput, new File(['data'], 'camera.png', { type: 'image/png' }));
    fireEvent.submit(container.querySelector('form'));

    expect(window.alert).toHaveBeenCalledWith('Please select a category!');
  });

  it('uploads the image, creates the listing, and redirects on success', async () => {
    const { listingImagesInsert, listingInsert, upload } = createCreateListingMocks();
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const { container } = render(<CreateListing />);
    const fileInput = container.querySelector('#pic-upload');
    const [categorySelect, conditionSelect, campusSelect] = screen.getAllByRole('combobox');

    await screen.findByRole('option', { name: 'Books' });
    await userEvent.upload(fileInput, new File(['data'], 'camera.png', { type: 'image/png' }));
    await userEvent.type(screen.getByPlaceholderText('e.g. Calculus Textbook'), 'Desk Lamp');
    await userEvent.selectOptions(categorySelect, '1');
    await userEvent.selectOptions(conditionSelect, 'Like New');
    await userEvent.type(screen.getByPlaceholderText('0.00'), '149.99');
    await userEvent.selectOptions(campusSelect, 'Med Campus');
    await userEvent.type(screen.getByPlaceholderText('Details about your item...'), 'Bright desk lamp');
    await userEvent.click(screen.getByRole('radio', { name: 'Trade' }));
    await userEvent.click(screen.getByRole('button', { name: 'POST' }));

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith('user-1/user-1-0.5.png', expect.any(File));
      expect(listingInsert).toHaveBeenCalledWith([
        {
          seller_id: 'user-1',
          title: 'Desk Lamp',
          category_id: 1,
          description: 'Bright desk lamp',
          price: 149.99,
          listing_type: 'trade',
          condition: 'Like New',
          location: 'Med Campus',
          status: 'active'
        }
      ]);
      expect(listingImagesInsert).toHaveBeenCalledWith([
        {
          listing_id: 'listing-1',
          image_url: 'https://cdn.example.com/listing.png',
          is_primary: true
        }
      ]);
      expect(window.alert).toHaveBeenCalledWith('Listing Posted successfully!');
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/student');
    });

    randomSpy.mockRestore();
  });

  it('shows the Supabase upload error to the user', async () => {
    createCreateListingMocks({
      uploadError: { message: 'Upload failed' }
    });
    const { container } = render(<CreateListing />);
    const fileInput = container.querySelector('#pic-upload');
    const [categorySelect] = screen.getAllByRole('combobox');

    await screen.findByRole('option', { name: 'Books' });
    await userEvent.upload(fileInput, new File(['data'], 'camera.png', { type: 'image/png' }));
    await userEvent.type(screen.getByPlaceholderText('e.g. Calculus Textbook'), 'Desk Lamp');
    await userEvent.selectOptions(categorySelect, '1');
    await userEvent.type(screen.getByPlaceholderText('0.00'), '149.99');
    await userEvent.type(screen.getByPlaceholderText('Details about your item...'), 'Bright desk lamp');
    await userEvent.click(screen.getByRole('button', { name: 'POST' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error: Upload failed');
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });
});
