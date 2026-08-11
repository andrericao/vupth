import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { DeleteAccountModal } from '@components/DeleteAccountModal';

// O contrato de apagar conta MUDOU em 2026-08-07 (backend S19): a rota antiga era
// destrutiva (`cascade = ALL` — apagar a conta de um dono apagava a loja inteira)
// e virou anonimização, exigindo a senha atual no corpo. Mandávamos DELETE sem
// corpo => `400 INVALID_REQUEST_BODY`: o botão estava QUEBRADO em produção.

jest.mock('phosphor-react-native', () => new Proxy({}, { get: () => () => null }));

function setup(overrides: Partial<React.ComponentProps<typeof DeleteAccountModal>> = {}) {
  const props = {
    visible: true,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  return { props, ...renderWithProviders(<DeleteAccountModal {...props} />) };
}

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
