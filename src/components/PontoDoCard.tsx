import { Box } from "@gluestack-ui/themed";

/**
 * O ponto de pendência dos cards (Pagamento pendente, corte sem avaliar): SEMPRE no canto superior
 * direito do card, em cima da borda arredondada, meio dentro e meio fora, nunca ao lado do nome nem
 * em outro canto (André, 24/10, dot-no-canto-do-card; reabre o dot-do-card-sem-avaliacao). Um
 * componente só, com a posição fixa aqui: nenhuma tela escreve número de posição. O card precisa ser
 * `position: relative` (o Box do gluestack já é) e não cortar o que passa da borda.
 */
export const TAMANHO_DO_PONTO = 10;
// metade do ponto para fora de cada borda: o centro do ponto fica exatamente no canto
export const RECUO_DO_PONTO = -TAMANHO_DO_PONTO / 2;

export function PontoDoCard({ testID }: { testID: string }) {
  return (
    <Box
      position="absolute"
      right={RECUO_DO_PONTO}
      top={RECUO_DO_PONTO}
      w={TAMANHO_DO_PONTO}
      h={TAMANHO_DO_PONTO}
      borderRadius={TAMANHO_DO_PONTO / 2}
      bg="$brandDanger"
      testID={testID}
    />
  );
}
