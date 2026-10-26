/* global jest */
// Sem o modulo nativo no jest: a tarefa em segundo plano (src/tasks) so e definida; quem testa o
// comportamento dela mocka o modulo no proprio teste (src/__tests__/tasks).
module.exports = {
  defineTask: jest.fn(),
  isTaskDefined: jest.fn(() => false),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
};
