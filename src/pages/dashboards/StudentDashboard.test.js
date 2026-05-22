import fs from 'fs';
import path from 'path';

describe('StudentDashboard source contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'StudentDashboard.js'), 'utf8');

  it('keeps the student quick-action destinations wired in the dashboard source', () => {
    expect(source).toContain('/my-listings');
    expect(source).toContain('/messages');
    expect(source).toContain('/create-listing');
  });

  it('keeps the role application and unread message flows present', () => {
    expect(source).toContain('role_applications');
    expect(source).toContain('messages');
  });
});