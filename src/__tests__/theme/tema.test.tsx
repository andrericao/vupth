import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { GluestackUIProvider, Box } from '@gluestack-ui/themed';
import { Theme } from '@gluestack-style/react';

import tokens from '../../theme/tokens.json';
import { papeis } from '../../theme/papeis.json';
import {
  NOMES_DE_COR,
  NOMES_DE_PAPEL,
  NOMES_DE_TOKEN,
  PREFERENCIAS,
  ROTULO_DA_PREFERENCIA,
  coresDoTema,
  coresNoGluestack,
  nomeNoGluestack,
  preferenciaValida,
  resolverTema,
  tokenDoPapel,
  veuDoTema,
  type NomeDeCor,
  type Tema,
} from '@domain/tema';
import { config, configComFonte } from '../../../config/gluestack-ui.config';

// GUARDA DO TEMA (DEC-75, 16/10). Os valores vivem em src/theme/tokens.json,
// copia do pacote da Design (vupth-docs/fontes/design/tokens.json). Este teste
// nao tem tabela de hex do escuro: mede o JSON. Mudou uma cor la? Os pares de
// `verificacao` do proprio arquivo dizem se ainda passa.

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}
function razao(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const TEMAS: Tema[] = ['claro', 'escuro'];

describe('tokens.json — o pacote da Design', () => {
  it('toda cor tem claro e escuro em hex de 6 digitos', () => {
    for (const nome of NOMES_DE_TOKEN) {
      for (const tema of TEMAS) expect(tokens.cor[nome][tema]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('e a versao de 17/10 (trocar o arquivo e uma decisao, nao um acidente)', () => {
    expect(tokens.versao).toBe('2026-10-17');
  });
});

describe('contraste — reaplica os pares de `verificacao` do tokens.json', () => {
  // Texto: 4,5:1. Componente grafico (o V e o icone em verde): 3:1. O minimo vem
  // de cada par do proprio arquivo; a razao gravada e a que a Design mediu (±0,02).
  it.each(tokens.verificacao.map((par) => [`${par.texto} sobre ${par.fundo} (${par.tema})`, par] as const))(
    '%s',
    (_nome, par) => {
      const cores = coresDoTema(par.tema as Tema);
      const medida = razao(cores[par.texto as NomeDeCor], cores[par.fundo as NomeDeCor]);
      expect(medida).toBeGreaterThanOrEqual(par.minimo);
      expect(Math.abs(medida - par.razao)).toBeLessThan(0.02);
    },
  );
});

describe('as tres regras do escuro (design.html#tokens-escuros)', () => {
  const c = tokens.cor;

  it('1. forest vira a surface', () => {
    expect(c.surface.escuro).toBe(c.forest.claro);
  });

  it('2. cada acento troca de papel: o hex claro passa a ser o TEXTO', () => {
    expect(c.onAccentPeach.escuro).toBe(c.accentPeach.claro);
    expect(c.onAccentBlue.escuro).toBe(c.accentBlue.claro);
    expect(c.onAccentPink.escuro).toBe(c.accentPink.claro);
  });

  it('3. o botao primario NAO muda: green e onGreen valem o mesmo nos dois temas', () => {
    expect(c.green.escuro).toBe(c.green.claro);
    expect(c.onGreen.escuro).toBe(c.onGreen.claro);
  });
});

describe('papeis', () => {
  it('apontam para tokens que existem e nao repetem nome de token', () => {
    for (const nome of NOMES_DE_PAPEL) {
      expect(NOMES_DE_TOKEN).not.toContain(nome);
      for (const tema of TEMAS) expect(NOMES_DE_TOKEN).toContain(tokenDoPapel(nome, tema));
    }
  });

  it('o painel do modal e o #163300 do desenho no escuro (design-modais.html)', () => {
    expect(coresDoTema('escuro').painel).toBe('#163300');
    expect(coresDoTema('escuro').sobrePainel).toBe('#1F3F0B');
    expect(papeis.painel.claro).toBe('background');
  });

  it.each(
    NOMES_DE_PAPEL.flatMap((papel) =>
      ((papeis[papel] as { textos?: string[] }).textos ?? []).flatMap((texto) =>
        TEMAS.map((tema) => [`${texto} sobre ${papel} (${tema})`, papel, texto, tema] as const),
      ),
    ),
  )('%s passa em 4,5:1', (_nome, papel, texto, tema) => {
    const cores = coresDoTema(tema);
    expect(razao(cores[texto as NomeDeCor], cores[papel])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('domain/tema', () => {
  it('o padrao e CLARO e valor estranho nunca liga o escuro', () => {
    for (const v of [undefined, null, '', 'dark', 'ESCURO']) expect(preferenciaValida(v)).toBe('claro');
    expect(preferenciaValida('escuro')).toBe('escuro');
    expect(preferenciaValida('automatico')).toBe('automatico');
  });

  it('claro e escuro ignoram o aparelho; so o automatico o segue', () => {
    expect(resolverTema('claro', 'dark')).toBe('claro');
    expect(resolverTema('escuro', 'light')).toBe('escuro');
    expect(resolverTema('automatico', 'dark')).toBe('escuro');
    expect(resolverTema('automatico', 'light')).toBe('claro');
    expect(resolverTema('automatico', null)).toBe('claro');
  });

  it('toda preferencia tem rotulo e o veu do escuro e mais denso', () => {
    expect(PREFERENCIAS.map((p) => ROTULO_DA_PREFERENCIA[p])).toEqual(['Claro', 'Escuro', 'Automático']);
    expect(veuDoTema('claro')).toBe('rgba(22,51,0,.35)');
    expect(veuDoTema('escuro')).toBe('rgba(0,0,0,.55)');
  });

  it('coresDoTema devolve o mesmo objeto, com todos os nomes', () => {
    for (const tema of TEMAS) {
      expect(coresDoTema(tema)).toBe(coresDoTema(tema));
      expect(Object.keys(coresDoTema(tema)).sort()).toEqual([...NOMES_DE_COR].sort());
    }
  });
});

describe('o tema do Gluestack', () => {
  // Os hex do CLARO que o app tinha escritos na mao em config/gluestack-ui.config.ts
  // antes do escuro: nada muda para quem nao escolhe o escuro.
  const DE_ANTES: Record<string, string> = {
    brandGreen: '#9FE870',
    forest: '#163300',
    forestSoft: '#223D0D',
    greenTint: '#E2F6D5',
    accentBlue: '#A0E1E1',
    accentPeach: '#FFC091',
    accentPink: '#FFD7EF',
    accentPlum: '#260A2F',
    brandBackground: '#FFFFFF',
    brandSurface: '#F3F5F1',
    brandSurfaceAlt: '#E2F6D5',
    brandTextPrimary: '#163300',
    brandTextSecondary: '#454745',
    brandTextPlaceholder: '#6B706B',
    brandBorder: '#D7DDD3',
    brandDanger: '#B3261E',
    brandDangerTint: '#F7E4E2',
    brandWarning: '#FFC091',
    brandSuccess: '#9FE870',
  };

  it('no CLARO cada token da marca e o mesmo hex de antes', () => {
    const colors = config.tokens.colors as Record<string, string>;
    for (const [nome, hex] of Object.entries(DE_ANTES)) {
      expect(colors[nome]?.toUpperCase()).toBe(hex);
    }
  });

  it('cada cor do tokens.json tem um nome no Gluestack, e sem repeticao', () => {
    const nomes = NOMES_DE_TOKEN.map(nomeNoGluestack);
    expect(new Set(nomes).size).toBe(NOMES_DE_TOKEN.length);
  });

  it('coresNoGluestack leva tokens e papeis, nos dois temas', () => {
    for (const tema of TEMAS) {
      const cores = coresNoGluestack(tema);
      expect(Object.keys(cores)).toHaveLength(NOMES_DE_COR.length);
      expect(cores.brandSurface).toBe(coresDoTema(tema).surface);
      expect(cores.painel).toBe(coresDoTema(tema).painel);
    }
  });

  it('o config traz o escuro como TEMA do Gluestack, com todas as cores da marca e os papeis', () => {
    const escuro = (config as unknown as { themes: { escuro: { colors: Record<string, string> } } }).themes.escuro.colors;
    expect(escuro).toEqual(coresNoGluestack('escuro'));
    expect(escuro.brandSurface).toBe('#163300');
    expect(escuro.brandBackground).toBe('#0B1A04');
    // sem colorMode="dark": os `_dark` genericos do Gluestack nao ligam
    expect(Object.keys((config as unknown as { themes: object }).themes)).toEqual(['escuro']);
  });

  it('a letra maior mantem o tema escuro (o config refeito continua com themes)', () => {
    expect(configComFonte(0)).toBe(config);
    const t = configComFonte(3) as unknown as { themes: { escuro: unknown }; tokens: { fontSizes: Record<string, number> } };
    expect(t.themes.escuro).toBeDefined();
    expect(t.tokens.fontSizes.xs).toBe((config.tokens.fontSizes as Record<string, number>).xs + 3);
  });

  // Por que e `<Theme>` e nao um config refeito: o Gluestack guarda o estilo
  // resolvido por hash do estilo, e `$brandSurface` tem o mesmo hash em qualquer
  // config. Refazer o config com outro valor para o mesmo token NAO repinta —
  // o primeiro valor resolvido no processo fica. Ver config/gluestack-ui.config.ts.
  function corDe(token: string, tema?: 'escuro' | 'claro'): string | undefined {
    const caixa = <Box testID="caixa" bg={token as '$brandSurface'} />;
    const { getByTestId, unmount } = render(
      <GluestackUIProvider config={config}>
        {tema ? <Theme name={tema}>{caixa}</Theme> : caixa}
      </GluestackUIProvider>,
    );
    const cor = StyleSheet.flatten(getByTestId('caixa').props.style)?.backgroundColor;
    unmount();
    return cor;
  }

  it('um bg="$brandSurface" resolve o par do tema, e vai e volta sem ficar preso no primeiro valor', () => {
    expect(corDe('$brandSurface', 'claro')).toBe('#F3F5F1');
    expect(corDe('$brandSurface', 'escuro')).toBe('#163300');
    expect(corDe('$brandSurface', 'claro')).toBe('#F3F5F1');
    expect(corDe('$brandSurface')).toBe('#F3F5F1');
    expect(corDe('$brandBackground', 'escuro')).toBe('#0B1A04');
    expect(corDe('$painel', 'escuro')).toBe('#163300');
    expect(corDe('$selecionado', 'escuro')).toBe('#9FE870');
    expect(corDe('$selecionado', 'claro')).toBe('#163300');
  });

  it('o que nao e da marca (branco, preto) nao muda com o tema', () => {
    expect(corDe('$white', 'escuro')).toBe('#FFFFFF');
    expect(corDe('$black', 'escuro')).toBe('#000000');
  });

  it('trocar o tema numa MESMA arvore repinta sem remontar', () => {
    const { getByTestId, rerender } = render(
      <GluestackUIProvider config={config}>
        <Theme name="claro">
          <Box testID="caixa" bg="$brandSurface" />
        </Theme>
      </GluestackUIProvider>,
    );
    const no = getByTestId('caixa');
    const cor = () => StyleSheet.flatten(getByTestId('caixa').props.style)?.backgroundColor;
    expect(cor()).toBe('#F3F5F1');
    rerender(
      <GluestackUIProvider config={config}>
        <Theme name="escuro">
          <Box testID="caixa" bg="$brandSurface" />
        </Theme>
      </GluestackUIProvider>,
    );
    expect(cor()).toBe('#163300');
    // o mesmo no (nao foi remontado): a tela e o estado dela continuam
    expect(getByTestId('caixa')).toBe(no);
  });
});
