'use client'

import * as React from 'react'
import Zoom from '@mui/material/Zoom'
import Fab from '@mui/material/Fab'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

export default function BackToTop(): React.ReactElement | null {
  const [mounted, setMounted] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)
  const [atBottom, setAtBottom] = React.useState(false)
  const [hasScroll, setHasScroll] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop
      const vh = window.innerHeight
      const full = document.documentElement.scrollHeight
      setHasScroll(full > vh * 1.2)
      setScrolled(y > 200)
      setAtBottom(y + vh >= full - 80)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  if (!mounted || !hasScroll) return null

  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const goBottom = () =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    })

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 88,
        alignItems: 'center',
        zIndex: (t) => t.zIndex.tooltip + 1,
      }}
    >
      <Zoom in={scrolled}>
        <Tooltip title="Back to top" placement="left">
          <Fab
            size="small"
            color="primary"
            aria-label="Scroll to top"
            onClick={goTop}
            sx={{ boxShadow: 3 }}
          >
            <KeyboardArrowUpIcon />
          </Fab>
        </Tooltip>
      </Zoom>
      <Zoom in={!atBottom}>
        <Tooltip title="Scroll to bottom" placement="left">
          <Fab
            size="small"
            color="default"
            aria-label="Scroll to bottom"
            onClick={goBottom}
            sx={{ boxShadow: 3 }}
          >
            <KeyboardArrowDownIcon />
          </Fab>
        </Tooltip>
      </Zoom>
    </Stack>
  )
}
