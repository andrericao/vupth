// ⚠️ PRIMEIRO import: filtra o warning de SafeAreaView que o Gluestack v1 solta
// ao ser carregado (ver comentário no módulo). Não reordenar.
import './silenceSafeAreaViewWarning';
import { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { config } from '../../../config/gluestack-ui.config';

// Métricas de um aparelho com entalhe. Fora do teste quem entrega isso é o
// sistema; aqui precisa ser fixo, senão o `useSafeAreaInsets` do ScreenHeader
// levanta "No safe area value available" e derruba a tela inteira.
const METRICAS = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// Wrapper padrão para testes de componente/tela (RNTL): provê o GluestackUIProvider
// (senão os componentes do Gluestack não acham o config no contexto) e o
// SafeAreaProvider (que o cabeçalho padrão exige).
export function renderWithProviders(ui: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <GluestackUIProvider config={config}>{ui}</GluestackUIProvider>
    </SafeAreaProvider>,
  );
}
