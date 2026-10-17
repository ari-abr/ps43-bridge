import { useEffect, useState } from 'react'
import { subscribe } from './api'
import {
  checkForCourseUpdate,
  getCurrentStudent,
  getDeviceSchool,
  getInstalledPack,
  getPackState,
  getProgressSync,
  getStudents,
} from './learning'
import { useSyncStatus } from './useSyncStatus'

function read() {
  return {
    schoolId: getDeviceSchool(),
    pack: getInstalledPack(),
    packState: getPackState(),
    students: getStudents(),
    current: getCurrentStudent(),
    progressSync: getProgressSync(),
  }
}

/** Live Learning state for this device, updated on every change (this window or another). */
export function useLearning() {
  const [state, setState] = useState(read)
  useEffect(() => subscribe(() => setState(read())), [])
  return state
}

/** Check for a newer course pack when the page opens Online and whenever the toggle switches to Online. */
export function useCourseUpdates(enabled: boolean) {
  const { online } = useSyncStatus()
  const [checking, setChecking] = useState(false)
  useEffect(() => {
    if (!online || !enabled) {
      setChecking(false)
      return
    }
    let live = true
    setChecking(true)
    void checkForCourseUpdate().finally(() => live && setChecking(false))
    return () => {
      live = false
    }
  }, [online, enabled])
  return { online, checking }
}
