import React, { JSX } from 'react'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import useClipboard from '../hooks/useClipboard'

export function CopyableInput({
  label,
  value,
}: {
  label: string
  value: string
}): JSX.Element {
  const { hasCopied, onCopy } = useClipboard(value)

  return (
    <TextField
      id={`copyable-input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      label={label}
      value={value}
      size="small"
      fullWidth
      slotProps={{
        input: {
          readOnly: true,
          sx: { fontSize: 12, pr: 0.5 },
          endAdornment: (
            <InputAdornment position="end">
              <Button
                onClick={onCopy}
                size="small"
                color={hasCopied ? 'success' : 'primary'}
                startIcon={
                  hasCopied ? (
                    <CheckIcon fontSize="small" />
                  ) : (
                    <ContentCopyIcon fontSize="small" />
                  )
                }
              >
                {hasCopied ? 'Copied' : 'Copy'}
              </Button>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
