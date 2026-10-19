import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Heading, Text } from '@gluestack-ui/themed';

import { renderWithProviders } from '../utils/renderWithProviders';
import { TemaDoApp } from '@components/TemaDoApp';
import { useTemaStore } from '@stores/temaStore';
import { coresDoTema } from '@domain/tema';

// O Text e o Heading do Gluestack tem cor PADRAO fixa ($textLight700 #525252 e
// $textLight900 #262626). No escuro, todo texto sem `color` saia cinza escuro
// sobre o painel forest e ninguem via: um comentario pedindo "ponha a cor em todo
// Text" nunca pegou isso, entao o tema escuro redefine os dois tokens e este teste
// confere a cor que um texto SEM cor renderiza em cada tema.

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));
jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.setTimeout(60000);

const corDe = (no: { props: { style?: StyleProp<TextStyle> } }) => StyleSheet.flatten(no.props.style)?.color;

function semCor(tema: 'claro' | 'escuro') {
  useTemaStore.setState({ preferencia: tema });
  const { getByText, unmount } = renderWithProviders(
    <TemaDoApp>
      <Text>corpo</Text>
      <Heading>titulo</Heading>
    </TemaDoApp>,
  );
  const resultado = { texto: corDe(getByText('corpo')), titulo: corDe(getByText('titulo')) };
  unmount();
  return resultado;
}

describe('texto sem cor propria', () => {
  it('no claro e o cinza de sempre: o claro nao muda', () => {
    expect(semCor('claro')).toEqual({ texto: '#525252', titulo: '#262626' });
  });

  it('no escuro e o texto secundario e o principal do tema, nao um cinza escuro sobre o painel', () => {
    const escuro = coresDoTema('escuro');
    expect(semCor('escuro')).toEqual({ texto: escuro.textSecondary, titulo: escuro.textPrimary });
  });
});
