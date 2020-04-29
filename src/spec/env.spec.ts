import * as path from 'path';
import { GeneratorEnv, GENERATOR_DIR_NAME } from '../';
import MainGenerator = require('./support/impl/generators/main');
import { IGeneratorUsage, IYeomanAdapter } from '../env';
import { Answers, Questions } from 'yeoman-generator';

describe('GeneratorEnv', () => {

  let env: GeneratorEnv;
  const impl: string = path.join(__dirname, 'support', 'impl');
  beforeAll(() => env = GeneratorEnv.relativeTo(impl));

  it('should create with namespace', () => {
    const gen = GeneratorEnv.relativeTo(impl, 'test');
    gen.load('main');
    expect(gen['_yo'].namespaces()).toContain(`test:main`);
    expect(gen['_yo'].get(`test:main`)).toBe(MainGenerator);
    // change and load again
    gen.namespace('foo').load('main');
    expect(gen['_yo'].namespaces()).toContain(`foo:main`);
    expect(gen['_yo'].get(`foo:main`)).toBe(MainGenerator);
  });

  it('should throw on invalid workspace', () => {
    const malo = () => GeneratorEnv.relativeTo('/etc/passwd');
    const malo2 = () => new GeneratorEnv();
    expect(malo).toThrow();
    expect(malo2).toThrow();
  });

  it('should resolve generators directory', () => {
    expect(env['options'].generatorRoot).toContain(impl);
    expect(env['options'].generatorRoot).toMatch(new RegExp(`${GENERATOR_DIR_NAME}$`));
  });

  it('should list generators by name', () => {
    const gens = env.list();
    expect(gens.length).toBeGreaterThan(0);
    expect(gens).toContain('main');
  });

  describe('Usage', () => {
    it('should create usage object', () => {
      const usage: IGeneratorUsage[] = env.reset().loadAll().usage();
      expect(usage).toEqual(jasmine.any(Array), 'usage should be an array');
      expect(usage.length).toBeGreaterThan(0, 'no usage was created');
      expect(usage.filter(use => use.name === 'main').length).toBe(1, 'name was not used');
      usage.forEach(use => {
        expect(use.name).toBeDefined();
        expect(use.description).toBeDefined();
        expect(use.options).toEqual(jasmine.any(Array));
        expect(use.arguments).toEqual(jasmine.any(Array));

        // do some impl-specific assertions
        if (use.name === 'main') {
          const lastOpt = use.options.slice().pop();
          expect(lastOpt).toEqual(jasmine.any(Array));
          expect(lastOpt[0]).toBe('-f, --foo');
          const firstArg = use.arguments.slice().shift();
          expect(firstArg).toEqual(jasmine.any(Array));
          expect(firstArg[0]).toBe('prefix');
        }
      });
    });
  });

  describe('Running Generators', () => {

    it('should reject run when not loaded', done => {
      env.reset()
        .run('foo', {})
        .then(() => Promise.reject('Supposed to fail'), () => { /*noop*/ })
        .then(done).catch(done.fail);
    });

    it('should fail unknown generator', done => {
      env.reset()
        .load('main')
        .run('child', null)
        .then(() => Promise.reject('Supposed to fail'), () => { /*noop*/ })
        .then(done).catch(done.fail);
    });

    it('should reject when generator throws', done => {
      spyOn(MainGenerator.prototype, 'initializing').and.throwError('whoops');
      env.reset()
        .load('main')
        .run('main', null)
        .then(() => Promise.reject('Supposed to fail'), e => {
          expect(e).toBeDefined();
          expect(e.message).toContain('whoops');
        })
        .then(done).catch(done.fail);
    });

    it('should resolve after run loop completes', done => {
      let ended = false;
      const main = spyOn(MainGenerator.prototype, 'end').and.callFake(async () => {
        ended = true;
        await Promise.resolve(null);
      });

      env.reset()
        .load('main')
        .run('main', null)
        .then(() => {
          expect(main).toHaveBeenCalled();
          expect(ended).toBe(true);
        }).then(done).catch(done.fail);
    });

    it('should support custom adapters', done => {
      const adapter: any = {
        log: (msg: any) => {},
        prompt: (q: Questions) => Promise.resolve<Answers>({}),
      };
      const log = spyOn(adapter, 'log').and.callThrough();
      const prompt = spyOn(adapter, 'prompt').and.callThrough();

      GeneratorEnv.adapter(adapter);
      env.reset()
        .load('child')
        .run('child')
        .then(() => {
          expect(log).toHaveBeenCalledWith(jasmine.stringMatching(/hi/i));
          expect(prompt).toHaveBeenCalledWith(jasmine.any(Object));
        }).then(done).catch(done.fail);
    });
  });

});
