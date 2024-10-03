import {
  TouchableOpacity,
  TouchableOpacityProps,
  ImageSourcePropType,
} from "react-native";

import {
  Box,
  Text,
  ImageBackground,
  Heading,
  Icon,
  ChevronRightIcon,
  StarIcon,
  Button,
  VStack,
} from "@gluestack-ui/themed";

export type CardShopProps = {
  id: string;
  serviceName: string;
  reviews: number;
  photoShop: ImageSourcePropType;
  shopName: string;
};

type Props = TouchableOpacityProps & {
  data: CardShopProps;
};

export function CardShop({ data, ...rest }: Props) {
  return (
    <TouchableOpacity {...rest}>
      <VStack mt="$9">
        <Box          
          h={120}
          flexDirection="row"
          borderRadius={12}
          bg="$gray500"
          overflow="hidden"
        >
          <Box w={180} h="$full">
            <ImageBackground
              flex={1}
              source={data.photoShop}
              resizeMode="cover"
            />
          </Box>
          <Box
            px={12}
            flex={1}
            flexDirection="row"
            justifyContent="space-between"
          >
            <Box justifyContent="center">
              <Heading fontFamily="$heading" fontSize="$xl" color="$black">
                {data.shopName}
              </Heading>
              <Text fontFamily="$body">Tempo Estimado: 01h40</Text>
              <Box gap={9} mt={12} flexDirection="row" alignItems="center">
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
            <Box flexDirection="row" alignItems="center">
              <Button bg="$transparent" alignItems="center">
                <Icon as={ChevronRightIcon} size="xl" />
              </Button>
            </Box>
          </Box>
        </Box>
      </VStack>
    </TouchableOpacity>
  );
}
