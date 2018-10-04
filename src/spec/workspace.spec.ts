import * as path from 'path';
import { resolveDir, resolveFile } from '../workspace';

describe('Workspace', () => {
  it('should resolve a file', () => {
    expect(resolveFile(__dirname, 'package.json')).toContain('package.json');
    expect(resolveFile(__dirname, 'tsconfig.json')).toBeTruthy();
  });

  it('should resolve a directory', () => {
    const dir = resolveDir(__dirname, 'src');
    expect(dir).toBeTruthy();
    expect(path.basename(dir)).toEqual('src');
  });

  it('should not resolve unresolvable', () => {
    expect(resolveDir(__dirname, Math.random().toString())).toBeFalsy();
  });
});
