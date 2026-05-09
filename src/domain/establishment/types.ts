export type ServiceType = 'BARBER' | 'BEAUTY_SALON' | 'NAIL_SALON' | 'SPA' | 'CLINIC';

export type ServiceItemType =
  | 'CORTE_MAQUINA'
  | 'CORTE_TESOURA'
  | 'BARBA'
  | 'CORTE_FEMININO'
  | 'MANICURE'
  | 'PEDICURE'
  | 'MASSAGEM'
  | 'DEPILACAO';

export interface ServiceItem {
  id: string;
  serviceItemType: ServiceItemType;
  customName: string;
  price: number;
  estimatedMinutes: number;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Establishment {
  id: string;
  name: string;
  serviceType: ServiceType;
  isOpen: boolean;
  address?: Address;
  serviceItems: ServiceItem[];
}
