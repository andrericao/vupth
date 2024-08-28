import {
  Box,
  Heading,
  Text,
  Link,
  Icon,
  StarIcon,
  ChevronRightIcon,
} from "@gluestack-ui/themed";
import { ImagePerfil } from "./ImagePerfil";
import { ViewProps } from "react-native-svg/lib/typescript/fabric/utils";

type Props = ViewProps

export function CardProfessional({ ...rest }: Props ) {
  return (
    <Box {...rest}
      justifyContent="center"
      bg="$light200"
      m={15}
      h={120}
      borderRadius={54}
    >
      <Box justifyContent="space-between" flexDirection="row">
        <Box flexDirection="row" gap={21}>
          <ImagePerfil />

          <Box alignItems="flex-start">
            <Heading fontFamily="$heading">Manicure 1</Heading>
            <Text fontFamily="$body">Estimativa de Fila: 02:15</Text>
            <Box gap={9} mt={6} flexDirection="row" alignItems="center">
              <Icon
                color="$yellow300"
                fill="$yellow300"
                as={StarIcon}
                size="xl"
              />
              <Text alignItems="center" fontFamily="$body" fontSize="$xl">
                4.8
              </Text>
            </Box>
          </Box>
        </Box>
        <Link flexDirection="row" alignItems="center">
          <Icon as={ChevronRightIcon} size="xl" />
        </Link>
      </Box>
    </Box>
  );
}
