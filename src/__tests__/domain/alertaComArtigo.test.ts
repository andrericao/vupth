import { Alert, Linking } from 'react-native';

import { alertaComArtigo } from '@utils/alertaComArtigo';
import { SUPORTE_URL } from '@utils/suporte';

type Botao = { text: string; style?: string; onPress?: () => void };

describe('alertaComArtigo()', () => {
  let alerta: jest.SpyInstance;
  let abrir: jest.SpyInstance;
  beforeEach(() => {
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => {
    alerta.mockRestore();
    abrir.mockRestore();
  });

  const botoesDaChamada = (n = 0) => alerta.mock.calls[n][2] as Botao[];

  it('põe o Saiba mais por ÚLTIMO: o índice dos botões que já existiam não muda', () => {
    const entendi = jest.fn();
    alertaComArtigo('t', 'm', [{ text: 'Adiar' }, { text: 'Entendi', onPress: entendi }], 'atraso');
    const botoes = botoesDaChamada();
    expect(botoes.map((b) => b.text)).toEqual(['Adiar', 'Entendi', 'Saiba mais']);
    botoes[1].onPress?.();
    expect(entendi).toHaveBeenCalledTimes(1);
  });

  it('repassa título, mensagem e opções (cancelable: false continua valendo)', () => {
    alertaComArtigo('Título', 'Mensagem', [{ text: 'Entendi' }], 'atraso', { cancelable: false });
    expect(alerta).toHaveBeenCalledWith('Título', 'Mensagem', expect.any(Array), { cancelable: false });
  });

  it('Saiba mais abre o artigo e mostra o aviso de novo, com os mesmos botões', () => {
    alertaComArtigo('t', 'm', [{ text: 'Entendi' }], 'atraso', { cancelable: false });
    botoesDaChamada()[1].onPress?.();
    expect(abrir).toHaveBeenCalledWith(`${SUPORTE_URL}artigos/cliente/atrasos.html`);
    expect(alerta).toHaveBeenCalledTimes(2);
    expect(botoesDaChamada(1).map((b) => b.text)).toEqual(['Entendi', 'Saiba mais']);
    expect(alerta.mock.calls[1][3]).toEqual({ cancelable: false });
  });

  it('sem cancel nem destrutivo, o Saiba mais é "cancel" (vazado); senão, "default"', () => {
    alertaComArtigo('t', 'm', [{ text: 'Entendi' }], 'atraso');
    expect(botoesDaChamada(0)[1].style).toBe('cancel');
    alertaComArtigo('t', 'm', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair' }], 'sairDaFila');
    expect(botoesDaChamada(1)[2].style).toBe('default');
    alertaComArtigo('t', 'm', [{ text: 'Sair', style: 'destructive' }], 'sairDaFila');
    expect(botoesDaChamada(2)[1].style).toBe('default');
  });
});
