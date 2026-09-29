'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import CircularProgress from '@mui/material/CircularProgress'
import DeleteIcon from '@mui/icons-material/Delete'
import LogoutIcon from '@mui/icons-material/Logout'

type Row = {
  id: string
  email: string
  name: string
  createdAt: string
  lastSignInAt: string | null
  mfa: boolean
  admin: boolean
  transfers: number
  storageBytes: number
}

function bytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`
  return `${n} B`
}

export default function UsersManager(): React.ReactElement {
  const [rows, setRows] = React.useState<Row[] | null>(null)
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)

  const load = React.useCallback(async (query: string, p: number) => {
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(query)}&page=${p}`,
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load users.')
      setRows(json.users)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  React.useEffect(() => {
    const t = setTimeout(() => void load(q, page), 250)
    return () => clearTimeout(t)
  }, [q, page, load])

  const act = async (row: Row, action: 'delete' | 'signout') => {
    const prompt =
      action === 'delete'
        ? `Permanently delete ${row.email}, their ${row.transfers} transfer(s) and all stored files?`
        : `Sign ${row.email} out of every device?`
    if (!confirm(prompt)) return
    setBusy(row.id)
    setInfo(null)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/users/${row.id}${action === 'signout' ? '?action=signout' : ''}`,
        { method: action === 'delete' ? 'DELETE' : 'POST' },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed.')
      setInfo(
        action === 'delete'
          ? `Deleted ${row.email}.`
          : `Signed ${row.email} out everywhere.`,
      )
      if (action === 'delete')
        setRows((prev) => prev?.filter((r) => r.id !== row.id) ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, mb: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, flex: 1 }}>
          Users
        </Typography>
        <TextField
          size="small"
          placeholder="Search email or name"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
        />
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {info}
        </Alert>
      )}
      {!rows && !error && <CircularProgress size={24} />}
      {rows && (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Last sign-in</TableCell>
                <TableCell align="right">Transfers</TableCell>
                <TableCell align="right">Storage</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>No users found.</TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {r.email}
                        </Typography>
                        {r.name && (
                          <Typography variant="caption" color="text.secondary">
                            {r.name}
                          </Typography>
                        )}
                      </Box>
                      {r.admin && (
                        <Chip size="small" color="primary" label="admin" />
                      )}
                      {r.mfa && (
                        <Chip
                          size="small"
                          color="success"
                          variant="outlined"
                          label="2FA"
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {r.lastSignInAt
                      ? new Date(r.lastSignInAt).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell align="right">{r.transfers}</TableCell>
                  <TableCell align="right">{bytes(r.storageBytes)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Sign out everywhere">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busy === r.id}
                          onClick={() => act(r, 'signout')}
                        >
                          <LogoutIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip
                      title={
                        r.admin
                          ? 'Admins cannot be deleted here'
                          : 'Delete user and data'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={busy === r.id || r.admin}
                          onClick={() => act(r, 'delete')}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!q && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1, justifyContent: 'flex-end' }}
            >
              <Button
                size="small"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="small"
                disabled={rows.length < 50}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </Stack>
          )}
        </Box>
      )}
    </Box>
  )
}
