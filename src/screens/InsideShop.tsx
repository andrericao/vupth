import { useState } from "react";
import { FlatList } from "react-native";

import { VStack, Heading, Box } from "@gluestack-ui/themed";

import { ImageBanner } from "@components/ImageBanner";
import { CardProfessional } from "@components/CardProfessional";

export function InsideShop() {

	const [professionalList, setProfessionalList] = useState([
		"Barbeiro 1",
		"Barbeiro 2",
		"Barbeiro 3",
		"Barbeiro 4"
	])

  return (
    <VStack>
      <ImageBanner />
      <Box
        px={15}
        flexDirection="row"
        my={15}
        gap={9}
        justifyContent="space-between"
      >
        <Heading fontFamily="$heading">Funcionários 5</Heading>
        <Heading fontFamily="$heading">Filtrar </Heading>
      </Box>

			<FlatList 
				data={professionalList}
				keyExtractor={(item) => item}
				renderItem={() => <CardProfessional p={15} />}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 200 }}
			/>
    </VStack>
  );
}
