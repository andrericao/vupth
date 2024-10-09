import { TouchableOpacityProps, ImageSourcePropType } from "react-native";

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

export type CardProfProps = {
  id: string;
  photoPerfil: ImageSourcePropType;
  profName: string;
  reviews: number;
  estimatedTime: string;
  shopName: string;
};

type Props = TouchableOpacityProps & {
  data: CardProfProps;
};

export function CardProf({ data, ...rest }: Props) {

  return (
    <Box
      {...rest}
      justifyContent="center"
      bg="$light200"
      p={15}
      m={15}
      h={120}
      borderRadius={54}
    >
      <Box justifyContent="space-between" flexDirection="row">
        <Box flexDirection="row" gap={21}>
          <ImagePerfil data={data.photoPerfil} />

          <Box alignItems="flex-start">
            <Heading fontFamily="$heading">{data.profName}</Heading>
            <Text fontFamily="$body">
              Estimativa de Fila: {data.estimatedTime}
            </Text>
            <Box gap={9} mt={6} flexDirection="row" alignItems="center">
              <Icon
                color="$yellow300"
                fill="$yellow300"
                as={StarIcon}
                size="xl"
              />
              <Text alignItems="center" fontFamily="$body" fontSize="$xl">
                {data.reviews}
              </Text>
            </Box>
          </Box>
        </Box>
        <Link
          onPress={() => handleProf(data.shopName)}
          flexDirection="row"
          alignItems="center"
        >
          <Icon as={ChevronRightIcon} size="xl" />
        </Link>
      </Box>
    </Box>
  );
}
