import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity, Image } from "react-native";

import { Link, Icon, ChevronLeftIcon, Center, Box } from "@gluestack-ui/themed";

// Logotipo dentro do app = o mesmo "V" do icone do celular (decisao Andre
// 2026-07-29), no lugar do desenho antigo do banco de espera: a marca passa a
// ser a mesma da tela inicial ate dentro do app.
const LOGO = require("@assets/vupth-logo/vupth-v.png");

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
      <TouchableOpacity accessibilityRole="image" accessibilityLabel="VUPTH">
        {/* O PNG carrega o fundo verde do icone: cantos arredondados fazem ele
            ler como marca, e nao como uma imagem solta no meio da tela. */}
        <Image
          source={LOGO}
          style={{ width: 46, height: 46, borderRadius: 12 }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </Center>
  );
}
