import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity } from "react-native";

import { Link, Icon, ChevronLeftIcon, Center, Box } from "@gluestack-ui/themed";

import { BrandMark } from "@components/BrandMark";

type Props = {
  showBackButton?: boolean;
};

export function Header({ showBackButton = false }: Props) {
  const navigation = useNavigation();

  function handleGoBack() {
    navigation.goBack();
  }

  return (
    <Center flexDirection="row">
      {showBackButton && (
        <Link flex={1}>
          <TouchableOpacity onPress={handleGoBack}>
            <Box
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
        </Link>
      )}
      {/* A arte da marca não mora aqui: ver `BrandMark` (fonte única). */}
      <TouchableOpacity>
        <BrandMark />
      </TouchableOpacity>
    </Center>
  );
}
