import { FlatList } from 'react-native';

import { VStack } from '@gluestack-ui/themed';

import { CardShop, CardShopProps } from './CardShop';

type Props = {
  data: CardShopProps[];
}

export function Shops({ data }: Props) {

  return (
    <VStack flex={1}>

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
                <CardShop 
                  data={item}
                />
              )}
        showsVerticalScrollIndicator={false}
      />
    </VStack>
  );
}