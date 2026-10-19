import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { DeleteAccountModal } from '@components/DeleteAccountModal';

// O contrato de apagar conta MUDOU em 2026-08-07 (backend S19): a rota antiga era
// destrutiva (`cascade = ALL` — apagar a conta de um dono apagava a loja inteira)
// e virou anonimização, exigindo a senha atual no corpo. Mandávamos DELETE sem
// corpo => `400 INVALID_REQUEST_BODY`: o botão estava QUEBRADO em produção.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

function setup(overrides: Partial<React.ComponentProps<typeof DeleteAccountModal>> = {}) {
  const props = {
    visible: true,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  return { props, ...renderWithProviders(<DeleteAccountModal {...props} />) };
}

describe('DeleteAccountModal — textos curtos (GUIA_DE_TEXTO.md §4.7)', () => {
  it('Excluir conta · uma linha de corpo · Saiba mais · Excluir / Cancelar, sem "Deletar"', () => {
    const { getByText, queryByText, toJSON } = setup();
    expect(getByText('Excluir conta')).toBeTruthy();
    expect(getByText('Seus dados são apagados. Para confirmar, digite a senha.')).toBeTruthy();
    expect(getByText('Saiba mais')).toBeTruthy();
    expect(getByText('Excluir')).toBeTruthy();
    expect(getByText('Cancelar')).toBeTruthy();
    expect(queryByText(/Delet/)).toBeNull();
    expect(JSON.stringify(toJSON())).not.toMatch(/Delet/);
    expect('Seus dados são apagados. Para confirmar, digite a senha.'.length).toBeLessThanOrEqual(70);
  });

  it('o Saiba mais abre o artigo de excluir a conta no navegador', () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByTestId } = setup();
    fireEvent.press(getByTestId('excluir-conta-saiba-mais'));
    expect(abrir).toHaveBeenCalledWith('https://vupth-support.pages.dev/artigos/cliente/excluir-conta.html');
    abrir.mockRestore();
  });

  it('excluindo, o botão vira o spinner (sem "Deletando...") e não confirma de novo', () => {
    const { props, getByTestId, queryByText } = setup({ isDeleting: true });
    expect(queryByText('Excluir')).toBeNull();
    fireEvent.changeText(getByTestId('delete-account-password'), 'Senha@123');
    fireEvent.press(getByTestId('delete-account-confirm'));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});

describe('DeleteAccountModal', () => {
  it('não deixa confirmar sem a senha — o backend recusaria com 422', () => {
    const { props, getByTestId } = setup();

    fireEvent.press(getByTestId('delete-account-confirm'));

    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('entrega a senha digitada para quem chama', () => {
    const { props, getByTestId } = setup();

    fireEvent.changeText(getByTestId('delete-account-password'), 'Senha@123');
    fireEvent.press(getByTestId('delete-account-confirm'));

    expect(props.onConfirm).toHaveBeenCalledWith('Senha@123');
  });

  it('mostra o erro do backend sem fechar o modal', () => {
    // O 409 traz a instrução do que fazer para destravar; fechar o modal
    // esconderia a única explicação que o usuário recebe.
    const { getByTestId } = setup({
      error: 'Você está na fila de um profissional. Saia da fila para apagar a conta.',
    });

    expect(getByTestId('delete-account-error')).toBeTruthy();
  });

  it('trava o botão enquanto deleta, para não disparar duas vezes', () => {
    const { props, getByTestId } = setup({ isDeleting: true });

    fireEvent.changeText(getByTestId('delete-account-password'), 'Senha@123');
    fireEvent.press(getByTestId('delete-account-confirm'));

    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('cancelar fecha e limpa a senha digitada', () => {
    const { props, getByText, getByTestId } = setup();

    fireEvent.changeText(getByTestId('delete-account-password'), 'Senha@123');
    fireEvent.press(getByText('Cancelar'));

    expect(props.onClose).toHaveBeenCalled();
    expect(getByTestId('delete-account-password').props.value).toBe('');
  });
});
