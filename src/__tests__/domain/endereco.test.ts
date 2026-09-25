import { enderecoEmUmaLinha, linkDoMapa } from '@domain/establishment/endereco';
import { Address } from '@domain/establishment/types';

// Andre, 24/09: "não adianta o cliente querer marcar sem saber como chegar".

const end: Address = {
  street: 'Avenida Joaquim da Costa Lima', number: '300', neighborhood: 'Centro',
  city: 'Belford Roxo', state: 'RJ', zipCode: '26110000', latitude: -22.7642, longitude: -43.3997,
};

describe('endereço da loja', () => {
  it('cabe numa linha: rua, número · bairro, cidade', () => {
    expect(enderecoEmUmaLinha(end)).toBe('Avenida Joaquim da Costa Lima, 300 · Centro, Belford Roxo');
  });

  it('sem endereço, não inventa linha', () => {
    expect(enderecoEmUmaLinha(undefined)).toBeNull();
    expect(enderecoEmUmaLinha({ ...end, street: '' })).toBeNull();
  });

  it('com coordenada, o mapa vai direto ao ponto', () => {
    expect(linkDoMapa(end)).toBe('https://www.google.com/maps/search/?api=1&query=-22.7642,-43.3997');
  });

  it('sem coordenada, o mapa procura pelo endereço escrito', () => {
    const link = linkDoMapa({ ...end, latitude: undefined, longitude: undefined });
    expect(link).toContain('query=Avenida%20Joaquim%20da%20Costa%20Lima');
  });
});
