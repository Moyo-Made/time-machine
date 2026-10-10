import { isShortcut } from '../keys'
import type { MoveIntent } from './movement'

export interface PlayerInput {
  /** Movement currently being held. */
  intent(): MoveIntent
  /** Mouse movement in pixels since the last call. */
  consumeLook(): { dx: number; dy: number }
  /** Forgets every held key and pending mouse movement. */
  reset(): void
  dispose(): void
}

/** Chrome occasionally reports a huge single delta under pointer lock. */
const MAX_LOOK_DELTA = 150

const clampDelta = (value: number) => Math.min(Math.max(value, -MAX_LOOK_DELTA), MAX_LOOK_DELTA)

/**
 * Tracks keyboard and mouse state. Keys are matched by physical position
 * (`event.code`), so WASD sits in the same place on any keyboard layout.
 */
export function createPlayerInput(): PlayerInput {
  const held = new Set<string>()
  let lookX = 0
  let lookY = 0

  const reset = () => {
    held.clear()
    lookX = 0
    lookY = 0
  }

  const onKeyDown = (event: KeyboardEvent) => {
    // Shortcuts are not movement. macOS also never sends keyup for a key that
    // is released while Cmd is down, so drop everything rather than risk a stuck key.
    if (isShortcut(event)) held.clear()
    else held.add(event.code)
  }
  const onKeyUp = (event: KeyboardEvent) => held.delete(event.code)
  // A key released while the window is unfocused never sends keyup.
  const onBlur = reset
  const onMouseMove = (event: MouseEvent) => {
    lookX += clampDelta(event.movementX)
    lookY += clampDelta(event.movementY)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  document.addEventListener('mousemove', onMouseMove)

  const axis = (positive: readonly string[], negative: readonly string[]) =>
    Number(positive.some((code) => held.has(code))) -
    Number(negative.some((code) => held.has(code)))

  return {
    intent: () => ({
      forward: axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
      right: axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']),
      run: held.has('ShiftLeft') || held.has('ShiftRight'),
    }),
    consumeLook: () => {
      const look = { dx: lookX, dy: lookY }
      lookX = 0
      lookY = 0
      return look
    },
    reset,
    dispose: () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('mousemove', onMouseMove)
    },
  }
}
