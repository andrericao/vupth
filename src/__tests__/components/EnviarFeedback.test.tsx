import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { EnviarFeedback, mensagemDoFeedback } from '@components/EnviarFeedback';
import { feedbackAppService } from '@services/feedbackAppService';
import { useAuthStore } from '@stores/authStore';

jest.mock('expo-secure-store');
jest.mock('@services/feedbackAppService', () => ({ feedbackAppService: { enviar: jest.fn() } }));
jest.setTimeout(30000);

// feedback-no-app (DEC-167): caixa de texto e enviar, sem sair do app; confirma "Obrigado".
describe('EnviarFeedback', () => {
  let alerta: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tok' });
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alerta.mockRestore());

  it('Enviar só vale com texto; manda o texto, o app CLIENT e agradece', async () => {
    (feedbackAppService.enviar as jest.Mock).mockResolvedValue({});
    const onFechar = jest.fn();
    const t = renderWithProviders(<EnviarFeedback visivel onFechar={onFechar} />);
    fireEvent.press(t.getByTestId('feedback-enviar'));
    expect(feedbackAppService.enviar).not.toHaveBeenCalled();
    fireEvent.changeText(t.getByTestId('feedback-texto'), '  a fila é ótima  ');
    fireEvent.press(t.getByTestId('feedback-enviar'));
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(feedbackAppService.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'a fila é ótima', app: 'CLIENT', device: expect.any(String) }),
      'tok',
    );
    expect(alerta).toHaveBeenCalledWith('Obrigado!', expect.any(String));
  });

  it('falha: avisa, não fecha e guarda o que a pessoa digitou', async () => {
    (feedbackAppService.enviar as jest.Mock).mockRejectedValue({ response: { status: 500 } });
    const onFechar = jest.fn();
    const t = renderWithProviders(<EnviarFeedback visivel onFechar={onFechar} />);
    fireEvent.changeText(t.getByTestId('feedback-texto'), 'algo');
    fireEvent.press(t.getByTestId('feedback-enviar'));
    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Não enviou', expect.any(String)));
    expect(onFechar).not.toHaveBeenCalled();
    expect(t.getByTestId('feedback-texto').props.value).toBe('algo');
  });

  it('sem sessão não envia', () => {
    useAuthStore.setState({ accessToken: null });
    const t = renderWithProviders(<EnviarFeedback visivel onFechar={jest.fn()} />);
    fireEvent.changeText(t.getByTestId('feedback-texto'), 'algo');
    fireEvent.press(t.getByTestId('feedback-enviar'));
    expect(feedbackAppService.enviar).not.toHaveBeenCalled();
  });

  it('Cancelar fecha sem enviar', () => {
    const onFechar = jest.fn();
    const t = renderWithProviders(<EnviarFeedback visivel onFechar={onFechar} />);
    fireEvent.press(t.getByTestId('feedback-cancelar'));
    expect(onFechar).toHaveBeenCalled();
    expect(feedbackAppService.enviar).not.toHaveBeenCalled();
  });

  it('o limite diário (429 FEEDBACK_LIMIT) ganha a frase gentil', () => {
    expect(mensagemDoFeedback({ response: { status: 429 } })).toMatch(/Amanhã/);
    expect(mensagemDoFeedback({ response: { data: { code: 'FEEDBACK_LIMIT' } } })).toMatch(/Amanhã/);
    expect(mensagemDoFeedback(new Error('x'))).toMatch(/Tente de novo/);
  });
});
