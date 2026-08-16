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
            bg={selected ? "$forest" : "$white"}
            borderWidth="$1"
            borderColor={selected ? "$forest" : "$gray200"}
            borderRadius="$xl"
            px="$4"
            py="$3"
            minWidth={64}
          >
            <VStack alignItems="center" gap="$1">
              <Text size="xs" color={selected ? "$green100" : "$gray400"}>
                {day.weekday}
              </Text>
              <Text
                fontFamily="$heading"
                size={day.isToday ? "sm" : "md"}
                color={selected ? "$white" : "$gray500"}
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

