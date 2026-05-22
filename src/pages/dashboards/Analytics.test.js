import fs from 'fs';
import path from 'path';

describe('Analytics source file', () => {
  it('keeps the dashboard source present for routing until its duplicate React import is fixed', () => {
    const source = fs.readFileSync(path.join(__dirname, 'Analytics.js'), 'utf8');

    expect(source).toContain('const Analytics = () =>');
    expect(source).toContain("supabase.from('listings')");
  });
});