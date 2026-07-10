export type ServiceType = 'BARBER' | 'BEAUTY_SALON' | 'EYEBROW' | 'NAIL_SALON' | 'SPA' | 'CLINIC';

export type OpenStatus = 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED';

export type EstablishmentStatus = 'ACTIVE' | 'INACTIVE' | 'TEMPORARY_CLOSED';

export type ServiceItemType =
  | 'CORTE_MAQUINA'
  | 'CORTE_TESOURA'
  | 'BARBA'
  | 'SOBRANCELHA'
  | 'PINTURA'
  | 'HENNA_SOBRANCELHA'
  | 'MICROPIGMENTACAO_SOBRANCELHA'
  | 'BROW_LAMINATION'
  | 'TINTURA_SOBRANCELHA'
  | 'RECORTE_PONTAS'
  | 'ESCOVA'
  | 'HIDRATACAO'
  | 'PROGRESSIVA'
  | 'MANICURE'
  | 'PEDICURE'
  | 'UNHAS_GEL'
  | 'NAIL_ART'
  | 'MASSAGEM_RELAXANTE'
  | 'MASSAGEM_MODELADORA'
  | 'LIMPEZA_PELE'
  | 'DEPILACAO'
  | 'DRENAGEM'
  | 'PEELING'
  | 'BOTOX'
  | 'MICROAGULHAMENTO';

export interface ServiceItem {
  id: string;
  serviceItemType: ServiceItemType;
  customName: string;
  price: number;
  estimatedMinutes?: number;
  weeklyAverageDurationInMinutes?: number | null;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
}

export interface Establishment {
  id: string;
  name: string;
  ownerId: string;
  urlImage: string | null;
  serviceType?: ServiceType;
  open_status: OpenStatus;
  status: EstablishmentStatus;
  services: string[];
  address?: Address;
  // Menor tempo de espera (min) entre os profissionais com servico — so vem na
  // listagem GET /establishment. null = sem profissional disponivel (esconder).
  estimated_wait_minutes?: number | null;
  // Qtd de profissionais AFILIADOS com >=1 servico (agendaveis) — usado para
  // decidir se uma loja FECHADA vale aparecer (da pra agendar pra reabertura).
  // AGUARDA BACKEND expor na listagem (HANDOFF secao 11); ausente => fechada
  // fica escondida.
  available_professionals?: number | null;
  // Avaliacao da loja — Item 6 backend. Opcional ate implementar; ausente =>
  // placeholder (pseudoRating). O card mostra a MAIOR estrela (rating_best =
  // melhor profissional) quando presente; senao a media agregada.
  rating_average?: number | null;
  rating_best?: number | null;
  rating_count?: number;
}

export interface EstablishmentDetail extends Omit<Establishment, 'services'> {
  services: string[];
  total_in_queue?: number;
  available_professionals?: number;
}
