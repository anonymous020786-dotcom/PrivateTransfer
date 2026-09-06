'use client'

import * as React from 'react'
import Typography from '@mui/material/Typography'
import { TOOL_COMPONENTS } from './ToolComponents'

export default function ToolHost({
  slug,
}: {
  slug: string
}): React.ReactElement {
  const Component = TOOL_COMPONENTS[slug]
  if (!Component)
    return <Typography color="text.secondary">Tool not found.</Typography>
  return <Component />
}
