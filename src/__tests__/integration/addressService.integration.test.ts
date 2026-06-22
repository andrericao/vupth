import { mock } from './setup';
import { addressService } from '../../services/addressService';

const token = 'test-token';
const address = {
  street: 'Rua das Flores',
  number: '123',
  neighborhood: 'Centro',
  city: 'Sao Paulo',
  state: 'SP',
  zipCode: '01310100',
};

describe('AddressService', () => {
  it('create deve enviar POST /users/me/addresses', async () => {
    mock.onPost('/users/me/addresses').reply(201, { id: 'addr-1', ...address, main: false });

    const { data } = await addressService.create(address, token);
    expect(data.id).toBe('addr-1');
  });

  it('list deve retornar enderecos do usuario', async () => {
    mock.onGet('/users/me/addresses').reply(200, [
      { id: 'addr-1', ...address, main: true },
      { id: 'addr-2', ...address, street: 'Av Brasil', main: false },
    ]);

    const { data } = await addressService.list(token);
    expect(data).toHaveLength(2);
    expect(data[0].main).toBe(true);
  });

  it('update deve enviar PATCH /users/me/addresses/:id', async () => {
    mock.onPatch('/users/me/addresses/addr-1').reply(200, { id: 'addr-1', ...address, number: '456' });

    const { data } = await addressService.update('addr-1', { ...address, number: '456' }, token);
    expect(data.number).toBe('456');
  });

  it('getMain deve retornar endereco principal', async () => {
    mock.onGet('/users/me/addresses/main').reply(200, { id: 'addr-1', ...address, main: true });

    const { data } = await addressService.getMain(token);
    expect(data.main).toBe(true);
  });

  it('setMain deve enviar PATCH /users/me/addresses/:id/main', async () => {
    mock.onPatch('/users/me/addresses/addr-2/main').reply(200, 'Address set as main');

    const { status } = await addressService.setMain('addr-2', token);
    expect(status).toBe(200);
  });

  it('remove deve enviar DELETE /users/me/addresses/:id', async () => {
    mock.onDelete('/users/me/addresses/addr-1').reply(200);

    const { status } = await addressService.remove('addr-1', token);
    expect(status).toBe(200);
  });

  it('deve enviar Authorization header em todas as chamadas', async () => {
    mock.onGet('/users/me/addresses').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [200, []];
    });

    await addressService.list('my-token');
  });
});
