import * as fs from 'fs';
import * as path from 'path';
import { Provide, Workspace } from '@jib/cli';
import * as YeomanEnv from 'yeoman-environment';

import { EOL } from 'os';
import { resolveDir } from './workspace';

import { BaseGenerator, IBaseGeneratorOptions, GENERATOR_DIR_NAME } from './core';

/**
 * Structure for a usage output for use in grid presentation
 */
export type IUsageTable = string[][];

/**
 * Object structure for a registered generator
 */
export interface IGeneratorUsage {
  name: string;
  description: string;
  options: IUsageTable;
  arguments: IUsageTable;
}

/**
 * Yeoman terminal adapter interface
 * @see http://yeoman.github.io/environment/TerminalAdapter.html
 */
export interface IYeomanAdapter extends YeomanEnv.Adapter {
}

/**
 * static name for generator namespace delimiter
 */
const NAMESPACE_DELIM = ':';

export interface IGeneratorEnvOptions {
  namespace?: string;
  /** absolute directory to generator implementations */
  generatorRoot: string;
}

/**
 * Generator environment adapter to be used for generator loading, usage, and
 * invocation.
 */
@Provide<GeneratorEnv>({
  factory: (from?: string) => GeneratorEnv.relativeTo(from || Workspace.commandsRoot()),
})
export class GeneratorEnv {

  /**
   * Create an instance relative to a fs path. Both a `generators` and a `templates`
   * directory must exist in a directory _above_ or _at_ the provided source
   * @param src path of file or directory from which the env is based
   * @param namespace generator namespace to use, if any
   */
  public static relativeTo(src: string, namespace?: string): GeneratorEnv {
    const generatorRoot = resolveDir(src, GENERATOR_DIR_NAME);
    return new this({
      namespace,
      generatorRoot,
    });
  }

  /**
   * Provide own yeoman adapter for logging/prompting
   * @param adapter
   */
  public static adapter(adapter: YeomanEnv.Adapter): void {
    this._adapter = adapter;
  }

  private static _adapter: YeomanEnv.Adapter;
  /** reference to the created yeoman environment */
  private _yo: YeomanEnv;

  constructor(private options: IGeneratorEnvOptions = {} as any) {
    const { generatorRoot } = options;
    if (!generatorRoot || !fs.existsSync(generatorRoot)) {
      throw new Error(`Invalid root directory for generators: '${generatorRoot}'`);
    }
  }

  /**
   * Reset the environment to clear registered generators
   */
  public reset(): this {
    this._yo = null;
    return this;
  }

  /**
   * list available generators by name. This method does not add the generators
   * to the environment, and is generally useful when validating user inputs that
   * lead to generator invocation.
   * @param name filter to a specific generator by name(s)
   */
  public list(name?: string | string[]): string[] {
    const { generatorRoot } = this.options;
    const filter: string[] = name ? [].concat(...[name]) : [];
    return fs.readdirSync(generatorRoot).filter(item => {
      const stat = fs.statSync(path.join(generatorRoot, item));
      return stat.isDirectory();
    }).filter(gen => filter.length ? ~filter.indexOf(gen) : true);
  }

  /**
   * Give the generators a namespace (prefix)
   * @param name the namespace to set
   */
  public namespace(name: string): this {
    this.options.namespace = name;
    return this;
  }

  /**
   * Create a `yeoman-environment` instance and register generators.
   * Loads all generators when no list is provided.
   * @param generators restricts to specific generator(s)
   * @see http://yeoman.io/authoring/integrating-yeoman.html
   * @see http://yeoman.io/environment/Environment.html
   */
  public load(generators?: string | string[]): this {
    const env: YeomanEnv = this._env();
    const { generatorRoot } = this.options;
    this.list(generators).forEach(gen => {
      env.register(path.join(generatorRoot, gen), this._namespaced(gen));
    });
    return this;
  }

  /**
   * Convenience method for loading all generator implementations in the workspace
   * same as `this.load()` with no arguments
   */
  public loadAll(): this {
    return this.load();
  }

  /**
   * get the generator usage text.
   * @param generator - filter to a specific generator
   * @see http://yeoman.io/generator/Generator.html#help
   */
  public usage(generators?: string | string[]): IGeneratorUsage[] {
    // collect help from the yo <generator> --help
    interface IUsageRef {
      name: string;
      ctor: typeof BaseGenerator;
      instance?: BaseGenerator;
    }

    this.load(generators);
    const env: YeomanEnv = this._yo;
    const usage: IGeneratorUsage[] = (env.namespaces() as string[])
      .map((ns: string) => ({ name: ns, ctor: env.get(ns) as any } as IUsageRef))
      .map((ref: IUsageRef) => ({ // instantiate the generator with --help
        ...ref,
        instance: env.instantiate(ref.ctor as any, {
          arguments: null,
          options: { help: true },
        }) as BaseGenerator,
      }))
      .map((ref: IUsageRef) => ({
        name: ref.name.split(NAMESPACE_DELIM).pop(),
        description: ref.instance.description,
        options: this._tabular(ref.instance.optionsHelp()).slice(1),
        arguments: this._tabular(ref.instance.argumentsHelp()),
      } as IGeneratorUsage));
    return usage;
  }

  /**
   * Invoke a generator registered with the environment
   * @param generator generator name to run
   * @param options options passed to the generator
   * @param args additional arguments to run inside the generator
   * @todo generator args can include both options and arguments to be parsed by the generator.
   */
  // tslint:disable-next-line:max-line-length
  public run<T extends IBaseGeneratorOptions = any>(generator: string, options: T = <T>{}, ...args: any[]): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await this._ensureEnv('run')
          ._yo.run([this._namespaced(generator)].concat(args), options, err => {
            return err ? reject(err) : resolve();
          });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Get registered generator namespace.
   * @param name the generator without prefix
   */
  private _namespaced(name: string) {
    const { namespace } = this.options;
    return `${namespace ? namespace + NAMESPACE_DELIM : ''}${name}`;
  }

  /**
   * Parse usage text into usable table structure
   * @param usage the plain usage text emitted by yeoman
   */
  private _tabular(usage: string): IUsageTable {
    return usage.trim().split(new RegExp(EOL + '+'))
      .filter(line => !!line)
      .map(line => {
        return line.trim()
          .replace(/(\-\w+),\s+([-\w]+)/, '$1, $2') // flags
          .split(/\s{2,}/) // tabs
          .map(col => col.replace(/^\#\s/, '')); // remove leading #
      });
  }

  /**
   * gets yeoman env
   */
  private _env(): YeomanEnv {
    const { _adapter } = this.constructor as typeof GeneratorEnv;
    const env: YeomanEnv = this._yo || YeomanEnv.createEnv([], {}, _adapter);
    this._yo = env;
    return env;
  }

  /**
   * Ensures the environment has been loaded, otherwise throws error
   * @param method method name being used
   * @throws when no environment is loaded
   */
  private _ensureEnv(method: string): this {
    if (!this._yo) {
      throw new Error(`Generators must be loaded before calling ${this.constructor.name}::${method}`);
    }
    return this;
  }

}
