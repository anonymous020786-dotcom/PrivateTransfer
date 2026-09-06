'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Fade from '@mui/material/Fade'

const SLIDES = [
  {
    emoji: '🔒',
    title: 'Private by design',
    body: 'WebRTC DTLS encrypts every transfer end-to-end. Nothing is stored on a server.',
  },
  {
    emoji: '∞',
    title: 'No limits, ever',
    body: 'Send files of any size with no upload or download caps — backpressured streaming keeps memory flat.',
  },
  {
    emoji: '⚡',
    title: 'Direct & fast',
    body: 'Peer-to-peer means no upload-then-download round trip. Transfers move at your network speed.',
  },
  {
    emoji: '📡',
    title: 'Live presence',
    body: 'See who is online, viewing, and downloading in real time over Server-Sent Events.',
  },
  {
    emoji: '🔁',
    title: 'Resumable',
    body: 'A dropped connection resumes from the last byte instead of starting over.',
  },
]

export default function FeatureSlider(): React.ReactElement {
  const [i, setI] = React.useState(0)
  const [show, setShow] = React.useState(true)

  React.useEffect(() => {
    const id = setInterval(() => {
      setShow(false)
      setTimeout(() => {
        setI((p) => (p + 1) % SLIDES.length)
        setShow(true)
      }, 250)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const slide = SLIDES[i]

  return (
    <Card
      variant="outlined"
      sx={{ maxWidth: 560, mx: 'auto', overflow: 'hidden' }}
    >
      <CardContent
        sx={{ minHeight: 150, display: 'flex', alignItems: 'center' }}
      >
        <Fade in={show} timeout={250}>
          <Stack
            direction="row"
            spacing={2.5}
            sx={{ alignItems: 'center', width: '100%' }}
          >
            <Box sx={{ fontSize: 48, lineHeight: 1 }}>{slide.emoji}</Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {slide.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {slide.body}
              </Typography>
            </Box>
          </Stack>
        </Fade>
      </CardContent>
      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: 'center', pb: 2 }}
      >
        {SLIDES.map((_, idx) => (
          <Box
            key={idx}
            onClick={() => {
              setI(idx)
            }}
            sx={{
              width: idx === i ? 22 : 8,
              height: 8,
              borderRadius: 4,
              bgcolor: idx === i ? 'primary.main' : 'action.disabled',
              cursor: 'pointer',
              transition: 'all .3s',
            }}
          />
        ))}
      </Stack>
    </Card>
  )
}
