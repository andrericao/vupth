import AsyncStorage from "@react-native-async-storage/async-storage";

import { SHOP_COLLECTION } from "@storage/storageConfig";

export async function shopsGetAll() {
  try {

    const storage = await AsyncStorage.getItem(SHOP_COLLECTION);
    const shops: string[] = storage ? JSON.parse(storage) : [];
    return shops;
		
  } catch (error) {
    throw error;
  }
}
