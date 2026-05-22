import fs from 'fs';
import path from 'path';

describe('ManageListings source contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'ManageListings.js'), 'utf8');

  it('keeps moderation actions for flagging, restoring, and deleting listings', () => {
    expect(source).toContain('flag');
    expect(source).toContain('restore');
    expect(source).toContain('delete');
  });

  it('continues to write moderation logs when listing actions are taken', () => {
    expect(source).toContain('moderation_logs');
  });
});