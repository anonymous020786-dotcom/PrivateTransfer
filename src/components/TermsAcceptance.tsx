'use client'

import { JSX, useState } from 'react'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import CancelButton from './CancelButton'

const TERMS: Array<{ icon: string; text: string }> = [
  {
    icon: '📤',
    text: 'Files are shared directly between browsers — no server storage',
  },
  { icon: '✅', text: 'Only upload files you have the right to share' },
  { icon: '🔒', text: 'Share download links only with known recipients' },
  { icon: '⚠️', text: 'No illegal or harmful content allowed' },
]

export default function TermsAcceptance(): JSX.Element {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          By selecting a file, you agree to{' '}
          <Link
            component="button"
            onClick={() => setShowModal(true)}
            underline="hover"
            color="inherit"
            aria-label="View upload terms"
          >
            our terms
          </Link>
          .
        </Typography>
      </Box>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Zync Terms</DialogTitle>
        <DialogContent>
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
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            By uploading a file, you confirm that you understand and agree to
            these terms.
          </Typography>
        </DialogContent>
        <DialogActions>
          <CancelButton text="Got it!" onClick={() => setShowModal(false)} />
        </DialogActions>
      </Dialog>
    </>
  )
}
