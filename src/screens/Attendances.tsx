import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  VStack,
  Text,
  Heading,
  Box,
  HStack,
  Center,
  ScrollView,
  Badge,
  BadgeText,
} from "@gluestack-ui/themed";
import { Queue, Clock, CaretRight } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { useQueueStore } from "@stores/queueStore";
import { formatWaitTime } from "@domain/queue/types";

export function Attendances() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const activeQueue = useQueueStore((s) => s.activeQueue);

  function handleGoToQueue() {
    if (!activeQueue) return;
    navigation.navigate("queueStatus", {
      professionalId: activeQueue.professionalId,
      establishmentId: activeQueue.establishmentId,
    });
  }

  return (
    <VStack flex={1} bg="$gray700">
      <VStack px={15} pt={60}>
        <Header showBackButton />
        <Heading fontFamily="$heading" fontSize="$2xl" mt="$4">
          Atendimentos
        </Heading>
      </VStack>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
        <VStack mt="$6" px={15}>
          <Text
            size="xs"
            color="$gray300"
            fontFamily="$heading"
            mb="$2"
          >
            EM ANDAMENTO
          </Text>

          {activeQueue ? (
            <TouchableOpacity onPress={handleGoToQueue}>
              <Box bg="$white" p="$4" borderRadius="$lg" borderWidth="$1" borderColor="$green500">
                <HStack alignItems="center" gap="$3">
                  <Queue size={24} color="#22C55E" />
                  <VStack flex={1}>
                    <Text fontFamily="$heading" size="sm">
                      {activeQueue.establishmentName}
                    </Text>
                    <Text size="xs" color="$gray300">
                      {activeQueue.professionalName}
                    </Text>
                  </VStack>
                  <Badge bg="$green500" borderRadius="$full" px="$3" py="$1">
                    <BadgeText color="$white" size="xs">Na fila</BadgeText>
                  </Badge>
                  <CaretRight size={18} color="#9CA3AF" />
                </HStack>
              </Box>
            </TouchableOpacity>
          ) : (
            <Box bg="$white" p="$4" borderRadius="$lg">
              <Text size="sm" color="$gray300" textAlign="center">
                Nenhum atendimento em andamento
              </Text>
            </Box>
          )}
        </VStack>

        <VStack mt="$6" px={15}>
          <Text
            size="xs"
            color="$gray300"
            fontFamily="$heading"
            mb="$2"
          >
            REALIZADOS
          </Text>

          <Center py="$8">
            <Clock size={40} color="#9CA3AF" />
            <Text size="sm" color="$gray300" mt="$2">
              Histórico em breve
            </Text>
          </Center>
        </VStack>
      </ScrollView>
    </VStack>
  );
}
