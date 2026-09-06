import React, { JSX } from 'react'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import CloseIcon from '@mui/icons-material/Close'
import TypeBadge from './TypeBadge'

type UploadedFileLike = {
  fileName?: string
  type: string
}

export default function UploadFileList({
  files,
  onRemove,
}: {
  files: UploadedFileLike[]
  onRemove?: (index: number) => void
}): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ width: '100%', overflow: 'hidden' }}>
      <List disablePadding>
        {files.map((f, i) => (
          <ListItem
            key={f.fileName ?? i}
            divider={i < files.length - 1}
            secondaryAction={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TypeBadge type={f.type} />
                {onRemove && (
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label="Remove file"
                    onClick={() => onRemove(i)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            }
          >
            <ListItemText
              primary={f.fileName}
              slotProps={{
                primary: {
                  noWrap: true,
                  sx: { fontWeight: 500, fontSize: 14, pr: 2 },
                },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}
