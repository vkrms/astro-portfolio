import { useEffect, useState } from 'react'

/**
 * Tracks the `.dark` class on <html>. The theme switch lives in the shell
 * island, so page islands follow the class instead of a shared context.
 */
export function useDarkMode() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const update = () => setDark(root.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return dark
}
