import * as fs from 'fs';
import * as path from 'path';
import * as Yeoman from 'yeoman-generator';
import { BaseGenerator } from '../core';
// const Tester: any = require('yeoman-test');
import * as Tester from 'yeoman-test';

export const assertGeneratedFiles = (outputDir: string, files: string[], not?: boolean): void => {
  // console.log(outputDir, fs.readdirSync(outputDir));
  [outputDir]
    .concat(files.map(file => path.join(outputDir, file)))
    .forEach(file => {
      expect(fs.existsSync(file))
        .toBe(not ? false : true, `${path.relative(outputDir, file)} ${not ? '' : 'not'} found`);
    });
};

describe('BaseGenerator', () => {
  // stubable generator impl
  class StubGen extends BaseGenerator {
    public description = 'Custom generator impl';
    constructor(...args: any[]) {
      super(...args);
      this.sourceRoot(path.join(__dirname, 'support', 'stub', 'templates'));
      this._setup(this);
    }
    public async initializing() { }
    public async configuring() { }
    public async prompting() { }
    public async writing() { }
    public async installing() { }
    protected _other(): void { /* should not execute in run loop*/ }
    private _setup(gen: this): void { }
  }

  describe('Testing', () => {
    it('should be compatible with yeoman test', done => {
      const init = spyOn(StubGen.prototype, 'initializing');
      const conf = spyOn(StubGen.prototype, 'configuring');
      const write = spyOn(StubGen.prototype, 'writing');
      const other = spyOn(StubGen.prototype as any, '_other');
      Tester.run(StubGen)
        .then((generated: Tester.RunResult) => {
          expect(init).toHaveBeenCalledBefore(conf);
          expect(conf).toHaveBeenCalledBefore(write);
          expect(other).not.toHaveBeenCalled(); // avoid _ prefix methods
        }).then(done).catch(done.fail);
    });

    it('should support options and arguments', done => {
      let instance: StubGen;
      // hook on setup
      spyOn(StubGen.prototype as any, '_setup').and.callFake((gen: StubGen) => {
        gen.option('foo', {
          type: Boolean,
          default: false,
        }).option('bar', {
          type: String,
        }).argument('myarg', {
          type: String,
        });
      });
      Tester.run(StubGen)
        .on('ready', (generator: StubGen) => instance = generator)
        .withOptions({bar: 'baz'})
        .withArguments('argue')
        .then((generated: Tester.RunResult) => {
          // check option that uses default
          expect(instance.options.foo).toBe(false, 'default option value was not used');
          expect(instance.options.bar).toEqual('baz', 'provided option was not assigned');
          expect(instance.options.myarg).toEqual('argue', 'argument was not interpreted');
        }).then(done).catch(done.fail);
    });

    it('should seed prompts', done => {
      let instance: StubGen;
      let answers: any;
      spyOn(StubGen.prototype, 'prompting').and.callFake(() => instance.prompt({
        name: 'question',
        type: 'input',
      }).then(ans => answers = ans));
      Tester.run(StubGen)
        .on('ready', (generator: StubGen) => instance = generator)
        .withPrompts({question: 'mock answer'})
        .then(() => {
          expect(answers.question).toEqual('mock answer');
        })
        .then(done).catch(done.fail);
    });
  });

  describe('Composability', () => {
    it('should transfer options to subgenerators', done => {
      let instance: StubGen;
      let options: any;
      const compose = spyOn(Yeoman.prototype, 'composeWith').and
        .callFake((sub: string, opts: any) => options = opts);
      spyOn(StubGen.prototype, 'configuring').and.callFake(() => {
        instance.composeWith('foo');
      });
      Tester.run(StubGen)
        .on('ready', (generator: StubGen) => instance = generator)
        .withOptions({force: true})
        .then(() => {
          expect(compose).toHaveBeenCalled();
          expect(options.parent instanceof StubGen).toBe(true);
          expect(options.force).toBe(true);
        })
        .then(done).catch(done.fail);

    });
  });

  describe('Templating', () => {
    it('should write templates', done => {
      let instance: StubGen;
      const interpol = {
        project: 'Superduper',
        description: 'My super duper generated project',
      };
      spyOn(StubGen.prototype, 'writing').and.callFake(() => {
        instance['_writeTemplates']('', interpol);
        instance['_writeTemplates']('src', undefined, false);
      });
      Tester.run(StubGen)
        .on('ready', (generator: StubGen) => instance = generator)
        .then((generated: Tester.RunResult) => {
          // console.log(generated);
          // generated.a
          // generated.ass
          assertGeneratedFiles(generated.cwd, [
            'package.json',
            'test.md',
            'src/foo.txt',
          ]);
          const md = fs.readFileSync(path.join(generated.cwd, 'test.md'));
          expect(`${md}`).toContain(interpol.project);
          expect(`${md}`).toContain(interpol.description);
        })
        .then(done).catch(done.fail);
    });
  });

});
