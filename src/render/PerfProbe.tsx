import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { PerfSample } from '../state/gameStore'

const SAMPLE_INTERVAL = 0.5

/** Measures frame time and renderer workload, reporting twice a second. */
export function PerfProbe({ onSample }: { onSample: (sample: PerfSample) => void }) {
  const gl = useThree((three) => three.gl)
  const tally = useRef({ frames: 0, seconds: 0, worst: 0 })

  useFrame((_, delta) => {
    const current = tally.current
    current.frames += 1
    current.seconds += delta
    current.worst = Math.max(current.worst, delta)
    if (current.seconds < SAMPLE_INTERVAL) return

    onSample({
      fps: current.frames / current.seconds,
      frameMs: (current.seconds / current.frames) * 1000,
      worstFrameMs: current.worst * 1000,
      // Counts from the previous frame, shadow pass included.
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    })
    tally.current = { frames: 0, seconds: 0, worst: 0 }
  })

  return null
}
