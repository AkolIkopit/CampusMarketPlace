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
    { reason_category: 'Scam' },
    { reason_category: 'Fraud' }
  ];

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return { select: jest.fn().mockResolvedValue({ data: listings }) };
    }
    if (table === 'moderation_logs') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: flags })
        }))
      };
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

    expect(await screen.findByText('Administrative Insights')).toBeInTheDocument();
    expect(screen.getByText('Marketplace Health')).toBeInTheDocument();
    expect(screen.getByText('Popular Categories')).toBeInTheDocument();
    expect(screen.getByText('Trade Facility Utilization (Slot Summary)')).toBeInTheDocument();
    expect(screen.getByText('Flagging Reasons')).toBeInTheDocument();
  });

  it('fetches data from listings and moderation logs on mount', async () => {
    createAnalyticsMocks();

    render(<Analytics />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('listings');
      expect(supabase.from).toHaveBeenCalledWith('moderation_logs');
    });
  });

  it('navigates back when the Back to Panel button is clicked', async () => {
    createAnalyticsMocks();

    render(<Analytics />);

    await screen.findByText('Administrative Insights');

    await userEvent.click(screen.getByText('Back to Panel'));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders export buttons for each chart section', async () => {
    createAnalyticsMocks();

    render(<Analytics />);

    await screen.findByText('Administrative Insights');

    const exportButtons = document.querySelectorAll('.export-btn');

    expect(exportButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('triggers CSV export when the CSV button is clicked', async () => {
    createAnalyticsMocks();

    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<Analytics />);

    await screen.findByText('Administrative Insights');
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('listings'));

    const csvButtons = Array.from(document.querySelectorAll('.export-btn'));
    await userEvent.click(csvButtons[0]);

    expect(createObjectURLSpy).toHaveBeenCalled();

    createObjectURLSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
