'use client'

import * as React from 'react'

export function BackgroundSetter({ background }: { background: string }): null {
  React.useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = background
    document.body.style.minHeight = '100vh'
    return () => {
      document.body.style.background = prev
    }
  }, [background])
  return null
}
