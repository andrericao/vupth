import { Alert, StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ReportarProblema, ALTURA_MINIMA_DO_CAMPO } from '@components/ReportarProblema';
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

  // reportar-problema-cancelar-cortado (André, 24/10): o campo da mensagem nao fica espremido e os dois
  // botoes moram no rodape fixo, fora da rolagem.
  it('o campo da mensagem tem altura mínima e o Enviar e o Cancelar ficam no rodapé, fora da rolagem', () => {
    const t = renderWithProviders(<ReportarProblema visivel onFechar={jest.fn()} />);
    expect(StyleSheet.flatten(t.getByTestId('reportar-mensagem').props.style).minHeight).toBe(ALTURA_MINIMA_DO_CAMPO);
    expect(ALTURA_MINIMA_DO_CAMPO).toBeGreaterThanOrEqual(96);
    type No = { findAll: (f: (n: { props?: { testID?: string } }) => boolean) => unknown[] };
    const rolagem = t.getByTestId('caixa-de-modal-rolagem') as unknown as No;
    const dentro = (id: string) => rolagem.findAll((n) => n.props?.testID === id).length;
    expect(dentro('reportar-mensagem')).toBeGreaterThan(0);
    expect(dentro('reportar-enviar')).toBe(0);
    expect(dentro('reportar-cancelar')).toBe(0);
    expect(t.getByTestId('caixa-de-modal-rodape')).toBeTruthy();
  });
});
