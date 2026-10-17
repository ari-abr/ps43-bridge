import { useEffect, useState } from 'react'
import { getQueueCount, isOnline, subscribe } from './api'

/** Live Online/Offline state and upload queue size, updated across windows. */
export function useSyncStatus() {
  const read = () => ({ online: isOnline(), queueCount: getQueueCount() })
  const [status, setStatus] = useState(read)
  useEffect(() => subscribe(() => setStatus(read())), [])
  return status
}
