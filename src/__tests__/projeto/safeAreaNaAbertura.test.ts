import { readFileSync } from 'fs';
import { join } from 'path';

// preview-nao-abre (17/10): o FaixaAvaliar chama useSafeAreaInsets e era
// montado no App, acima de qualquer SafeAreaProvider — "No safe area value
// available" no render da abertura e o app fechava. Os testes de componente
// mockam o módulo, então só a árvore do App.tsx denuncia a falta.

const app = readFileSync(join(__dirname, '../../../App.tsx'), 'utf-8');

describe('App.tsx: o que usa safe area fica dentro do SafeAreaProvider', () => {
  it('o SafeAreaProvider abre antes do FaixaAvaliar e fecha depois', () => {
    const abre = app.indexOf('<SafeAreaProvider>');
    const faixa = app.indexOf('<FaixaAvaliar />');
    const fecha = app.indexOf('</SafeAreaProvider>');
    expect(abre).toBeGreaterThan(-1);
    expect(faixa).toBeGreaterThan(abre);
    expect(fecha).toBeGreaterThan(faixa);
  });

  it('um erro de render da faixa cai no ErrorBoundary, não no app', () => {
    expect(app).toMatch(/<ErrorBoundary>\s*<FaixaAvaliar \/>\s*<\/ErrorBoundary>/);
  });
});

// abertura-sem-retangulo-e-sem-tela-verde (17/10): entre o splash nativo e a
// abertura nao pode haver uma tela vazia — o V pulsando vale tambem na espera
// da fonte (o V nao usa texto).
describe('App.tsx: a abertura e continua', () => {
  it('a espera da fonte mostra o mesmo V pulsando, sem Loading/spinner', () => {
    expect(app).toMatch(/!fontGateOpen \|\| !backendReady \? <PreparingServer \/>/);
    expect(app).not.toMatch(/<Loading/);
  });
});
