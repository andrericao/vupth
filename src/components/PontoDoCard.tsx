import { Box } from "@gluestack-ui/themed";

/**
 * O ponto de pendência dos cards (Pagamento pendente, corte sem avaliar): sempre na
 * bordinha do card, no meio da borda esquerda, e não ao lado do nome (André, 23/10,
 * dot-do-card-sem-avaliacao). O card precisa ser `position: relative` (o Box do
 * gluestack já é) e ter folga à esquerda (o padding de 16 do card).
 */
export const TAMANHO_DO_PONTO = 8;
export const RECUO_DO_PONTO = 5;

export function PontoDoCard({ testID }: { testID: string }) {
  return (
    <Box
      position="absolute"
      left={RECUO_DO_PONTO}
      top="50%"
      mt={-TAMANHO_DO_PONTO / 2}
      w={TAMANHO_DO_PONTO}
      h={TAMANHO_DO_PONTO}
      borderRadius={TAMANHO_DO_PONTO / 2}
      bg="$brandDanger"
      testID={testID}
    />
  );
}
