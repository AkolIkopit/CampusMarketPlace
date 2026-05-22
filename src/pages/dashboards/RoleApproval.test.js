import fs from 'fs';
import path from 'path';

describe('RoleApproval source contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'RoleApproval.js'), 'utf8');

  it('keeps approval and rejection flows connected to role applications', () => {
    expect(source).toContain('role_applications');
    expect(source).toContain('approved');
    expect(source).toContain('rejected');
  });

  it('keeps staff roster synchronization for approved staff applications', () => {
    expect(source).toContain('staff_roster');
  });
});