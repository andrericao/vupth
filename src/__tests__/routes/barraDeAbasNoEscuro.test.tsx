import { NavigationContainer } from '@react-navigation/native';

import { act } from '@testing-library/react-native';

import { TEMAS, estilo, fundoDe, icones, montar } from '../utils/lerTema';
import { useTemaStore } from '@stores/temaStore';
import { coresDoTema } from '@domain/tema';
import { contraste } from '@domain/contrast';
import { AuthRoutes } from '../../routes/auth.routes';

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return new Proxy({}, { get: (_alvo, nome) => (props: object) => React.createElement('Icone', { ...props, nome: String(nome) }) });
});
jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.mock('@screens/Home', () => ({ Home: () => null }));
jest.mock('@screens/EstablishmentDetail', () => ({ EstablishmentDetail: () => null }));
jest.mock('@screens/EstablishmentList', () => ({ EstablishmentList: () => null }));
jest.mock('@screens/Login', () => ({ Login: () => null }));
jest.mock('@screens/SignUp', () => ({ SignUp: () => null }));
jest.mock('@screens/CompleteProfile', () => ({ CompleteProfile: () => null }));
jest.mock('@screens/ForgotPassword', () => ({ ForgotPassword: () => null }));
jest.mock('@screens/QueueStatus', () => ({ QueueStatus: () => null }));
jest.mock('@screens/Attendances', () => ({ Attendances: () => null }));
jest.mock('@screens/Settings', () => ({ Settings: () => null }));
jest.mock('@screens/EditProfile', () => ({ EditProfile: () => null }));
jest.mock('@screens/EditEmail', () => ({ EditEmail: () => null }));
jest.mock('@screens/EditPassword', () => ({ EditPassword: () => null }));
jest.mock('@screens/EditAddress', () => ({ EditAddress: () => null }));
jest.mock('@screens/Terms', () => ({ Privacy: () => null, Terms: () => null }));
jest.mock('@screens/ExcluirConta', () => ({ ExcluirConta: () => null }));
jest.mock('@screens/Sistema', () => ({ Sistema: () => null }));
jest.mock('@screens/Aparencia', () => ({ Aparencia: () => null }));
jest.mock('@screens/DadosCadastrais', () => ({ DadosCadastrais: () => null }));
jest.mock('@screens/Promocoes', () => ({ Promocoes: () => null }));
jest.mock('@screens/ServiceSelection', () => ({ ServiceSelection: () => null }));
jest.mock('@screens/ProfessionalInfo', () => ({ ProfessionalInfo: () => null }));
jest.setTimeout(90000);

// A barra de abas do Client (AuthRoutes) leu as cores no codigo: fundo #FFFFFF, icone e
// rotulo ativos #163300 e inativos #454745. No escuro o React Navigation recebe a cor
// crua (nao aceita token), entao a barra vem de `useTema().cores`; sem isso ela ficaria
// branca embaixo de uma tela escura, e o icone forest sobre a pilula escura sumiria.
describe.each(TEMAS)('AuthRoutes no tema %s', (tema) => {
  afterAll(() => act(() => useTemaStore.setState({ preferencia: 'claro' })));

  it('o fundo da barra, o icone da aba ativa (sobre a pilula) e o das inativas', () => {
    const c = coresDoTema(tema);
    const tela = montar(
      tema,
      <NavigationContainer>
        <AuthRoutes />
      </NavigationContainer>,
    );
    expect(fundoDe(tela.getByText('Início'))).toBe(c.background);
    // O React Navigation desenha cada icone duas vezes (a cor ativa e a inativa, que ele
    // alterna por opacidade): o par e o do icone ativo, sobre a pilula greenTint, e o do
    // inativo, no texto secundario.
    for (const nome of ['House', 'ClipboardList', 'User']) {
      expect(icones(tela, nome).map((i) => i.props.color).sort()).toEqual([c.onGreenTint, c.textSecondary].sort());
    }
    // a pilula e o rotulo da aba ativa
    expect(fundoDe(icones(tela, 'House')[0])).toBe(c.greenTint);
    expect(estilo(tela.getByText('Início')).color).toBe(c.textPrimary);
    expect(estilo(tela.getByText('Perfil')).color).toBe(c.textSecondary);
    // 4,5:1: o icone ativo sobre a pilula e o rotulo e o icone inativo sobre a barra
    expect(contraste(c.onGreenTint, c.greenTint)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(c.textPrimary, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(c.textSecondary, c.background)).toBeGreaterThanOrEqual(4.5);
    // no claro e tudo o que era antes
    if (tema === 'claro') {
      expect(c.background).toBe('#FFFFFF');
      expect(c.onGreenTint).toBe('#163300');
      expect(c.textSecondary).toBe('#454745');
    }
  });
});
