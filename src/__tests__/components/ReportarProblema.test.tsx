import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ReportarProblema } from '@components/ReportarProblema';
import { reportarProblema } from '@utils/sentry';

jest.mock('@utils/sentry', () => ({ reportarProblema: jest.fn() }));
jest.mock('expo-secure-store');
jest.setTimeout(30000);

// sentry-feedback-do-usuario (24/10), como no Partner: nome opcional, mensagem obrigatória.
describe('ReportarProblema', () => {
  let alerta: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alerta.mockRestore());

  it('Enviar só vale com mensagem; manda nome e mensagem e agradece', () => {
    (reportarProblema as jest.Mock).mockReturnValue(true);
    const onFechar = jest.fn();
    const t = renderWithProviders(<ReportarProblema visivel onFechar={onFechar} />);
    fireEvent.press(t.getByTestId('reportar-enviar'));
    expect(reportarProblema).not.toHaveBeenCalled();
    fireEvent.changeText(t.getByTestId('reportar-nome'), 'Ana');
    fireEvent.changeText(t.getByTestId('reportar-mensagem'), 'a fila travou');
    fireEvent.press(t.getByTestId('reportar-enviar'));
    expect(reportarProblema).toHaveBeenCalledWith({ mensagem: 'a fila travou', nome: 'Ana' });
    expect(onFechar).toHaveBeenCalled();
    expect(alerta).toHaveBeenCalledWith('Enviado', 'Obrigado. Vamos olhar.');
  });

  it('falha ao enviar: diz que não enviou', () => {
    (reportarProblema as jest.Mock).mockReturnValue(false);
    const t = renderWithProviders(<ReportarProblema visivel onFechar={jest.fn()} />);
    fireEvent.changeText(t.getByTestId('reportar-mensagem'), 'algo');
    fireEvent.press(t.getByTestId('reportar-enviar'));
    expect(alerta).toHaveBeenCalledWith('Não enviou', expect.any(String));
  });

  it('Cancelar fecha sem enviar', () => {
    const onFechar = jest.fn();
    const t = renderWithProviders(<ReportarProblema visivel onFechar={onFechar} />);
    fireEvent.press(t.getByTestId('reportar-cancelar'));
    expect(onFechar).toHaveBeenCalled();
    expect(reportarProblema).not.toHaveBeenCalled();
  });
});
