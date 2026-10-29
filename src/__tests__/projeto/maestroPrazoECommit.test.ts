import { readFileSync } from 'fs';
import { join } from 'path';

const maestro = (arquivo: string) => readFileSync(join(__dirname, '../../../.maestro', arquivo), 'utf8');

// maestro-trava-na-atualizacao e maestro-atualizacao-por-commit (André, 28/10).
describe('bateria Maestro: prazo por etapa e commit já verificado', () => {
  const bateria = maestro('bateria.sh');

  it('toda etapa roda sob timeout e o estouro (124) reprova com TEMPO ESGOTADO', () => {
    expect(bateria).toMatch(/timeout -k 30 "\$prazo" maestro/);
    expect(bateria).toMatch(/ETAPA_PRAZO="\$\{ETAPA_PRAZO:-\d+\}"/);
    expect(bateria).toMatch(/ATUALIZACAO_PRAZO="\$\{ATUALIZACAO_PRAZO:-\d+\}"/);
    expect(bateria).toContain('"$VOLTA" -eq 124');
    expect(bateria).toContain('TEMPO ESGOTADO');
  });

  it('o commit verificado fica em arquivo ignorado e muda com o commit ou com a instalação do APK', () => {
    expect(bateria).toContain('versao-verificada.txt');
    expect(bateria).toContain('lastUpdateTime');
    expect(bateria).toContain('MARCA="${APARELHO:-celular} $COMMIT $INSTALACAO"');
    expect(readFileSync(join(__dirname, '../../../.gitignore'), 'utf8')).toContain('.maestro/versao-verificada.txt');
  });

  it('só a etapa 00 verifica a versão; as outras recebem VERSAO_VERIFICADA=1 e o preparo pula a atualização', () => {
    expect(bateria).toContain('-e VERSAO_VERIFICADA="$verificada"');
    expect(maestro('apoio/preparo.yaml')).toContain("VERSAO_VERIFICADA == '1'");
  });
});
