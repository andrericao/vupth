import { Button as GluestackButton, Text } from "@gluestack-ui/themed";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof GluestackButton> & {
  title: string;
  isLoading?: boolean;
}

export function Button({title, isLoading = false, ...rest}: Props){
  return(
    <GluestackButton
      w="$full"
      h="$14"
      bg="$green500"
      $active-bg="$green800"
      { ...rest }>

      <Text>{title}</Text>
    </GluestackButton>
  );
}

/*import { ImageBackground } from "react-native";

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

export function Button1() {
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
*/