import { Modal } from "react-native";
import { VStack, HStack, Box, Text, Heading, Badge, BadgeText, ScrollView } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { floatingShadow } from "@utils/styles";
import { ClientAttendance } from "@services/attendanceService";
import { formatClockTime, STATUS_DESCONHECIDO } from "@domain/queue/types";
import type { NomeDeCor } from "@domain/tema";
import { useTema } from "@hooks/useTema";

// [marca-vupth] Este era o ultimo lugar do app na paleta ANTERIOR (#3B7A3F,
// #E63946, #F59E0B) e a unica cor por status, com texto branco fixo por cima.
// Agora cada status e um PAR (fundo, texto), IGUAL ao `HISTORY_STATUS` de
// `screens/Attendances.tsx` — o mesmo atendimento aparece la na lista e aqui no
// detalhe, e com duas tabelas ele sairia com duas caras. Os dois status que so
// existem aqui seguem o que o app ja mostra: IN_PROGRESS usa o par da pilula
// "Em atendimento" da Attendances ($brandGreen + $forest) e SCHEDULED fica no
// par neutro (o mesmo do fallback), porque "Aguardando" e estado normal — o
// pessego e reservado pro LATE, que e o que pede atencao.
//
// Cada cor e o NOME do token, resolvido no tema. A pilula neutra usa o papel
// `sobrePainel` (a surface no claro): ela mora DENTRO do painel do modal, e a
// surface do escuro e a cor do proprio painel — a pilula viraria so texto solto.
const STATUS: Record<string, { label: string; bg: NomeDeCor; fg: NomeDeCor }> = {
  FINISHED: { label: "Concluído", bg: "greenTint", fg: "onGreenTint" },
  CANCELLED: { label: "Cancelado", bg: "sobrePainel", fg: "danger" },
  REMOVED: { label: "Retirado pela loja", bg: "sobrePainel", fg: "danger" },
  LATE: { label: "Atrasado", bg: "accentPeach", fg: "onAccentPeach" },
  IN_PROGRESS: { label: "Em atendimento", bg: "green", fg: "onGreen" },
  SCHEDULED: { label: "Aguardando", bg: "sobrePainel", fg: "textSecondary" },
};

function dateOnly(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function timeOnly(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatClockTime(new Date(iso));
  } catch {
    return "—";
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <HStack w="$full" justifyContent="space-between" mb="$2" alignItems="flex-start">
      <Text size="sm" color="$brandTextSecondary">{label}</Text>
      <Text size="sm" fontFamily="$heading" flex={1} textAlign="right" ml="$3">
        {value}
      </Text>
    </HStack>
  );
}

type Props = {
  attendance: ClientAttendance | null;
  onClose: () => void;
  onRate: () => void;
  // false quando o atendimento já foi avaliado (esconde o "Avaliar").
  canRate?: boolean;
  // "Ver profissional": abre as informações dele (foto, serviços, telefone).
  onVerProfissional?: () => void;
};

// Detalhes de um atendimento (quem atendeu, quando, serviços, duração, valor) +
// opção de avaliar (quando FINISHED e ainda não avaliado).
export function AttendanceDetailModal({ attendance, onClose, onRate, canRate = true, onVerProfissional }: Props) {
  const { cores, veu } = useTema();
  const a = attendance;
  const st = a ? STATUS[a.status] ?? { label: STATUS_DESCONHECIDO, bg: "sobrePainel" as const, fg: "textSecondary" as const } : null;

  return (
    <Modal visible={!!a} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg={veu} justifyContent="center" px={24}>
        {a && st && (
          <VStack bg="$painel" borderRadius="$card" p="$6" style={floatingShadow} maxHeight="80%">
            <HStack justifyContent="space-between" alignItems="center" mb="$4">
              <Heading fontFamily="$heading" fontSize="$lg" flex={1}>
                Detalhes do atendimento
              </Heading>
              <Badge bg={cores[st.bg]} borderRadius="$full" px="$3" py="$1">
                <BadgeText color={cores[st.fg]} size="xs">{st.label}</BadgeText>
              </Badge>
            </HStack>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Row label="Profissional" value={a.professionalName} />
              {a.establishmentName ? <Row label="Local" value={a.establishmentName} /> : null}
              <Row
                label="Serviços"
                value={a.services.map((s) => s.customName).join(", ") || "—"}
              />
              <Row label="Dia" value={dateOnly(a.startTime ?? a.scheduledTime)} />
              <Row label="Início" value={timeOnly(a.startTime ?? a.scheduledTime)} />
              {a.endTime ? <Row label="Término" value={timeOnly(a.endTime)} /> : null}
              {a.durationInMinutes != null ? (
                <Row label="Duração" value={`${a.durationInMinutes} min`} />
              ) : null}
              <Row label="Valor" value={a.totalValue != null ? `R$ ${a.totalValue.toFixed(2)}` : "—"} />
            </ScrollView>

            {a.status === "FINISHED" && canRate && (
              <Button title="Avaliar atendimento" mt="$5" onPress={onRate} />
            )}
            {onVerProfissional && (
              <Button
                title="Ver profissional"
                variant="outline"
                mt="$3"
                testID="ver-profissional"
                onPress={onVerProfissional}
              />
            )}
            <Button title="Fechar" variant="outline" mt="$3" onPress={onClose} />
          </VStack>
        )}
      </Box>
    </Modal>
  );
}
