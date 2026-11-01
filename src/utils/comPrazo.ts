// ota-trava-ao-verificar (Orquestrador, 31/10): o checkForUpdateAsync e o
// fetchUpdateAsync nao tem prazo proprio; com a rede pendurada o "Verificando..."
// ficava para sempre. Passou do prazo, a promessa rejeita e o catch da tela fala.
export function comPrazo<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`prazo de ${ms} ms esgotado`)), ms);
    promessa.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
