import { FlatList } from "react-native";

import { CardProf, CardProfProps } from "./CardProf";

type Props = {
  data: CardProfProps[];
}

export function Profs({ data }: Props) {
	return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => 
			<CardProf 
				data={item} 
			/>
			}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 200 }}
    />
  );
}
