import { postAuthRoute } from '@domain/auth/postAuthRoute';

const ALVO = { establishmentId: 'e1', professionalId: 'p1' };

describe('para onde ir depois de autenticar', () => {
  it('volta pra seleção de serviço com a escolha intacta', () => {
    const d = postAuthRoute({
      ...ALVO, redirectTo: 'serviceSelection', serviceItemIds: ['s1', 's2'], establishmentOpen: true,
    });
    expect(d).toMatchObject({ tipo: 'replace', rota: 'serviceSelection' });
    // A seleção não pode se perder: sem ela a pessoa refaz tudo depois de
    // criar conta, que é o pior momento possível pra pedir de novo.
    expect(d.tipo === 'replace' && d.params.serviceItemIds).toEqual(['s1', 's2']);
  });

  it('volta pra fila levando o horário alvo', () => {
    const d = postAuthRoute({ ...ALVO, redirectTo: 'queueStatus', targetTime: '14:30' });
    expect(d).toMatchObject({ tipo: 'replace', rota: 'queueStatus' });
    expect(d.tipo === 'replace' && d.params.targetTime).toBe('14:30');
  });

  it('sem destino, vai pra Home — e RESETA a pilha', () => {
    // reset, não replace: quem acabou de criar conta não pode "voltar" pro
    // cadastro que ele já completou.
    expect(postAuthRoute({})).toEqual({ tipo: 'reset', rota: 'home' });
  });

  it('destino declarado mas INCOMPLETO cai na Home em vez de navegar quebrado', () => {
    expect(postAuthRoute({ redirectTo: 'queueStatus', establishmentId: 'e1' }).rota).toBe('home');
    expect(postAuthRoute({ redirectTo: 'serviceSelection', professionalId: 'p1' }).rota).toBe('home');
  });

  it('preenche os opcionais da seleção de serviço, que a tela exige', () => {
    const d = postAuthRoute({ ...ALVO, redirectTo: 'serviceSelection' });
    expect(d.tipo === 'replace' && d.params).toMatchObject({
      professionalName: '', establishmentName: '', estimatedWaitMinutes: 0,
    });
  });
});
