import { ImageBackground } from "react-native";

import {
  Center,
  Box,
  Heading,
  Link,
  LinkText,
  Icon,
  ChevronRightIcon,
} from "@gluestack-ui/themed";

import Barbearia from "@assets/sobrancelha.png";

export function Button() {
  return (
    <Box overflow="hidden"  borderRadius={12}>
      <ImageBackground source={Barbearia} resizeMode="cover">
        <Box py="$6" pl="$5" justifyContent="space-between">
          <Heading fontFamily="$heading" fontSize="$3xl" color="$white">
            Barbeiro
          </Heading>

          <Center h="$10" w="$32" borderRadius={18} bg="$success50">
            <Link href="#" flexDirection="row" alignItems="center" gap={3}>
              <LinkText
                textDecorationLine="none"
                color="$success950"
                fontFamily="$body"
              >
                Ver mais
              </LinkText>
              <Icon as={ChevronRightIcon} size="md" />
            </Link>
          </Center>
        </Box>
      </ImageBackground>
    </Box>
  );
}
