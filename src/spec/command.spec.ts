import * as path from 'path';
import { CLI } from '@jib/cli';

describe('Generator Command', () => {

  let program: CLI;
  const run = (...args: any[]): Promise<void> => program.parse(['node', 'cli'].concat(args));
  const impl: string = path.join(__dirname, 'support', 'impl');
  beforeAll(() => {
    try {
      program = new CLI({
        baseDir: impl,
        rootCommand: 'init',
      });
    } catch (e) {
      console.log(e);
    }
  });

  it('should run a generator', done => {
    run().then(() => {
      console.log('RAN A GENERATOR');
    }).then(done).catch(done.fail);
  });
});
