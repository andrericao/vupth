import { renderWithProviders } from '../utils/renderWithProviders';
import { FaixaDeAmbiente, ehAmbienteDeTeste } from '@components/FaixaDeAmbiente';
import { CANAL_PARA_ENV, resolveApiEnv } from '@services/apiEnv';

const mockUpdates: { channel: string | null } = { channel: 'preview' };
jest.mock('expo-updates', () => ({
  get channel() {
    return mockUpdates.channel;
  },
}));

// faixa-de-ambiente (F20): build de teste mostra a faixa; a producao nunca aponta para o staging.
describe('FaixaDeAmbiente', () => {
  it.each(['preview', 'development', null])('canal %s: mostra a faixa', (canal) => {
    mockUpdates.channel = canal;
    const { getByTestId, unmount } = renderWithProviders(<FaixaDeAmbiente />);
    expect(getByTestId('faixa-de-ambiente')).toHaveTextContent('AMBIENTE DE TESTE');
    unmount();
  });

  it('canal production: não mostra', () => {
    mockUpdates.channel = 'production';
    const { queryByTestId, unmount } = renderWithProviders(<FaixaDeAmbiente />);
    expect(queryByTestId('faixa-de-ambiente')).toBeNull();
    unmount();
  });

  it('ehAmbienteDeTeste: só o canal production é produção, com qualquer .env', () => {
    for (const env of ['local', 'dev', 'staging', 'prod', undefined]) {
      expect(ehAmbienteDeTeste('production', env)).toBe(false);
    }
    expect(ehAmbienteDeTeste('preview', 'prod')).toBe(true);
  });
});

describe('a produção nunca aponta para o staging', () => {
  it('só o canal production vira prod, e vira prod com qualquer .env', () => {
    expect(Object.entries(CANAL_PARA_ENV).filter(([, e]) => e === 'prod').map(([c]) => c)).toEqual(['production']);
    for (const env of ['local', 'dev', 'staging', 'prod', undefined]) {
      expect(resolveApiEnv('production', env)).toBe('prod');
    }
  });

  it('os canais de teste nunca viram prod', () => {
    expect(resolveApiEnv('preview', 'prod')).toBe('staging');
    expect(resolveApiEnv('development', 'prod')).toBe('staging');
  });
});
