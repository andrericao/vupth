import { Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { act, fireEvent, render } from '@testing-library/react-native';

import { FEEDBACK_URL, INTERVALO_DO_PEDIDO_MS } from '@domain/feedback/feedback';
import { ModalDeFeedback } from '@components/ModalDeFeedback';
import { useFeedbackStore } from '@stores/feedbackStore';

// pedido-de-feedback (CLI-34): a caixa aparece depois de avaliar; "Agora nao"
// fecha; "Enviar feedback" abre o Suporte.

jest.mock('expo-secure-store');

const get = SecureStore.getItemAsync as jest.Mock;
const set = SecureStore.setItemAsync as jest.Mock;
const T = 1_800_000_000_000;

beforeEach(() => {
  jest.clearAllMocks();
  useFeedbackStore.setState({ aberto: false, ultimoPedido: null, ultimoEnvio: null });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

describe('ModalDeFeedback', () => {
  it('fechada, nao desenha nada', () => {
    const { queryByTestId } = render(<ModalDeFeedback />);
    expect(queryByTestId('pedido-de-feedback')).toBeNull();
  });

  it('pedir() abre a caixa com o titulo e os dois botoes, e guarda a data', () => {
    const { getByText, getByTestId } = render(<ModalDeFeedback />);
    act(() => {
      expect(useFeedbackStore.getState().pedir(T)).toBe(true);
    });
    expect(getByText('Ajude a melhorar o app')).toBeTruthy();
    expect(getByTestId('feedback-enviar')).toBeTruthy();
    expect(getByTestId('feedback-agora-nao')).toBeTruthy();
    expect(set).toHaveBeenCalledWith('vupth_feedback_pedido', JSON.stringify({ ultimoPedido: T, ultimoEnvio: null }));
  });

  it('"Agora nao" fecha e nao pede de novo antes de 30 dias', () => {
    const { getByTestId, queryByTestId } = render(<ModalDeFeedback />);
    act(() => {
      useFeedbackStore.getState().pedir(T);
    });
    fireEvent.press(getByTestId('feedback-agora-nao'));
    expect(queryByTestId('pedido-de-feedback')).toBeNull();
    expect(useFeedbackStore.getState().pedir(T + INTERVALO_DO_PEDIDO_MS - 1)).toBe(false);
    act(() => {
      expect(useFeedbackStore.getState().pedir(T + INTERVALO_DO_PEDIDO_MS)).toBe(true);
    });
  });

  it('"Enviar feedback" abre o Suporte, fecha e guarda o envio', () => {
    const { getByTestId, queryByTestId } = render(<ModalDeFeedback />);
    act(() => {
      useFeedbackStore.getState().pedir(T);
    });
    fireEvent.press(getByTestId('feedback-enviar'));
    expect(Linking.openURL).toHaveBeenCalledWith(FEEDBACK_URL);
    expect(queryByTestId('pedido-de-feedback')).toBeNull();
    expect(useFeedbackStore.getState().ultimoEnvio).not.toBeNull();
    expect(set).toHaveBeenLastCalledWith(
      'vupth_feedback_pedido',
      expect.stringContaining('"ultimoPedido":' + T),
    );
  });

  it('o link que nao abre nao derruba a caixa', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error('sem navegador'));
    const { getByTestId } = render(<ModalDeFeedback />);
    act(() => {
      useFeedbackStore.getState().pedir(T);
    });
    await act(async () => {
      fireEvent.press(getByTestId('feedback-enviar'));
    });
    expect(useFeedbackStore.getState().aberto).toBe(false);
  });

  it('restoreFeedback le as datas guardadas; disco vazio ou quebrado nao estoura', async () => {
    get.mockResolvedValueOnce(JSON.stringify({ ultimoPedido: T, ultimoEnvio: T - 5 }));
    await useFeedbackStore.getState().restoreFeedback();
    expect(useFeedbackStore.getState().ultimoPedido).toBe(T);
    expect(useFeedbackStore.getState().ultimoEnvio).toBe(T - 5);
    get.mockResolvedValueOnce(null);
    await useFeedbackStore.getState().restoreFeedback();
    get.mockRejectedValueOnce(new Error('bloqueado'));
    await expect(useFeedbackStore.getState().restoreFeedback()).resolves.toBeUndefined();
  });

  it('sem disco, pedir e enviar seguem valendo na sessao', () => {
    set.mockRejectedValue(new Error('sem disco'));
    act(() => {
      expect(useFeedbackStore.getState().pedir(T)).toBe(true);
      useFeedbackStore.getState().enviar(T + 1);
    });
    expect(useFeedbackStore.getState().ultimoEnvio).toBe(T + 1);
  });
});
