/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';

import { alertWeb, instalarAlertWeb, normalizarBotoes } from '../../../web-shims/alert';

// O React Native Web nao implementa `Alert`: a chamada nao falha, nao loga e
// nao pinta nada. Eram 60 avisos mudos no navegador.
//
// Este teste existe porque a falha e SILENCIOSA nos dois sentidos: sem o
// patch, nada aparece e nada estoura; e se alguem trocar o `Alert` por um
// import proprio em alguma tela, essa tela volta a ficar muda sem aviso.

describe('o Alert do web mostra o que o app tem a dizer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.getElementById('vupth-alert-style')?.remove();
  });

  it('pinta titulo e mensagem — o que nao acontecia no navegador', () => {
    alertWeb('Erro', 'Senha incorreta');
    expect(document.querySelector('.vupth-alert-title')?.textContent).toBe('Erro');
    expect(document.querySelector('.vupth-alert-msg')?.textContent).toBe('Senha incorreta');
  });

  it('sem botoes, vira um OK sozinho — igual ao React Native', () => {
    expect(normalizarBotoes(undefined)).toEqual([{ text: 'OK' }]);
    expect(normalizarBotoes([])).toEqual([{ text: 'OK' }]);
    alertWeb('Aviso', 'Mensagem');
    expect(document.querySelectorAll('.vupth-alert-btn')).toHaveLength(1);
  });

  it('aceita TRES botoes — o motivo de nao usar window.confirm, que so tem dois', () => {
    alertWeb('Sair da fila', 'Vai perder a vez', [
      { text: 'Ficar', style: 'cancel' },
      { text: 'Mudar minha vez' },
      { text: 'Sair', style: 'destructive' },
    ]);
    const btns = document.querySelectorAll('.vupth-alert-btn');
    expect(btns).toHaveLength(3);
    expect((btns[0] as HTMLElement).dataset.style).toBe('cancel');
    expect((btns[2] as HTMLElement).dataset.style).toBe('destructive');
  });

  it('chama o onPress do botao tocado e fecha', () => {
    const sair = jest.fn();
    const ficar = jest.fn();
    alertWeb('Sair da fila', 'Confirma?', [
      { text: 'Ficar', style: 'cancel', onPress: ficar },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
    const btns = document.querySelectorAll<HTMLElement>('.vupth-alert-btn');
    btns[1].click();
    expect(sair).toHaveBeenCalledTimes(1);
    expect(ficar).not.toHaveBeenCalled();
    expect(document.querySelector('.vupth-alert-backdrop')).toBeNull();
  });

  it('um clique duplo no botao NAO dispara a acao duas vezes', () => {
    // Sair da fila gera multa: disparar duas vezes e cobrar duas.
    const onPress = jest.fn();
    alertWeb('Confirma?', undefined, [{ text: 'Sim', onPress }]);
    const btn = document.querySelector<HTMLElement>('.vupth-alert-btn')!;
    btn.click();
    btn.click();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Esc fecha pelo botao cancel; com cancelable:false, nao fecha', () => {
    const cancelar = jest.fn();
    alertWeb('Titulo', 'Msg', [{ text: 'Nao', style: 'cancel', onPress: cancelar }]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelar).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.vupth-alert-backdrop')).toBeNull();

    alertWeb('Titulo', 'Msg', [{ text: 'Ok' }], { cancelable: false });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.vupth-alert-backdrop')).not.toBeNull();
  });

  it('e um dialogo de verdade para leitor de tela', () => {
    alertWeb('Erro', 'Senha incorreta');
    const dlg = document.querySelector('.vupth-alert-backdrop')!;
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.getAttribute('aria-label')).toBe('Erro');
  });

  it('o card segue a marca: brandGreen SO como fundo, com forest por cima', () => {
    // `brandGreen` (#9FE870) e claro demais para sustentar texto branco. O par
    // certo e sempre fundo brandGreen + texto forest.
    alertWeb('Titulo', 'Msg', [{ text: 'Ok' }]);
    const css = document.getElementById('vupth-alert-style')!.textContent!;
    const solido = css.slice(css.indexOf('[data-peso="solido"] {'), css.indexOf('[data-peso="solido"]:hover'));
    expect(solido).toContain('background: #9FE870');
    expect(solido).toContain('color: #163300');
    expect(solido.toLowerCase()).not.toContain('color: #fff');
    // Pilula de altura MINIMA — cravar corta o rotulo com a fonte ampliada (DS4).
    const base = css.slice(css.indexOf('.vupth-alert-btn {'), css.indexOf('[data-peso="solido"] {'));
    expect(base).toContain('border-radius: 9999px');
    expect(base).toContain('min-height: 54px');
    expect(base).not.toMatch(/(?<!min-)height:\s*54px/);
  });

  // 🔴 A hierarquia. Ate 16/09 este arquivo a tinha INVERTIDA: cancelar vazado.
  // O arquivo do Design (MODAL · Deletar conta) pede o oposto — o peso vai para
  // a SAIDA SEGURA, e a acao sem volta fica disponivel sem convidar. O app ja
  // fazia certo (PR #32); agora os dois leem a mesma regra, `pesoDoBotao`.
  function pesos(botoes: { text: string; style?: 'cancel' | 'destructive' }[]) {
    alertWeb('Titulo', 'Msg', botoes);
    return [...document.querySelectorAll<HTMLElement>('.vupth-alert-btn')].map((b) => b.dataset.peso);
  }

  it('com acao destrutiva: CANCELAR e o solido, e o destrutivo e vazado', () => {
    expect(pesos([
      { text: 'Ficar', style: 'cancel' },
      { text: 'Sair', style: 'destructive' },
    ])).toEqual(['solido', 'vazado-perigo']);
  });

  it('sem acao destrutiva a hierarquia se inverte: o CONFIRMAR e o solido', () => {
    // Ai o confirmar e a acao principal, e e ele que ganha o peso.
    expect(pesos([
      { text: 'Nao', style: 'cancel' },
      { text: 'Sim' },
    ])).toEqual(['vazado', 'solido']);
  });

  it('o destrutivo tem borda FOREST — so o rotulo fica vermelho', () => {
    alertWeb('Titulo', 'Msg', [{ text: 'Ok' }]);
    const css = document.getElementById('vupth-alert-style')!.textContent!;
    // A borda vermelha era o que este arquivo fazia, e o desenho nao pede.
    expect(css).not.toMatch(/border:[^;]*#B3261E/i);
    // `lastIndexOf`: o primeiro bloco com esse seletor e o COMPARTILHADO com o
    // vazado comum (rotulo forest). A regra que pinta o rotulo de vermelho vem
    // depois e ganha pela cascata — e ela que precisa existir.
    const perigo = css.slice(css.lastIndexOf('[data-peso="vazado-perigo"] {'));
    expect(perigo.slice(0, 80)).toContain('color: #B3261E');
  });

  it('a borda do vazado e 1,5 — a mesma do Button/Outline', () => {
    alertWeb('Titulo', 'Msg', [{ text: 'Ok' }]);
    const css = document.getElementById('vupth-alert-style')!.textContent!;
    expect(css).toContain('border: 1.5px solid #163300');
    expect(css).not.toContain('border: 2px solid');
  });

  it('instalar troca o metodo do Alert, e nao instala duas vezes', () => {
    const falso: { alert: unknown; __vupthWebAlert?: boolean } = { alert: () => {} };
    expect(instalarAlertWeb(falso)).toBe(true);
    expect(falso.alert).toBe(alertWeb);
    expect(instalarAlertWeb(falso)).toBe(false);
  });

  it('o App INSTALA o shim no boot — senao as 60 chamadas seguem mudas', () => {
    const APP = fs.readFileSync(path.resolve(__dirname, '../../../App.tsx'), 'utf8');
    expect(APP).toMatch(/instalarAlertWeb\(Alert\)/);
    expect(APP).toMatch(/Platform\.OS === "web"/);
  });
});
