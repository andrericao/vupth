import { api } from '../../services/api';

const VALID_URLS = [
  'http://localhost:8080',
  'https://vupth-backend-ia.onrender.com',
  'https://vupth-backend-ia-production.up.railway.app',
];

describe('API Config', () => {
  it('deve ter baseURL apontando para um ambiente válido', () => {
    expect(VALID_URLS).toContain(api.defaults.baseURL);
  });

  it('deve ter timeout configurado', () => {
    expect(api.defaults.timeout).toBeGreaterThanOrEqual(10000);
    expect(api.defaults.timeout).toBeLessThanOrEqual(30000);
  });

  it('deve ter Content-Type JSON', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});
