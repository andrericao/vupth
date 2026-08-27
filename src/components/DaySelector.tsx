import { ScrollView } from "react-native";
import { Pressable, VStack, Text } from "@gluestack-ui/themed";

import { buildDayOptions, isSameDay, SCHEDULE_HORIZON_DAYS } from "@domain/schedule/days";

type Props = {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  // Início da faixa (default = hoje) e quantos dias mostrar (default = horizonte).
  from?: Date;
  count?: number;
};

// Seletor de dia do "Agendar" (Item ② — Agendar = INTENÇÃO). Faixa horizontal de
// pílulas: "Hoje" e depois os números dos dias seguintes (mockup partner
// design/agendamento-barra.html usa a mesma ideia de faixa). Escolhido o dia, o
// pai abre a barra de encaixe daquele dia.
export function DaySelector({ selectedDate, onSelect, from, count = SCHEDULE_HORIZON_DAYS }: Props) {
  const days = buildDayOptions(from ?? new Date(), count);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
    >
      {days.map((day) => {
        const selected = selectedDate != null && isSameDay(day.date, selectedDate);
        return (
          <Pressable
            key={day.date.toISOString()}
            onPress={() => onSelect(day.date)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={day.isToday ? "Hoje" : `Dia ${day.dayNumber}`}
            // [contraste] O chip nao-selecionado era INVISIVEL: fundo branco,
            // borda `$gray200` (#F2F3F3, 1.11:1) e o NUMERO DO DIA em
            // `$gray500` (#DDDEDF, 1.35:1) — o conteudo principal do chip,
            // abaixo do minimo WCAG de 4.5:1. Fundo passou pro `$brandSurface`
            // (o cinza da marca ja separa do branco, sem depender de borda) e
            // os textos pros tokens da marca. Selecionado segue forest, com
            // `$brandGreen` por cima — o par da marca sobre fundo escuro
            // (era `$green100`/`$white`, da paleta antiga).
            bg={selected ? "$forest" : "$brandSurface"}
            borderRadius="$xl"
            px="$4"
            py="$3"
            minWidth={64}
          >
            <VStack alignItems="center" gap="$1">
              <Text size="xs" color={selected ? "$brandGreen" : "$brandTextSecondary"}>
                {day.weekday}
              </Text>
              <Text
                fontFamily="$heading"
                size={day.isToday ? "sm" : "md"}
                color={selected ? "$brandGreen" : "$forest"}
              >
                {day.label}
              </Text>
            </VStack>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

