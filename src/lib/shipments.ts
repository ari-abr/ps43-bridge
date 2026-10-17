// Shipment rules shared by the app and scripts/seed.ts. Plain rules, no AI.
import type { Confirmation, Device, KitItem, Shipment, ShipmentStatus } from './types.ts'

export const confirmationId = (shipmentId: string, party: Confirmation['party']) => `conf-${shipmentId}-${party}`

/**
 * The one place a shipment's status is decided:
 *   verified    coordinator AND teacher confirmed
 *   delivered   coordinator confirmed
 *   in transit  marked in transit by the Admin
 *   approved    otherwise
 */
export function shipmentStatus(
  shipment: Pick<Shipment, 'inTransitAt'>,
  coordinator: Confirmation | null,
  teacher: Confirmation | null,
): ShipmentStatus {
  if (coordinator && teacher) return 'verified'
  if (coordinator) return 'delivered'
  if (shipment.inTransitAt) return 'in transit'
  return 'approved'
}

/** "PS43-0001" */
export const assetId = (n: number) => `PS43-${String(n).padStart(4, '0')}`

/** The number in an asset id, or 0 if it is not one. */
export const assetNumber = (id: string) => (/^PS43-(\d+)$/.exec(id) ? Number(id.slice(5)) : 0)

/** One device per device item in the kit, numbered from `firstNumber`. */
export function devicesForKit(items: KitItem[], firstNumber: number): Device[] {
  const devices: Device[] = []
  let n = firstNumber
  for (const item of items.filter((i) => i.isDevice)) {
    for (let q = 0; q < item.qty; q++) {
      devices.push({ assetId: assetId(n++), type: item.name.toLowerCase().includes('server') ? 'server' : 'laptop' })
    }
  }
  return devices
}

/** Each school's current shipment: the most recently created one. */
export function latestBySchool<T extends { schoolId: string; createdAt: string }>(shipments: T[]): Map<string, T> {
  const bySchool = new Map<string, T>()
  for (const sh of shipments) {
    const current = bySchool.get(sh.schoolId)
    if (!current || sh.createdAt >= current.createdAt) bySchool.set(sh.schoolId, sh)
  }
  return bySchool
}
