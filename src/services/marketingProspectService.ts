import { reactive } from 'vue'

export type ProspectStatus =
  | 'Prospek'
  | 'Tindak Lanjut'
  | 'Booking'
  | 'Terjual'

export interface Prospect {
  id: number
  name: string
  phone: string
  email?: string | null
  address?: string | null
  source?: string | null
  lotId?: number | null
  lotNumber?: string | null
  area?: number | null
  block?: string | null
  paymentMethod?: string | null
  tenor?: string | null
  notes?: string | null
  status: ProspectStatus
  createdAt: string
}

export const marketingProspects = reactive<Prospect[]>([
  {
    id: 1,
    name: 'Komon Saha',
    phone: '08080131031',
    lotNumber: 'LOT-023',
    area: 120,
    block: 'Blok A',
    status: 'Tindak Lanjut',
    createdAt: new Date(
      Date.now() - 2 * 60 * 60 * 1000,
    ).toISOString(),
  },
  {
    id: 2,
    name: 'Yoshi Kojong',
    phone: '08244724624',
    lotNumber: 'LOT-070',
    area: 120,
    block: 'Blok A',
    status: 'Prospek',
    createdAt: new Date(
      Date.now() - 2 * 60 * 60 * 1000,
    ).toISOString(),
  },
  {
    id: 3,
    name: 'Timothy Ronald',
    phone: '082470131031',
    lotNumber: 'LOT-025',
    area: 120,
    block: 'Blok A',
    status: 'Booking',
    createdAt: new Date(
      Date.now() - 2 * 60 * 60 * 1000,
    ).toISOString(),
  },
  {
    id: 4,
    name: 'Contoh Klien Terjual',
    phone: '080000000004',
    lotNumber: 'LOT-026',
    area: 120,
    block: 'Blok A',
    paymentMethod: 'Tunai',
    status: 'Terjual',
    createdAt: new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  },
])
