import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Analytics from './Analytics';
import { supabase } from '../../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

// recharts uses ResizeObserver; mock it with a static size
jest.mock('recharts', () => {
  const React = require('react');
  const stub = ({ children }) => React.createElement('div', null, children);
  return {
    ResponsiveContainer: ({ children }) =>
      React.createElement('div', { style: { width: 500, height: 300 } }, children),
    PieChart: stub,
    Pie: stub,
    Cell: stub,
    BarChart: stub,
    Bar: stub,
    AreaChart: stub,
    Area: stub,
    XAxis: stub,
    YAxis: stub,
    CartesianGrid: stub,
    Tooltip: stub,
    Legend: stub
  };
});

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    autoTable: jest.fn(),
    save: jest.fn()
  }));
});

jest.mock('jspdf-autotable', () => {});

function createAnalyticsMocks() {
  const listings = [
    { id: '1', category_id: 1, categories: { name: 'Books' } },
    { id: '2', category_id: 1, categories: { name: 'Books' } },
    { id: '3', category_id: 2, categories: { name: 'Electronics' } }
  ];
  const flags = [
    { status: 'approved' },
    { status: 'pending' },
    { status: 'pending' },
    { status: 'rejected' }
  ];

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return { select: jest.fn().mockResolvedValue({ data: listings }) };
    }
    if (table === 'role_applications') {
      return { select: jest.fn().mockResolvedValue({ data: flags }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe('Analytics', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
  });

  it('renders the page heading and section titles', async () => {
    createAnalyticsMocks();

    render(<Analytics />);

    expect(await screen.findByText('Report Hub')).toBeInTheDocument();
    expect(screen.getByText('Popular Categories')).toBeInTheDocument();
    expect(screen.getByText('Facility Usage')).toBeInTheDocument();
    expect(screen.getByText('Moderation Activity')).toBeInTheDocument();
  });

  it('fetches data from listings and role_applications on mount', async () => {
    createAnalyticsMocks();

    render(<Analytics />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('listings');
      expect(supabase.from).toHaveBeenCalledWith('role_applications');
    });
  });

  it('navigates back when the Back to Panel button is clicked', async () => {
    createAnalyticsMocks();

    render(<Analytics />);

    await screen.findByText('Report Hub');

    await userEvent.click(screen.getByText('Back to Panel'));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders export buttons for each chart section', async () => {
    createAnalyticsMocks();

    render(<Analytics />);

    await screen.findByText('Report Hub');

    // Each section has CSV and PDF export buttons (3 sections = 6 export buttons)
    const csvButtons = screen.getAllByTitle('CSV');
    const pdfButtons = screen.getAllByTitle('PDF');

    expect(csvButtons.length).toBeGreaterThanOrEqual(1);
    expect(pdfButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('triggers CSV export when the CSV button is clicked', async () => {
    createAnalyticsMocks();

    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<Analytics />);

    await screen.findByText('Report Hub');
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('listings'));

    const csvButtons = screen.getAllByTitle('CSV');
    await userEvent.click(csvButtons[0]);

    expect(createObjectURLSpy).toHaveBeenCalled();

    createObjectURLSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
