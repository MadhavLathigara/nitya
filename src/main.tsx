import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/newsreader/500.css'
import '@fontsource/newsreader/600.css'
import '@fontsource/newsreader/400-italic.css'
import './styles.css'
import App from './App.tsx'

// iPhone keyboard fix: Safari does not shrink the page when the keyboard opens,
// so bottom sheets end up behind it. We track the *visible* area and size pop-ups to it.
function trackVisibleArea() {
  const vv = window.visualViewport
  const root = document.documentElement
  if (!vv) return
  const update = () => {
    root.style.setProperty('--vv-top', `${vv.offsetTop}px`)
    root.style.setProperty('--vv-h', `${vv.height}px`)
  }
  update()
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
}
trackVisibleArea()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
