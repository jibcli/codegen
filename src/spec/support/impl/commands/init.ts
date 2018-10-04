import { Plugin, Command, BaseCommand } from '@jib/cli';
import { GeneratorEnv } from '../';

@Command({
  description: 'Sample command usage of @jib/codegen plugin',
})
export class InitGen extends BaseCommand {

  @Plugin(GeneratorEnv, __dirname)
  public gen: GeneratorEnv;

  public async run(options: any, ...args: any[]) {
    return this.gen.load()
      .run('main', {});
  }
}
