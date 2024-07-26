import { Center, VStack } from "@gluestack-ui/themed";

import { Input } from "@components/Input";
import { CardService } from "@components/CardService";

import Logo from "@assets/waiting-room.svg";
import { Image } from "react-native-svg";

export function Services() {
  return (
    <VStack flex={1} px={10} py={15}>
      <Center >
        <Logo height={50} width={50} />
      </Center>
      <Center mt="$10">
        <Input placeholder="Escreva aqui" />

        <Center mt="$48" flex={3} flexDirection="row" flexWrap="wrap" gap={12}>
          <CardService />
          <CardService />
          <CardService />
          <CardService />
        </Center>
      </Center>
    </VStack>
  );
}
