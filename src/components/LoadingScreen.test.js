import { render, screen } from '@testing-library/react';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders the loading artwork and message', () => {
    render(<LoadingScreen />);

    expect(screen.getByAltText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading UniMart...')).toBeInTheDocument();
  });
});
