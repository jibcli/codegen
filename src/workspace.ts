import * as fs from 'fs';
import * as path from 'path';

/**
 * resolve a file or directory in the project workspace
 * @param from starting directory or file path
 * @param name file name to resolve
 * @param parent parent directory (of last call)
 * @internal
 */
function _resolveFile(from: string, name: string, parent?: string): string {
  const fp: string = path.join(from, name);
  if (fs.existsSync(fp)) {
    return fp;
  } else if (from !== parent) { // `dir === parent` when traversal tops out
    return _resolveFile(path.dirname(from), name, from);
  }
}

/**
 * resolve a file upwards in the project workspace
 * @param from starting directory or file path
 * @param name file name to resolve
 */
export function resolveFile(from: string, name: string) {
  return _resolveFile(from, name);
}

/**
 * resolve a directory upwards in the project workspace
 * @param from starting directory or file path
 * @param name directory name to resolve
 */
export function resolveDir(from: string, name: string): string {
  return _resolveFile(from, name);
}
