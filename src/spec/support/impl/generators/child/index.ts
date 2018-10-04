import { BaseGenerator, IBaseGeneratorOptions } from '../../';

class ChildGen extends BaseGenerator {
  constructor(...args: any[]) {
    super(...args);

    this.option('bar', {
      alias: 'f',
      description: 'bar-y option',
    }).option('hide', {
      hide: true,
    });

  }
}

export = ChildGen;
