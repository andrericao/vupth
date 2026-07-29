// ⚠️ PRIMEIRO import: filtra o warning de SafeAreaView que o Gluestack v1 solta
// ao ser carregado (ver comentário no módulo). Não reordenar.
import './silenceSafeAreaViewWarning';
import { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { GluestackUIProvider } from '@gluestack-ui/themed';

import { config } from '../../../config/gluestack-ui.config';

// Wrapper padrão para testes de componente/tela (RNTL): provê o GluestackUIProvider
// (senão os componentes do Gluestack não acham o config no contexto).
export function renderWithProviders(ui: ReactElement) {
  return render(<GluestackUIProvider config={config}>{ui}</GluestackUIProvider>);
}
