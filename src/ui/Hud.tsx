import { useEffect } from 'react'
import { describeAudio } from '../audio/settings'
import { claimsOf } from '../content/evidence'
import { BASIS_MEANING, SITE_KIND, SITE_NOTE } from '../content/provenance'
import { eraLabel, SITE_OF, WORLDS } from '../era/eras'
import { isShortcut } from '../keys'
import { useGameStore } from '../state/gameStore'
import { FocusPrompt } from './FocusPrompt'
import { InspectionPanel } from './InspectionPanel'
import { Journal } from './Journal'
import { ShiftVeil } from './ShiftVeil'
import './hud.css'

const CONTROLS = [
  { keys: ['W', 'A', 'S', 'D'], action: 'Move' },
  { keys: ['Mouse'], action: 'Look around' },
  { keys: ['Shift'], action: 'Run' },
  { keys: ['T'], action: 'Shift era' },
  { keys: ['E'], action: 'Inspect what you are looking at' },
  { keys: ['J'], action: 'Open or close the journal' },
  { keys: ['G'], action: 'Go to the next site' },
  { keys: ['V'], action: 'Show what each thing rests on' },
  { keys: ['M'], action: 'Sound on or off' },
  { keys: ['[', ']'], action: 'Quieter or louder' },
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

/**
 * The key to the evidence view: what the three colours mean, and how many
 * things in this era are of each kind. The colours are named in words, so
 * nothing depends on telling them apart by eye.
 */
function EvidenceLegend() {
  const era = useGameStore((state) => state.era)
  const claims = claimsOf(WORLDS[era])
  // A building shown by a model is in parts, and the parts differ. Name them.
  const parts = claims.filter((claim) => claim.label !== undefined)

  return (
    <section className="hud-panel hud-evidence" aria-label="Evidence view" data-testid="evidence">
      <header>
        <h2>Evidence view</h2>
        <span className="hud-panel-close">
          <kbd>V</kbd> close
        </span>
      </header>
      <ul>
        {BASIS_MEANING.map(({ basis, name, meaning }) => (
          <li key={basis} data-testid={`evidence-${basis}`}>
            <i className={`hud-swatch hud-swatch-${basis}`} />
            <span>
              <strong>{name}</strong> ({claims.filter((claim) => claim.evidence?.basis === basis).length}):{' '}
              {meaning}
            </span>
          </li>
        ))}
      </ul>
      {parts.length > 0 && (
        <>
          <h3>The building, part by part</h3>
          <ul data-testid="evidence-parts">
            {parts.map((part) => (
              <li key={part.id}>
                <i className={`hud-swatch hud-swatch-${part.evidence?.basis ?? 'unmarked'}`} />
                <span>{part.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/**
 * Sound controls on the start card. The one part of the HUD that takes the
 * mouse: a click here changes a setting and does not start the game.
 */
function SoundControls() {
  const audio = useGameStore((state) => state.audio)
  const toggleMute = useGameStore((state) => state.toggleMute)
  const changeVolume = useGameStore((state) => state.changeVolume)

  return (
    <div className="hud-sound" data-testid="sound">
      <button type="button" onClick={toggleMute} aria-pressed={!audio.muted} data-testid="sound-mute">
        {audio.muted ? 'Sound off' : 'Sound on'}
      </button>
      <label>
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={Math.round(audio.volume * 10)}
          onChange={(event) => changeVolume(Number(event.target.value) - Math.round(audio.volume * 10))}
          data-testid="sound-volume"
        />
      </label>
      <p>An artistic soundscape made in code. Not a recording of any place.</p>
    </div>
  )
}

/** DOM overlay above the canvas. Takes no pointer events, so clicks reach the game, except the sound controls. */
export function Hud() {
  const engaged = useGameStore((state) => state.engaged)
  const era = useGameStore((state) => state.era)
  const notice = useGameStore((state) => state.notice)
  const focused = useGameStore((state) => state.focus !== null)
  const perfVisible = useGameStore((state) => state.perfVisible)
  const togglePerf = useGameStore((state) => state.togglePerf)
  const evidenceView = useGameStore((state) => state.evidenceView)
  const site = SITE_OF[era]
  const documented = site.provenance === 'documented'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isShortcut(event)) return
      if (event.code === 'KeyP') togglePerf()
      // Sound settings work whether or not the player has control.
      if (event.code === 'KeyM' || event.code === 'BracketLeft' || event.code === 'BracketRight') {
        const state = useGameStore.getState()
        if (event.code === 'KeyM') state.toggleMute()
        else state.changeVolume(event.code === 'BracketRight' ? 1 : -1)
        state.showNotice(describeAudio(useGameStore.getState().audio))
      }
      if (event.code === 'KeyV') {
        // A gameplay key: it does nothing unless the player has control.
        const state = useGameStore.getState()
        if (!state.engaged) return
        if (SITE_OF[state.era].provenance === 'documented') state.toggleEvidenceView()
        else state.showNotice('Nothing to show here: this street is fictional and rests on no evidence.')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePerf])

  return (
    <div className="hud">
      {/* First, so that everything else in the HUD is drawn over it. */}
      <ShiftVeil />
      {perfVisible && <PerfPanel />}

      <div className="hud-era">
        <span>Era</span>
        <strong data-testid="era">{eraLabel(era)}</strong>
      </div>
      <p className="hud-site" data-testid="site">
        {site.name} <span>{SITE_KIND[site.provenance]}</span>
      </p>
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
          {documented && evidenceView && <EvidenceLegend />}
          {/* Movement keys are taught on the start card; this line is for the rest. */}
          <p className="hud-hint">
            <kbd>T</kbd> shift era · <kbd>E</kbd> inspect · <kbd>J</kbd> journal · <kbd>G</kbd> next site
            {documented && (
              <>
                {' '}
                · <kbd>V</kbd> evidence
              </>
            )}{' '}
            · <kbd>Esc</kbd> release
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
            <p className="hud-note" data-testid="site-note">
              {SITE_NOTE[site.provenance]}
            </p>
            <SoundControls />
            <p className="hud-note hud-touch">A keyboard and mouse are needed for now.</p>
          </div>
        </div>
      )}
    </div>
  )
}
