import {
  Persistence,
  PersistenceType,
  PersistenceValue,
  Instantiator
} from '../persistence';

import AsyncStorage from '@react-native-community/async-storage';

class ReactNativeLocalPersistence implements Persistence {
  type: PersistenceType = PersistenceType.LOCAL;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async set(key: string, value: PersistenceValue): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async get<T extends PersistenceValue>(
    key: string,
    instantiator?: Instantiator<T>
  ): Promise<T | null> {
    const json = await AsyncStorage.getItem(key);
    const obj = json ? JSON.parse(json) : null;
    return instantiator && obj ? instantiator(obj) : obj;
  }

  async remove(key: string): Promise<void> {
    const json = await AsyncStorage.removeItem(key);
  }
}

export const reactNativeLocalPersistence: Persistence = new ReactNativeLocalPersistence();
