'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import { Link as ViewTransitionLink } from 'next-view-transitions'

// Renders post markdown with MUI-styled elements.
export default function Markdown({
  children,
}: {
  children: string
}): React.ReactElement {
  return (
    <Box
      sx={{
        '& p': { lineHeight: 1.8, mb: 2, color: 'text.primary' },
        '& ul, & ol': { mb: 2, pl: 3, lineHeight: 1.8 },
        '& li': { mb: 0.5 },
        '& strong': { fontWeight: 700 },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontWeight: 800, mt: 5, mb: 1.5 }}
            >
              {children}
            </Typography>
          ),
          h3: ({ children }) => (
            <Typography
              variant="h6"
              component="h3"
              sx={{ fontWeight: 700, mt: 3, mb: 1 }}
            >
              {children}
            </Typography>
          ),
          p: ({ children }) => (
            <Typography component="p">{children}</Typography>
          ),
          a: ({ href, children }) => {
            const internal = href?.startsWith('/')
            return internal ? (
              <Link component={ViewTransitionLink} href={href!} color="primary">
                {children}
              </Link>
            ) : (
              <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
              >
                {children}
              </Link>
            )
          },
          hr: () => <Divider sx={{ my: 3 }} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </Box>
  )
}
