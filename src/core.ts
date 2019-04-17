import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as Yeoman from 'yeoman-generator';
import { resolveDir } from './workspace';

/**
 * static name for generator and template directories
 */
export const [GENERATOR_DIR_NAME, TEMPLATE_DIR_NAME] = ['generators', 'templates'];

/**
 * Generator argument interface
 */
export interface IGeneratorArgument extends Yeoman.ArgumentConfig {
  /** Description for the argument */
  description?: string;
  /** whether it is required */
  required?: boolean;
  /** whether it is optional */
  optional?: boolean;
  /** expected argument type */
  type?: typeof String | typeof Number | typeof Array | typeof Object;
  /** Default value for this argument */
  default?: string | number | any[] | object;
}

/**
 * Generator option interface
 */
export interface IGeneratorOption extends Yeoman.OptionConfig {
  /** Option name alias (example `h` is an alias for `help`) */
  alias?: string;
  /** Description for the option */
  description?: string;
  /** The option type */
  type?: typeof Boolean | typeof String | typeof Number;
  /** Default value */
  default?: boolean | string | number;
  /** Boolean whether to omit from help & usage */
  hide?: boolean;
}

// /**
//  * Generator settings (custom)
//  */
// export interface IGeneratorSettings {
//   /** Flag whether or not the generator is a top-level generator */
//   IS_PROJECT: boolean;
// }

/** Options common to all generators */
export interface IBaseGeneratorOptions {
  skipInstall?: boolean;
}

/** Arguments defined for all generators */
export interface IBaseGeneratorArgs {
  /** none by default */
}

/** Base options for a sub generator */
export type SubGeneratorOptions = IBaseGeneratorOptions & {
  parent?: BaseGenerator;
};

export type IGeneratorCtor = new (...args: any[]) => BaseGenerator;

/**
 * Abstract generator from which others are based
 * @extends Yeoman
 */
export abstract class BaseGenerator<
  T extends IBaseGeneratorOptions = any,
  K extends IBaseGeneratorArgs = any> extends Yeoman {
  // yeoman ivars
  public config: Yeoman.Storage;
  public fs: Yeoman.MemFsEditor;
  public options: T;
  public arguments: K;

  /**
   * strips a pattern from the source template name to its final name. Useful
   * when templates include behavioral configuration files such as:
   * `package.json` and `.gitignore`. In such cases, use `__package.json` or
   * `__.gitignore` as the template name instead.
   */
  protected _templateNameStrip: string | RegExp = /^__/;

  constructor(args?: string|string[], options?: any) {
    super(args, options);
    // reset template source to the root templates directory
    const pathname = path.basename(this.sourceRoot().replace(new RegExp(`${TEMPLATE_DIR_NAME}[\W]?$`), ''));
    const templatesRoot = resolveDir(this.sourceRoot(), TEMPLATE_DIR_NAME);
    if (templatesRoot) {
      this.sourceRoot(path.join(templatesRoot, pathname));
    }

    // capture universal skip-install flag
    this.options.skipInstall = this.options.skipInstall || this.options['skip-install'] || false;

  }

  // ###################################
  // ###     Base Yeoman methods     ###
  // ###################################

  /**
   * log messages in yeoman runloop
   * @param message message to log
   * @param context context for message
   */
  public log(message: any, context?: any): void {
    return super.log(message, context);
  }

  /**
   * Specify arguments for the generator. Generally preferred in the constructor.
   * Arguments are assigned by name to the `this.options` hash.
   * See [documentation](http://yeoman.io/generator/Generator.html#argument) for
   * more information.
   * @param name Argument name
   * @param config Argument configuration
   *
   * ```ts
   * this.argument('prefix', {
   *   type: String,
   *   description: 'A prefix for the generated code',
   *   required: false,
   *   default: '',
   * });
   *
   * // read the argument
   * const prefix = this.options.prefix;
   * ```
   */
  public argument(name: string, config: IGeneratorArgument): this {
    return super.argument(name, config);
  }

  /**
   * Specify options for the generator. Generally preferred in teh constructor.
   * Options are assigned by camelCase name to the `this.options` hash.
   * See [documentation](http://yeoman.io/generator/Generator.html#option) for
   * more information.
   * @param name Option name
   * @param config Option configuration
   *
   * ```ts
   * this.option('language', {
   *   alias: 'l',
   *   type: String,
   *   description: 'specify output language',
   *   default: 'JavaScript',
   * });
   *
   * // read the option
   * const language = this.options.language;
   * ```
   */
  public option(name: string, config: IGeneratorOption): this {
    return super.option(name, config);
  }

  /**
   * Add a subgenerator run loop. Methods will be executed in parallel following
   * the standard yeoman run loop. Note that options.parent will be automatically
   * assigned as the generator from which the method is called. Options are also
   * inherited from the parent generator.
   * @param name subgenerator name registered in the GeneratorEnv
   * @param options options passed to the subgenerator instance
   */
  public composeWith(name: string, options: SubGeneratorOptions = {}): this {
    options.parent = this;
    return super.composeWith(name, {...this.options as any, ...options});
  }

  /**
   * Prompt for user input based on [inquirer](https://www.npmjs.com/package/inquirer)
   * @param prompts prompt question configurations
   */
  public prompt(prompts: Yeoman.Questions): Promise<Yeoman.Answers> {
    return super.prompt(prompts);
  }

  // ### Abstraction methods ###

  /**
   * Implementation to support common variables when any template is written
   * with the `_writeTemplates` method.
   */
  protected _commonTemplateVars(): any {
    return {};
  }

  /**
   * perform filename interpolation by replacing `{key}` with respective values
   * and `/^__/` automatically be applied.
   * @param filename - relative name of file.
   * @param vars - interpolation variables
   */
  protected _destinationFileName(filename: string, vars: { name?: string }): string {
    // replace placeholder file name (to not impact template repo)
    if (this._templateNameStrip) {
      filename = filename.replace(this._templateNameStrip, '');
    }
    // perform variable substitutions
    return Object.keys(vars)
      .reduce((str, key) => str.replace(`{${key}}`, vars[key]), filename);
  }

  /**
   * filter templates scanned from the template directory
   * @param src the template source relative to sourceRoot
   * @return false will omit the path
   */
  protected _templateFilter?(src: string): boolean {
    return true;
  }

  /**
   * Write templates into destination
   * @param src - source directory to scan
   * @param vars - interpolation object properties
   * @param recursive - flag to write recursively
   */
  protected _writeTemplates(src: string, vars: any = {}, recursive = true): void {
    // extend vars with some other static properties
    vars = {
      ...this._commonTemplateVars(),
      ...vars,
    };

    const dir = this.templatePath(src);
    fs.readdirSync(dir)
      .filter(item => this._templateFilter(path.join(src, item)))
      .forEach(item => {
        const relPath = path.join(src, item); // relative item path
        const srcPath = path.join(dir, item); // absolute path of the source from templates
        const toFile = this._destinationFileName(item, vars); // name of output file
        const toDest = path.join(src, toFile); // relative path in destination

        const stat = fs.statSync(srcPath);
        if (stat.isFile()) {

          // write template with value interpolation
          const destPath = this.destinationPath(toDest);
          this.fs.copyTpl(srcPath, destPath, vars);

          // transpile ts => js OTF (if javascript)
          // this.__transpileResult(destPath);

        } else if (recursive && stat.isDirectory()) {
          this._writeTemplates(relPath, vars, recursive);
        }
      });
  }

}
