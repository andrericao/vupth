import { Button as GluestackButton, Text } from "@gluestack-ui/themed";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof GluestackButton> & {
  title: string;
  variant?: "solid" | "outline"
  isLoading?: boolean;
}

export function Button({title, variant = "solid", isLoading = false, ...rest}: Props){
  return(
    <GluestackButton
      w="$full"
      h="$14"
      bg={variant === "outline" ? "transparent" : "$green500"}
      $active-bg={variant === "outline" ? "$green500" : "$gray300"}
      borderWidth={variant === "outline" ? "$2" : "$0"}
      borderColor="$green500"
      { ...rest }>

      <Text 
      color={variant === "outline" ? "$green500" : "$white"}
      >{title}</Text>
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