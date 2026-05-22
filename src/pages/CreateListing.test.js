import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateListing from './CreateListing';
import { supabase } from '../supabase';
import { __resetRouterMocks, __setNavigateMock, __setSearchParams } from 'react-router-dom';

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
  listingError = null,
  listingData = null,
  updateError = null,
  economicData = null,
  publicUrlError = null,
  listBucketsResult = { data: [{ name: 'listing-Images' }], error: null }
} = {}) {
  const categorySelect = jest.fn().mockResolvedValue({ data: categories });
  const listingSingle = jest.fn().mockResolvedValue({
    data: listingData || (listingError ? null : { id: 'listing-1' }),
    error: listingError
  });
  const listingSelect = jest.fn(() => ({
    single: listingSingle,
    maybeSingle: listingSingle,
    eq: jest.fn(() => ({ maybeSingle: listingSingle }))
  }));
  const updateSelect = jest.fn().mockResolvedValue({ data: [{ id: 'listing-1' }], error: updateError });
  const updateEq = jest.fn(() => ({ select: updateSelect }));
  const listingUpdate = jest.fn(() => ({ eq: updateEq }));
  const listingInsert = jest.fn(() => ({ select: listingSelect }));

  const listingImagesUpdateEq = jest.fn().mockResolvedValue({ data: [], error: null });
  const listingImagesUpdate = jest.fn(() => ({ eq: listingImagesUpdateEq }));
  const listingImagesInsert = jest.fn().mockResolvedValue({ error: null });

  const saEconomicMaybeSingle = jest.fn().mockResolvedValue({ data: economicData, error: null });
  const saEconomicIlike = jest.fn(() => ({ maybeSingle: saEconomicMaybeSingle }));
  const saEconomicSelect = jest.fn(() => ({ ilike: saEconomicIlike }));

  const upload = jest.fn().mockResolvedValue({ error: uploadError });
  const getPublicUrl = jest.fn(() => ({
    data: publicUrlError ? null : { publicUrl: 'https://cdn.example.com/listing.png' },
    error: publicUrlError
  }));

  supabase.from.mockImplementation((table) => {
    if (table === 'categories') {
      return { select: categorySelect };
    }

    if (table === 'listings') {
      return { insert: listingInsert, select: listingSelect, update: listingUpdate };
    }

    if (table === 'listing_images') {
      return { update: listingImagesUpdate, insert: listingImagesInsert };
    }

    if (table === 'sa_economic_indicators') {
      return { select: saEconomicSelect };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  supabase.storage.from.mockReturnValue({
    upload,
    getPublicUrl
  });
  supabase.storage.listBuckets = jest.fn().mockResolvedValue(listBucketsResult);

  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } }
  });

  return {
    categorySelect,
    getPublicUrl,
    listingImagesInsert,
    listingInsert,
    listingSingle,
    listingUpdate,
    upload
  };
}

