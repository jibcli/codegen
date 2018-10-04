import { GeneratorEnv } from '../';
// import { InitGen } from './support/impl/commands/init';
describe('Plugin', () => {
  it('should be injectable', () => {
    // const factory = spyOn(GeneratorEnv, 'relativeTo').and.callThrough();
    const { InitGen } = require('./support/impl/commands/init');
    // instantiate command
    const init = new InitGen();
    // expect(factory).toHaveBeenCalled();
    expect(init.gen instanceof GeneratorEnv).toBe(true);
  });
});
