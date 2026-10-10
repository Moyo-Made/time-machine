import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/** Captures the mouse when the canvas is clicked and reports whether it is held. Esc releases it. */
export function PointerLock({ onChange }: { onChange: (locked: boolean) => void }) {
  const element = useThree((three) => three.gl.domElement)

  useEffect(() => {
    const request = () => {
      if (document.pointerLockElement === element) return
      // The browser may refuse, e.g. for about a second after Esc in Chrome.
      // Older Safari returns nothing instead of a promise.
      Promise.resolve(element.requestPointerLock()).catch(() => {})
    }
    const sync = () => onChange(document.pointerLockElement === element)

    element.addEventListener('click', request)
    document.addEventListener('pointerlockchange', sync)
    return () => {
      element.removeEventListener('click', request)
      document.removeEventListener('pointerlockchange', sync)
      if (document.pointerLockElement === element) document.exitPointerLock()
    }
  }, [element, onChange])

  return null
}
