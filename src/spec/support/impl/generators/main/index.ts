import { BaseGenerator } from '../../';

class MainGen extends BaseGenerator {
  constructor(...args: any[]) {
    super(...args);

    this.option('foo', {
      alias: 'f',
      description: 'fooey option',
      type: String,
    }).option('hidden', {
      hide: true,
      type: Boolean,
    }).argument('prefix', {
      type: String,
      description: 'Code prefix',
      default: '',
    });
  }

  // public usage(): string {
  //   try {
  //     throw new Error();
  //   } catch (e) {
  //     console.log(e);
  //   }
  //   return;
  // }

  public initializing(): Promise<any> {
    return Promise.resolve('ready');
  }

  public end(): void {
    // stubbable
  }

}

export = MainGen;
