'use client'

import * as React from 'react'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import FolderIcon from '@mui/icons-material/Folder'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

type Board = {
  id: string
  name: string
  description: string
  color: string | null
  slugs: string[]
  createdAt: string
}

export default function BoardsManager(): React.ReactElement {
  const [boards, setBoards] = React.useState<Board[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [snack, setSnack] = React.useState('')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newDesc, setNewDesc] = React.useState('')
  const [newColor, setNewColor] = React.useState('#4f46e5')
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/boards')
      if (!res.ok) throw new Error('Failed to load boards')
      const data = await res.json()
      setBoards(data.boards ?? [])
    } catch {
      setError('Could not load boards.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const createBoard = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          color: newColor,
        }),
      })
      if (!res.ok) throw new Error()
      setSnack('Board created')
      setCreateOpen(false)
      setNewName('')
      setNewDesc('')
      setNewColor('#4f46e5')
      await load()
    } catch {
      setSnack('Failed to create board')
    } finally {
      setSaving(false)
    }
  }

  const deleteBoard = async (id: string) => {
    if (!confirm('Delete this board? Transfers will not be deleted.')) return
    try {
      const res = await fetch(`/api/boards/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSnack('Board deleted')
      await load()
    } catch {
      setSnack('Failed to delete board')
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Stack spacing={3}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Boards
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New board
          </Button>
        </Stack>

        <Typography color="text.secondary">
          Organise your transfers into named collections. Add transfers to
          boards from the transfer detail page.
        </Typography>

        {loading && <CircularProgress size={28} />}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && boards.length === 0 && (
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FolderIcon
                sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}
              />
              <Typography color="text.secondary">
                No boards yet. Create one to organise your transfers.
              </Typography>
            </CardContent>
          </Card>
        )}

        {boards.map((board) => (
          <Card key={board.id} variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'flex-start' }}
              >
                <FolderIcon
                  sx={{
                    color: board.color ?? 'primary.main',
                    mt: 0.25,
                    flexShrink: 0,
                  }}
                />
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {board.name}
                  </Typography>
                  {board.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {board.description}
                    </Typography>
                  )}
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    <Chip
                      label={`${board.slugs.length} transfer${board.slugs.length !== 1 ? 's' : ''}`}
                      size="small"
                    />
                    {board.slugs.slice(0, 4).map((slug) => (
                      <Chip
                        key={slug}
                        component="a"
                        href={`/transfer/${slug}`}
                        label={slug}
                        size="small"
                        variant="outlined"
                        icon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                        clickable
                        sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                      />
                    ))}
                    {board.slugs.length > 4 && (
                      <Chip
                        label={`+${board.slugs.length - 4} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Stack>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => deleteBoard(board.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Create board dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New board</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              fullWidth
              multiline
              rows={2}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Colour
              </Typography>
              <Box
                component="input"
                type="color"
                aria-label="Board colour"
                title="Board colour"
                value={newColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewColor(e.target.value)
                }
                sx={{
                  width: 36,
                  height: 28,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 1,
                  p: 0,
                }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createBoard}
            disabled={saving || !newName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Container>
  )
}
