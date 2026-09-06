'use client'

import * as React from 'react'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import EmailIcon from '@mui/icons-material/Email'
import FolderIcon from '@mui/icons-material/Folder'
import AddIcon from '@mui/icons-material/Add'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import TextField from '@mui/material/TextField'

type Board = { id: string; name: string; slugs: string[] }

export default function OwnerActions({
  slug,
  recipientCount,
}: {
  slug: string
  recipientCount: number
}): React.ReactElement {
  const [snack, setSnack] = React.useState('')
  const [resending, setResending] = React.useState(false)
  const [renewDialogOpen, setRenewDialogOpen] = React.useState(false)
  const [renewDays, setRenewDays] = React.useState(30)
  const [renewing, setRenewing] = React.useState(false)
  const [boardDialogOpen, setBoardDialogOpen] = React.useState(false)
  const [boards, setBoards] = React.useState<Board[]>([])
  const [boardsLoading, setBoardsLoading] = React.useState(false)
  const [selectedBoard, setSelectedBoard] = React.useState('')
  const [addingToBoard, setAddingToBoard] = React.useState(false)

  const resendEmails = async () => {
    setResending(true)
    try {
      const res = await fetch(`/api/transfer/${slug}/resend`, {
        method: 'POST',
      })
      const json = await res.json()
      if (res.ok) {
        setSnack(
          `Emails resent to ${json.sent} recipient${json.sent !== 1 ? 's' : ''}.`,
        )
      } else {
        setSnack(json.error ?? 'Failed to resend emails.')
      }
    } catch {
      setSnack('Network error.')
    } finally {
      setResending(false)
    }
  }

  const renewTransfer = async () => {
    setRenewing(true)
    try {
      const res = await fetch(`/api/transfer/${slug}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addDays: renewDays }),
      })
      const json = await res.json()
      if (res.ok) {
        setSnack(
          `Transfer extended. New expiry: ${new Date(json.expiresAt).toLocaleDateString()}`,
        )
        setRenewDialogOpen(false)
      } else {
        setSnack(json.error ?? 'Failed to renew.')
      }
    } catch {
      setSnack('Network error.')
    } finally {
      setRenewing(false)
    }
  }

  const openBoardDialog = async () => {
    setBoardDialogOpen(true)
    setBoardsLoading(true)
    try {
      const res = await fetch('/api/boards')
      const json = await res.json()
      setBoards(json.boards ?? [])
    } catch {
      setBoards([])
    } finally {
      setBoardsLoading(false)
    }
  }

  const addToBoard = async () => {
    if (!selectedBoard) return
    setAddingToBoard(true)
    try {
      const res = await fetch(`/api/boards/${selectedBoard}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addSlug: slug }),
      })
      if (res.ok) {
        setSnack('Added to board.')
        setBoardDialogOpen(false)
        setSelectedBoard('')
      } else {
        const json = await res.json()
        setSnack(json.error ?? 'Failed to add to board.')
      }
    } catch {
      setSnack('Network error.')
    } finally {
      setAddingToBoard(false)
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', pt: 0.5 }}>
        {recipientCount > 0 && (
          <Chip
            icon={
              resending ? (
                <CircularProgress size={12} color="inherit" />
              ) : (
                <EmailIcon />
              )
            }
            label="Resend emails"
            size="small"
            variant="outlined"
            onClick={resendEmails}
            disabled={resending}
            clickable
          />
        )}
        <Chip
          icon={<AutorenewIcon />}
          label="Renew"
          size="small"
          variant="outlined"
          onClick={() => setRenewDialogOpen(true)}
          clickable
        />
        <Chip
          icon={<AddIcon />}
          label="Add to board"
          size="small"
          variant="outlined"
          onClick={openBoardDialog}
          clickable
        />
      </Stack>

      {/* Renew dialog */}
      <Dialog
        open={renewDialogOpen}
        onClose={() => setRenewDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Renew transfer</DialogTitle>
        <DialogContent>
          <TextField
            label="Extend by (days)"
            type="number"
            value={renewDays}
            onChange={(e) =>
              setRenewDays(Math.max(1, Math.min(365, Number(e.target.value))))
            }
            size="small"
            fullWidth
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { min: 1, max: 365 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={renewTransfer}
            disabled={renewing}
          >
            {renewing ? 'Renewing…' : 'Renew'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Board picker dialog */}
      <Dialog
        open={boardDialogOpen}
        onClose={() => setBoardDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add to board</DialogTitle>
        <DialogContent>
          {boardsLoading ? (
            <CircularProgress size={24} sx={{ mt: 1 }} />
          ) : boards.length === 0 ? (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <FolderIcon sx={{ color: 'text.disabled', fontSize: 40 }} />
              <Button variant="text" href="/boards" size="small">
                Create a board first →
              </Button>
            </Stack>
          ) : (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Board</InputLabel>
              <Select
                label="Board"
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value)}
              >
                {boards.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                    {b.slugs.includes(slug) ? ' (already added)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoardDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={addToBoard}
            disabled={!selectedBoard || addingToBoard || boardsLoading}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack('')}
        message={snack}
      />
    </>
  )
}
