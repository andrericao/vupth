import { render } from '@testing-library/react-native';

import { PasswordRules } from '@components/PasswordRules';

// C27 (Andre, 16/09, para os dois apps): o sinal de cada regra de senha vai num
// CÍRCULO — CircleCheck para a regra cumprida, CircleX para a que falta.

jest.mock('lucide-react-native', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    CircleCheck: () => <Text>icone-circle-check</Text>,
    CircleX: () => <Text>icone-circle-x</Text>,
  };
});
jest.mock('@gluestack-ui/themed', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { VStack: View, HStack: View, Text };
});

describe('PasswordRules (C27)', () => {
  it('regra cumprida leva o círculo com check; a que falta, o círculo com X', () => {
    const { getByText } = render(
      <PasswordRules rules={[{ label: '8 caracteres', passed: true }, { label: 'um número', passed: false }] as never} />,
    );
    expect(getByText('icone-circle-check')).toBeTruthy();
    expect(getByText('icone-circle-x')).toBeTruthy();
  });
});
