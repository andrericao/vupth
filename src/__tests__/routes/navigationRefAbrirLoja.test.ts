import { navigationRef, abrirLoja } from '@routes/navigationRef';

jest.mock('expo-secure-store');

// O "Escolher outro" e o "Agendar" do pedido de corte que venceu sem aceite
// (guia de texto, §4.6): os dois caminhos que o texto antigo só apontava.
const navigate = jest.fn();
let pronto = true;

beforeEach(() => {
  jest.clearAllMocks();
  pronto = true;
  jest.spyOn(navigationRef, 'isReady').mockImplementation(() => pronto);
  (navigationRef as unknown as { navigate: unknown }).navigate = navigate;
});

describe('abrirLoja', () => {
  it('sem profissional, abre a loja (a lista de quem atende)', () => {
    abrirLoja('e1');
    expect(navigate).toHaveBeenCalledWith('homeTab', {
      screen: 'establishmentDetail',
      pop: true,
      params: { establishmentId: 'e1' },
    });
  });

  it('com profissional, abre já nos serviços dele (o mesmo caminho do link ?profissional=)', () => {
    abrirLoja('e1', 'p1');
    expect(navigate).toHaveBeenCalledWith('homeTab', {
      screen: 'establishmentDetail',
      pop: true,
      params: { establishmentId: 'e1', profissional: 'p1' },
    });
  });

  it('com a navegação ainda não montada, não faz nada (best-effort)', () => {
    pronto = false;
    abrirLoja('e1', 'p1');
    expect(navigate).not.toHaveBeenCalled();
  });
});
