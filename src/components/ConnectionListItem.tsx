import React, { JSX } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { UploaderConnection, UploaderConnectionStatus } from '../types'
import ProgressBar from './ProgressBar'

type ChipColor =
  | 'default'
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

function getStatusColor(status: UploaderConnectionStatus): ChipColor {
  switch (status) {
    case UploaderConnectionStatus.Uploading:
      return 'info'
    case UploaderConnectionStatus.Paused:
      return 'warning'
    case UploaderConnectionStatus.Done:
      return 'success'
    case UploaderConnectionStatus.Closed:
    case UploaderConnectionStatus.InvalidPassword:
      return 'error'
    default:
      return 'default'
  }
}

export function ConnectionListItem({
  conn,
}: {
  conn: UploaderConnection
}): JSX.Element {
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {conn.browserName && conn.browserVersion ? (
              <>
                {conn.browserName}{' '}
                <Typography component="span" color="text.secondary">
                  v{conn.browserVersion}
                </Typography>
              </>
            ) : (
              'Downloader'
            )}
          </Typography>
          <Chip
            label={conn.status.replace(/_/g, ' ')}
            color={getStatusColor(conn.status)}
            size="small"
            sx={{ fontSize: 10, height: 20, fontWeight: 600 }}
          />
        </Stack>

        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block' }}
          >
            Completed: {conn.completedFiles} / {conn.totalFiles} files
          </Typography>
          {conn.uploadingFileName &&
            conn.status === UploaderConnectionStatus.Uploading && (
              <Typography variant="caption" color="text.secondary">
                Current file: {Math.round(conn.currentFileProgress * 100)}%
              </Typography>
            )}
        </Box>
      </Stack>
      <ProgressBar
        value={
          conn.completedFiles === conn.totalFiles
            ? 1
            : (conn.completedFiles + conn.currentFileProgress) / conn.totalFiles
        }
        max={1}
      />
    </Box>
  )
}
