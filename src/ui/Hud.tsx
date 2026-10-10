import { useEffect } from 'react'
import { isShortcut } from '../keys'
import { useGameStore } from '../state/gameStore'
import { FocusPrompt } from './FocusPrompt'
import { InspectionPanel } from './InspectionPanel'
import { Journal } from './Journal'
import './hud.css'

const CONTROLS = [
  { keys: ['W', 'A', 'S', 'D'], action: 'Move' },
  { keys: ['Mouse'], action: 'Look around' },
  { keys: ['Shift'], action: 'Run' },
  { keys: ['T'], action: 'Shift era' },
  { keys: ['E'], action: 'Inspect what you are looking at' },
  { keys: ['J'], action: 'Open or close the journal' },
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
  const era = useGameStore((state) => state.era)
  const notice = useGameStore((state) => state.notice)
  const focused = useGameStore((state) => state.focus !== null)
  const perfVisible = useGameStore((state) => state.perfVisible)
  const togglePerf = useGameStore((state) => state.togglePerf)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyP' && !event.repeat && !isShortcut(event)) togglePerf()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePerf])

  return (
    <div className="hud">
      {perfVisible && <PerfPanel />}

      <div className="hud-era">
        <span>Era</span>
        <strong data-testid="era">{era}</strong>
      </div>
      {notice && (
        // Keyed so that a repeated message restarts its fade-out.
        <p key={notice.id} className="hud-notice" role="status">
          {notice.text}
        </p>
      )}

      {engaged ? (
        <>
          <div className={focused ? 'hud-crosshair hud-crosshair-focused' : 'hud-crosshair'} />
          <FocusPrompt />
          <InspectionPanel />
          <Journal />
          {/* Movement keys are taught on the start card; this line is for the rest. */}
          <p className="hud-hint">
            <kbd>T</kbd> shift era · <kbd>E</kbd> inspect · <kbd>J</kbd> journal · <kbd>Esc</kbd>{' '}
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
            <p className="hud-note">
              A fictional graybox test street. Not a historical reconstruction of any real place.
            </p>
            <p className="hud-note hud-touch">A keyboard and mouse are needed for now.</p>
          </div>
        </div>
      )}
    </div>
  )
}
