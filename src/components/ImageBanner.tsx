import { TouchableOpacity } from "react-native";

import { useNavigation } from "@react-navigation/native";

import {
  Box,
  ImageBackground,
  ChevronLeftIcon,
  Icon,
} from "@gluestack-ui/themed";

import { ImageSourcePropType } from "react-native";

type Props = {
  data: ImageSourcePropType;
};

export function ImageBanner({ data, ...rest }: Props) {
  const navigation = useNavigation();

  function handleGoBack() {
    navigation.goBack();
  }

  return (
    <Box {...rest} h={300} w="$full">
			<TouchableOpacity onPress={handleGoBack}>
        <Box
          py={21}
          alignItems="center"
          justifyContent="center"
          rounded={18}
          w={39}
          h={39}
          bg="$green200"
        >
          <Icon as={ChevronLeftIcon} size="xl" />
        </Box>
      </TouchableOpacity>
      <ImageBackground flex={1} source={data} resizeMode="stretch" />
    </Box>
  );
}
