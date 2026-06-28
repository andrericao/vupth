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

// Forma REAL retornada pelo backend (UserAddressResponse): userAddressId / isMain
// — nao `id` / `main`. Os mocks abaixo refletem o contrato real para travar
// regressao do bug "Invalid value for parameter 'userAddressId'".
describe('AddressService', () => {
  it('create deve enviar POST /users/me/addresses', async () => {
    mock
      .onPost('/users/me/addresses')
      .reply(201, { userAddressId: 'addr-1', isMain: false, ...address });

    const { data } = await addressService.create(address, token);
    expect(data.userAddressId).toBe('addr-1');
  });

  it('list deve retornar enderecos com userAddressId e isMain', async () => {
    mock.onGet('/users/me/addresses').reply(200, [
      { userAddressId: 'addr-1', isMain: true, ...address },
      { userAddressId: 'addr-2', isMain: false, ...address, street: 'Av Brasil' },
    ]);

    const { data } = await addressService.list(token);
    expect(data).toHaveLength(2);
    expect(data[0].userAddressId).toBe('addr-1');
    expect(data[0].isMain).toBe(true);
  });

  it('update deve enviar PATCH /users/me/addresses/:id', async () => {
    mock
      .onPatch('/users/me/addresses/addr-1')
      .reply(200, { userAddressId: 'addr-1', isMain: false, ...address, number: '456' });

    const { data } = await addressService.update('addr-1', { ...address, number: '456' }, token);
    expect(data.number).toBe('456');
  });

  it('getMain deve retornar endereco principal', async () => {
    mock
      .onGet('/users/me/addresses/main')
      .reply(200, { userAddressId: 'addr-1', isMain: true, ...address });

    const { data } = await addressService.getMain(token);
    expect(data.isMain).toBe(true);
    expect(data.userAddressId).toBe('addr-1');
  });

  it('setMain deve enviar PATCH /users/me/addresses/:id/main', async () => {
    mock.onPatch('/users/me/addresses/addr-2/main').reply(200, 'Address set as main');

    const { status } = await addressService.setMain('addr-2', token);
    expect(status).toBe(200);
  });

  it('remove deve enviar DELETE /users/me/addresses/:id com o id recebido', async () => {
    let calledUrl = '';
    mock.onDelete('/users/me/addresses/addr-1').reply((config) => {
      calledUrl = config.url ?? '';
      return [200];
    });

    const { status } = await addressService.remove('addr-1', token);
    expect(status).toBe(200);
    // guarda a regressao: a URL nao pode conter "undefined" (bug do addr.id ausente)
    expect(calledUrl).toBe('/users/me/addresses/addr-1');
    expect(calledUrl).not.toContain('undefined');
  });

  it('deve enviar Authorization header em todas as chamadas', async () => {
    mock.onGet('/users/me/addresses').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [200, []];
    });

    await addressService.list('my-token');
  });
});
