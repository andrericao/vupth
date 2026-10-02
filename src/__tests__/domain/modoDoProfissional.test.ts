import { ehSoAgenda, acaoPrincipal, opcoesDoMenu, temSegundaPorta, MENSAGEM_SO_AGENDA } from '@domain/professional/modo';
import { recusaAoEntrar } from '@domain/queue/entrarNaFila';

// Modo por profissional (Backend 8e6c00f, em produção desde 26/09): fila ou só agenda.

describe('o modo do profissional', () => {
  it('só AGENDA_ONLY é só agenda; ausente (backend anterior) é fila', () => {
    expect(ehSoAgenda({ operation_mode: 'AGENDA_ONLY' })).toBe(true);
    expect(ehSoAgenda({ operation_mode: 'QUEUE' })).toBe(false);
    expect(ehSoAgenda({ operation_mode: null })).toBe(false);
    expect(ehSoAgenda({})).toBe(false);
    expect(ehSoAgenda(undefined)).toBe(false);
  });
});

describe('a ação principal da escolha de serviços', () => {
  it('só agenda: agendar, com a loja aberta ou fechada, trabalhando ou fora', () => {
    for (const fora of [true, false]) {
      for (const lojaAberta of [true, false]) {
        expect(acaoPrincipal({ soAgenda: true, fora, lojaAberta })).toBe('agendar');
      }
    }
  });

  // DEC-6 (02/10): com a fila fechada, Agendar — o corte vai para o menu.
  it('fila: fora → agendar; loja aberta → fila; loja fechada → agendar', () => {
    expect(acaoPrincipal({ soAgenda: false, fora: true, lojaAberta: true })).toBe('agendar');
    expect(acaoPrincipal({ soAgenda: false, fora: false, lojaAberta: true })).toBe('fila');
    expect(acaoPrincipal({ soAgenda: false, fora: false, lojaAberta: false })).toBe('agendar');
  });
});

describe('o menu "Mais opções"', () => {
  it('só agenda não tem menu — a troca também é entrar na fila', () => {
    expect(opcoesDoMenu({ soAgenda: true, fora: false, lojaAberta: true })).toEqual([]);
  });

  it('fila aberta: só a troca — o agendar já está na tela, como segunda porta', () => {
    expect(opcoesDoMenu({ soAgenda: false, fora: false, lojaAberta: true })).toEqual(['swap']);
  });

  it('fila fechada (DEC-6): só o pedido de corte — a troca também põe na fila; loja fechada: corte e troca', () => {
    expect(opcoesDoMenu({ soAgenda: false, fora: true, lojaAberta: true })).toEqual(['cut']);
    expect(opcoesDoMenu({ soAgenda: false, fora: true, lojaAberta: false })).toEqual(['cut']);
    expect(opcoesDoMenu({ soAgenda: false, fora: false, lojaAberta: false })).toEqual(['cut', 'swap']);
  });
});

describe('o fim de fila híbrido (C20)', () => {
  it('só com a fila aberta há a segunda porta — agendar ao lado de entrar agora', () => {
    expect(temSegundaPorta({ soAgenda: false, fora: false, lojaAberta: true })).toBe(true);
    expect(temSegundaPorta({ soAgenda: false, fora: true, lojaAberta: true })).toBe(false);
    expect(temSegundaPorta({ soAgenda: false, fora: false, lojaAberta: false })).toBe(false);
    expect(temSegundaPorta({ soAgenda: true, fora: false, lojaAberta: true })).toBe(false);
  });
});

describe('a recusa do servidor', () => {
  it('409 PROFESSIONAL_AGENDA_ONLY volta para agendar, com a mensagem de só agenda', () => {
    const r = recusaAoEntrar({ response: { status: 409, data: { code: 'PROFESSIONAL_AGENDA_ONLY' } } });
    expect(r).toEqual({ tipo: 'nao-aceita', mensagem: MENSAGEM_SO_AGENDA });
  });
});
