import { BackHandler } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { DialogoVupth } from '@components/DialogoVupth';
import { abrirDialogo, useDialogoStore } from '@stores/dialogo.store';

// Teste do Andre de 25/09: num aviso só com "OK", o voltar do Android levou a
// TELA de volta e o diálogo ficou por cima. E o aviso de atraso, que pede
// `cancelable: false`, era dado como lido pelo voltar.

let handler: (() => boolean) | null = null;

describe('o voltar do Android com um diálogo na tela', () => {
  beforeEach(() => {
    handler = null;
    useDialogoStore.setState({ atual: null, fila: [] });
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h) => {
      handler = h as () => boolean;
      return { remove: jest.fn() } as never;
    });
  });

  it('é consumido pelo diálogo — não chega à navegação — e responde o "OK"', async () => {
    render(<DialogoVupth />);
    let respondido: number | null = null;
    act(() => {
      abrirDialogo({ titulo: 'Aviso' }).then((i) => (respondido = i));
    });
    let consumido = false;
    await act(async () => {
      consumido = handler!();
    });
    expect(consumido).toBe(true);
    expect(respondido).toBe(0);
    expect(useDialogoStore.getState().atual).toBeNull();
  });

  it('com cancelavel: false, o voltar é consumido e NÃO responde — só o botão', async () => {
    render(<DialogoVupth />);
    act(() => {
      abrirDialogo({ titulo: 'Você foi chamado', botoes: [{ texto: 'Entendi' }], cancelavel: false });
    });
    let consumido = false;
    await act(async () => {
      consumido = handler!();
    });
    expect(consumido).toBe(true);
    expect(useDialogoStore.getState().atual?.titulo).toBe('Você foi chamado');
  });
});

describe('os ids dos botões (bateria Maestro)', () => {
  beforeEach(() => useDialogoStore.setState({ atual: null, fila: [] }));

  it('o destrutivo tem id fixo, qualquer que seja a posição; os outros, pela posição', () => {
    const { getByTestId } = render(<DialogoVupth />);
    act(() => {
      abrirDialogo({
        titulo: 'Sair da fila?',
        botoes: [
          { texto: 'Não', estilo: 'cancel' },
          { texto: 'Adiar minha vez' },
          { texto: 'Sim, sair', estilo: 'destructive' },
        ],
      });
    });
    expect(getByTestId('dialogo-botao-0')).toBeTruthy();
    expect(getByTestId('dialogo-botao-1')).toBeTruthy();
    expect(getByTestId('dialogo-botao-destrutivo')).toBeTruthy();
  });
});
