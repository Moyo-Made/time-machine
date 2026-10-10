import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'
import './hud.css'

const CONTROLS = [
  { keys: ['W', 'A', 'S', 'D'], action: 'Move' },
  { keys: ['Mouse'], action: 'Look around' },
  { keys: ['Shift'], action: 'Run' },
  { keys: ['Esc'], action: 'Release the mouse' },
  { keys: ['P'], action: 'Show or hide performance' },
] as const

function PerfPanel() {
  const perf = useGameStore((state) => state.perf)

  return (
    <div className="hud-perf" data-testid="perf">
      {perf === null ? (
        'measuring…'
      ) : (
        <>
          <div>
            {perf.fps.toFixed(0)} fps · {perf.frameMs.toFixed(1)} ms (worst{' '}
            {perf.worstFrameMs.toFixed(1)})
          </div>
          <div>
            {perf.drawCalls} draw calls · {perf.triangles.toLocaleString('en')} triangles
          </div>
        </>
      )}
    </div>
  )
}

/** DOM overlay above the canvas. Never takes pointer events, so clicks reach the game. */
export function Hud() {
  const engaged = useGameStore((state) => state.engaged)
  const perfVisible = useGameStore((state) => state.perfVisible)
  const togglePerf = useGameStore((state) => state.togglePerf)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyP' && !event.repeat) togglePerf()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePerf])

  return (
    <div className="hud">
      {perfVisible && <PerfPanel />}

      {engaged ? (
        <>
          <div className="hud-crosshair" />
          <p className="hud-hint">
            <kbd>WASD</kbd> move · <kbd>Mouse</kbd> look · <kbd>Shift</kbd> run · <kbd>Esc</kbd>{' '}
            release
          </p>
        </>
      ) : (
        <div className="hud-start">
          <div className="hud-card">
            <h1>Time Machine</h1>
            <p className="hud-lede">Click to explore</p>
            <dl>
              {CONTROLS.map(({ keys, action }) => (
                <div key={action}>
                  <dt>
                    {keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
            <p className="hud-touch">A keyboard and mouse are needed for now.</p>
          </div>
        </div>
      )}
    </div>
  )
}
