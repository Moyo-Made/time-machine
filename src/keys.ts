/** True when a key press belongs to the browser or OS (Cmd+S, Ctrl+R), not to the game. */
export const isShortcut = (event: KeyboardEvent) => event.metaKey || event.ctrlKey || event.altKey
