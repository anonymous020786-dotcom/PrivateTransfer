'use client'

import { JSX } from 'react'
import { useWebRTCPeer } from './WebRTCProvider'
import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import CancelButton from './CancelButton'

const TERMS: Array<{ icon: string; text: string }> = [
  { icon: '✅', text: 'Only upload files you have the right to share' },
  { icon: '🔒', text: 'Share download links only with known recipients' },
  { icon: '⚠️', text: 'No illegal or harmful content allowed' },
]

export default function ReportTermsViolationButton({
  uploaderPeerID,
  slug,
}: {
  uploaderPeerID: string
  slug: string
}): JSX.Element {
  const { peer } = useWebRTCPeer()
  const [showModal, setShowModal] = useState(false)
  const [isReporting, setIsReporting] = useState(false)

  const reportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/destroy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, reason: 'reported' }),
      })
      if (!response.ok) {
        throw new Error('Failed to report violation')
      }
      return response.json()
    },
  })

  const handleReport = useCallback(() => {
    try {
      setIsReporting(true)
      reportMutation.mutate()

      const conn = peer.connect(uploaderPeerID, {
        metadata: { type: 'report' },
      })

      const timeout = setTimeout(() => {
        conn.close()
        window.location.href = '/reported'
      }, 2000)

      conn.on('open', () => {
        clearTimeout(timeout)
        conn.close()
        window.location.href = '/reported'
      })
    } catch (error) {
      console.error('Failed to report violation', error)
      setIsReporting(false)
    }
  }, [peer, uploaderPeerID, reportMutation])

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          onClick={() => setShowModal(true)}
          color="error"
          size="small"
          aria-label="Report terms violation"
        >
          Report suspicious pizza delivery
        </Button>
      </Box>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Found a suspicious delivery?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Before reporting this transfer, please note our terms:
          </DialogContentText>
          <List>
            {TERMS.map((t) => (
              <ListItem
                key={t.text}
                sx={{ bgcolor: 'action.hover', borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{t.icon}</ListItemIcon>
                <ListItemText primary={t.text} />
              </ListItem>
            ))}
          </List>
          <DialogContentText>
            If you&apos;ve spotted a violation of these terms, click Report to
            halt its delivery.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <CancelButton onClick={() => setShowModal(false)} />
          <Button
            disabled={isReporting}
            onClick={handleReport}
            variant="contained"
            color="error"
            aria-label="Confirm report"
          >
            {isReporting ? 'Reporting...' : 'Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
