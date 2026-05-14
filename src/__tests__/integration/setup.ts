import MockAdapter from 'axios-mock-adapter';
import { api } from '../../services/api';

export const mock = new MockAdapter(api);

afterEach(() => mock.reset());
afterAll(() => mock.restore());