async function fillValidCreateForm(container) {
  const fileInput = container.querySelector('#pic-upload');
  const [categorySelect] = screen.getAllByRole('combobox');

  await screen.findByRole('option', { name: 'Books' });
  await userEvent.upload(fileInput, new File(['data'], 'camera.png', { type: 'image/png' }));
  await userEvent.selectOptions(categorySelect, '1');
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

  it('requires a title after category and image are chosen', async () => {
    createCreateListingMocks();

    const { container } = render(<CreateListing />);
    await fillValidCreateForm(container);
    await userEvent.type(screen.getByPlaceholderText('0.00'), '149.99');
    await userEvent.type(screen.getByPlaceholderText('Details about your item...'), 'Bright desk lamp');
    fireEvent.submit(container.querySelector('form'));

    expect(window.alert).toHaveBeenCalledWith('Please enter a title!');
  });

  it('requires a description before posting', async () => {
    createCreateListingMocks();

    const { container } = render(<CreateListing />);
    await fillValidCreateForm(container);
    await userEvent.type(screen.getByPlaceholderText('e.g. Calculus Textbook'), 'Desk Lamp');
    await userEvent.type(screen.getByPlaceholderText('0.00'), '149.99');
    fireEvent.submit(container.querySelector('form'));

    expect(window.alert).toHaveBeenCalledWith('Please add details about your item!');
  });

  it('requires a positive price before posting', async () => {
    createCreateListingMocks();

    const { container } = render(<CreateListing />);
    await fillValidCreateForm(container);
    await userEvent.type(screen.getByPlaceholderText('e.g. Calculus Textbook'), 'Desk Lamp');
    await userEvent.type(screen.getByPlaceholderText('Details about your item...'), 'Bright desk lamp');
    fireEvent.submit(container.querySelector('form'));

    expect(window.alert).toHaveBeenCalledWith('Please enter a valid price!');
  });

  it('requires quantity of at least one for new listings', async () => {
    createCreateListingMocks();

    const { container } = render(<CreateListing />);
    await fillValidCreateForm(container);
    await userEvent.type(screen.getByPlaceholderText('e.g. Calculus Textbook'), 'Desk Lamp');
    await userEvent.type(screen.getByPlaceholderText('0.00'), '149.99');
    await userEvent.clear(screen.getByPlaceholderText('1'));
    await userEvent.type(screen.getByPlaceholderText('1'), '0');
    await userEvent.type(screen.getByPlaceholderText('Details about your item...'), 'Bright desk lamp');
    fireEvent.submit(container.querySelector('form'));

    expect(window.alert).toHaveBeenCalledWith('Please enter a quantity of at least 1.');
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
          quantity: 1,
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

  it('loads an existing listing in edit mode and updates it successfully', async () => {
    const filledListing = {
      id: 'listing-1',
      title: 'Old Lamp',
      category_id: 1,
      description: 'Old description',
      price: 120.5,
      listing_type: 'sale',
      condition: 'Good',
      location: 'Main Campus',
      listing_images: [{ image_url: 'https://cdn.example.com/old.png', is_primary: true }]
    };

    const { listingUpdate } = createCreateListingMocks({
      listingData: filledListing
    });

    __setSearchParams('listing=listing-1');

    const { container } = render(<CreateListing />);
    const fileInput = container.querySelector('#pic-upload');
    await screen.findByText('Edit Listing');
    await screen.findByRole('option', { name: 'Books' });
    const [categorySelect, conditionSelect, campusSelect] = screen.getAllByRole('combobox');

    expect(screen.getByDisplayValue('Old Lamp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Old description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120.5')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Sale' })).toBeChecked();

    await userEvent.upload(fileInput, new File(['data'], 'camera.png', { type: 'image/png' }));
    const titleInput = screen.getByPlaceholderText('e.g. Calculus Textbook');
    const descriptionInput = screen.getByPlaceholderText('Details about your item...');
    const priceInput = screen.getByPlaceholderText('0.00');

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Desk Lamp');
    await userEvent.selectOptions(categorySelect, '1');
    await userEvent.selectOptions(conditionSelect, 'Like New');
    await userEvent.selectOptions(campusSelect, 'Med Campus');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '149.99');
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, 'Bright desk lamp');
    await userEvent.click(screen.getByRole('radio', { name: 'Trade' }));
    await userEvent.click(screen.getByRole('button', { name: 'Update Listing' }));

    await waitFor(() => {
      expect(listingUpdate).toHaveBeenCalledWith({
        title: 'Desk Lamp',
        category_id: 1,
        description: 'Bright desk lamp',
        price: 149.99,
        listing_type: 'trade',
        condition: 'Like New',
        location: 'Med Campus',
        quantity: 1,
        status: 'active'
      });
      expect(navigateMock).toHaveBeenCalledWith('/my-listings');
    });
  });

  it('shows an edit-mode load error when the listing cannot be found', async () => {
    createCreateListingMocks({
      listingData: null,
      listingError: { message: 'Missing listing' }
    });
    __setSearchParams('listing=listing-1');

    render(<CreateListing />);

    expect(await screen.findByText('Unable to load listing for editing.')).toBeInTheDocument();
  });

  it('marks an edited listing sold out when quantity is set to zero', async () => {
    const filledListing = {
      id: 'listing-1',
      seller_id: 'user-1',
      title: 'Old Lamp',
      category_id: 1,
      description: 'Old description',
      price: 120.5,
      listing_type: 'sale',
      condition: 'Good',
      location: 'Main Campus',
      quantity: 1,
      listing_images: [{ image_url: 'https://cdn.example.com/old.png', is_primary: true }]
    };

    const { listingUpdate } = createCreateListingMocks({ listingData: filledListing });
    __setSearchParams('listing=listing-1');

    render(<CreateListing />);

    await screen.findByText('Edit Listing');
    await screen.findByDisplayValue('Old Lamp');
    const quantityInput = screen.getByPlaceholderText('1');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '0');
    expect(screen.getByText('Setting quantity to 0 will mark this listing as sold out.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Update Listing' }));

    await waitFor(() => {
      expect(listingUpdate).toHaveBeenCalledWith(expect.objectContaining({
        quantity: 0,
        status: 'sold_out'
      }));
    });
  });

  it('blocks editing when the current user does not own the listing', async () => {
    const filledListing = {
      id: 'listing-1',
      seller_id: 'other-user',
      title: 'Old Lamp',
      category_id: 1,
      description: 'Old description',
      price: 120.5,
      listing_type: 'sale',
      condition: 'Good',
      location: 'Main Campus',
      quantity: 1,
      listing_images: [{ image_url: 'https://cdn.example.com/old.png', is_primary: true }]
    };

    createCreateListingMocks({ listingData: filledListing });
    __setSearchParams('listing=listing-1');

    render(<CreateListing />);

    await screen.findByText('Edit Listing');
    await screen.findByDisplayValue('Old Lamp');
    await userEvent.click(screen.getByRole('button', { name: 'Update Listing' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error: You are not authorized to update this listing.');
    });
  });

  it('shows a smart price suggestion and applies it', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: jest.fn().mockResolvedValue([{}, [{ value: 10 }]])
    });
    createCreateListingMocks({
      economicData: {
        base_new_price: 100,
        cpi_factor: 1.05,
        source_info: 'Database CPI'
      }
    });

    render(<CreateListing />);

    await screen.findByRole('option', { name: 'Books' });
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], '1');

    expect(await screen.findByText('UniMart Smart Price')).toBeInTheDocument();
    expect(screen.getByText('Suggested:')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Apply Suggestion' }));

    expect(screen.getByPlaceholderText('0.00')).toHaveValue(61);
    fetchSpy.mockRestore();
  });

  it('falls back to listed buckets when storage bucket upload fails', async () => {
    createCreateListingMocks({
      uploadError: { message: 'Bucket not found', statusCode: 404 },
      listBucketsResult: { data: [{ name: 'avatars' }], error: null }
    });
    const { container } = render(<CreateListing />);
    await fillValidCreateForm(container);
    await userEvent.type(screen.getByPlaceholderText('e.g. Calculus Textbook'), 'Desk Lamp');
    await userEvent.type(screen.getByPlaceholderText('0.00'), '149.99');
    await userEvent.type(screen.getByPlaceholderText('Details about your item...'), 'Bright desk lamp');
    await userEvent.click(screen.getByRole('button', { name: 'POST' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Available buckets: avatars'));
    });
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

  it('shows an error when creating the listing record fails', async () => {
    createCreateListingMocks({
      listingError: { message: 'Insert failed' }
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
      expect(window.alert).toHaveBeenCalledWith('Error: Insert failed');
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  it('renders safely when Supabase returns no categories', async () => {
    const mocks = createCreateListingMocks();
    mocks.categorySelect.mockResolvedValue({ data: null });

    render(<CreateListing />);

    expect(await screen.findByRole('button', { name: 'POST' })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('');
  });

  it('shows an error when the user session cannot be retrieved', async () => {
    createCreateListingMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'User missing' } });

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
      expect(window.alert).toHaveBeenCalledWith('Error: You must be signed in to post a listing.');
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });
});