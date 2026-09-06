'use client'

import * as React from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import { useColorScheme } from '@mui/material/styles'

export function ModeToggle(): React.ReactElement | null {
  const { mode, systemMode, setMode } = useColorScheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const resolved = mode === 'system' ? systemMode : mode
  const isDark = resolved === 'dark'

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        aria-label="Toggle color mode"
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        size="small"
      >
        {isDark ? (
          <LightModeIcon fontSize="small" />
        ) : (
          <DarkModeIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  )
}

export default ModeToggle
