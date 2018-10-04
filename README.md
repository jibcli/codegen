# The jib CodeGen Plugin

Adds flexible, simplified support for [`yeoman`](http://yeoman.io) (source code)
generators within a [`@jib/cli`](https://github.com/jibcli/cli) project.


[![npm version](https://badge.fury.io/js/%40jib%codegen.svg)](https://badge.fury.io/js/%40jib%codegen)
[![wercker status](https://app.wercker.com/status/2e560723c44622e5b42623fc55c613f9/s/master "wercker status")](https://app.wercker.com/project/byKey/2e560723c44622e5b42623fc55c613f9)
[![codecov](https://codecov.io/gh/jibcli/codegen/branch/master/graph/badge.svg)](https://codecov.io/gh/jibcli/codegen)
[![GitHub license](https://img.shields.io/github/license/jibcli/codegen.svg)](https://github.com/jibcli/codegen/blob/master/LICENSE)
[![install size](https://packagephobia.now.sh/badge?p=@jib/codegen)](https://packagephobia.now.sh/result?p=@jib/codegen)

Technically this package could be used as a standalone plugin to other CLI
frameworks, however it is designed to work in accordance with the `@jib/cli`
opinions and applicaton structure.

## Usage

```shell
npm install @jib/codegen
```

### Implementation

This plugin adds source code generators shipped directly within the CLI
itself. Integrating the plugin with `@jib/cli` project follows a _slightly_
different pattern than what one might expect if already familiar with
yeoman.

#### Structure

With jib, or TypeScript in general, the `generators` code is part of `src`
whereas `templates` is somewhere outside that in the hierarchy. This is because
`src` is the TypeScript source code and is _normally_ excluded when the project
is built/packaged/published. In the case of yeoman, `templates` can contain
anything, and should also be distributed with the project build.

```text
├── package.json
├── src
│   ├── commands
│   │   └── init
│   │       └── project.ts
│   └── generators
│       └── project
│           ├── index.ts
│           └── project.ts
└── templates
    └── project
        └── README.md
```

> In the tree above, there is a single generator called `project`, and corresponding
subdirectories in `src/generators/project` as well as `templates/project`.

#### In Commands

Considering the [structure](#structure) shown above, one would implement a generator
in the following way:

```typescript
// commands/init/project
import { Plugin, Command, BaseCommand } from '@jib/cli';
import { GeneratorEnv } from '@jib/codegen';

@Command({
  description: 'Sample command usage of @jib/codegen plugin',
  allowUnknown: true, // allows any options from the generator to be passed
})
export class InitProject extends BaseCommand {

  // load the plugin
  @Plugin(GeneratorEnv)
  private _codegen: GeneratorEnv;

  public help(): void {
    // get usage and append help text
    const usage = this._codegen.usage('project')[0];
    this.ui.outputSection(`Generator Options`, this.ui.grid(usage.options));
  }

  public async run(options: any, ...args: any[]) {
     // do things with this._gen
     await this._codegen.load() // load the generator enviroment
      .run('project', options, args) // run the `project` generator
  }
}
```

#### Generator Code

This project adds only a few simple abstractions onto the
[`Generator`](http://yeoman.io/generator/Generator.html) class maintainted by Yeoman,
and does not change standard behavior in any way. As such, you're encouraged to
reference their docs accordingly.

While not required, it's yeoman expects an `index.ts` file in each generator directory
that exports **only** the `Generator` implementation. This might look something
like the following:

```typescript
// generators/project/index.ts
import { ProjectGenerator } from './project';
export = ProjectGenerator;
```

```typescript
// generators/project/project.ts
import { BaseGenerator, IBaseGeneratorOptions } from '@jib/codejen';

export interface IProjectGeneratorOptions extends IBaseGeneratorOptions {
  name: string;
  description: string;
}

export class ProjectGenerator extends BaseGenerator<IProjectGeneratorOptions> {
  constructor(...args: any[]) {
    super(...args);
    this.option('name', {type: String, description: 'The new project name'})
      .option('description', {type: String, description: 'Description for the project'})
  }
  // ...
}
```

This approach is particularly useful with generator
[composability](http://yeoman.io/authoring/composability.html), where child
generators have exported interfaces for their options, etc.

## TODOs

- [ ] Create `@Generator()` decorator mapping `@jib/cli` option/argument annotations to the generator abstract