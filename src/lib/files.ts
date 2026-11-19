// Saves a file the right way for each device.
// - Computers: normal download.
// - iPhone / iPad (Home Screen app): normal downloads often don't work there, so we open
//   the system menu with the file, where you pick "Save to Files" (or Calendar for .ics).
//   This is only used to save your own backup / export / calendar file.

const isTouch = () => typeof window !== 'undefined' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches

export async function saveFile(name: string, text: string, mime: string): Promise<'saved' | 'cancelled'> {
  const blob = new Blob([text], { type: mime })
  if (isTouch() && typeof navigator.canShare === 'function') {
    const file = new File([blob], name, { type: mime })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return 'saved'
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'cancelled'
        // any other problem: fall back to a normal download below
      }
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'saved'
}
