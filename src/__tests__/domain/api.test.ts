import { api } from '../../services/api';

describe('API Config', () => {
  it('deve ter baseURL apontando para Render (dev)', () => {
    expect(api.defaults.baseURL).toBe('https://vupth-backend-ia.onrender.com');
  });

  it('deve ter timeout de 30 segundos (Render hiberna)', () => {
    expect(api.defaults.timeout).toBe(30000);
  });

  it('deve ter Content-Type JSON', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});
