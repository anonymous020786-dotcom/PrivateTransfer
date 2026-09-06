import React, { JSX, useCallback } from 'react'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

const PASSWORD_TOOLTIP =
  "The downloader must provide this password to start downloading the file. If you don't specify a password here, any downloader with the link to the file will be able to download it. It is not used to encrypt the file, as this is performed by WebRTC's DTLS already."

export default function PasswordField({
  value,
  onChange,
  isRequired = false,
  isInvalid = false,
}: {
  value: string
  onChange: (v: string) => void
  isRequired?: boolean
  isInvalid?: boolean
}): JSX.Element {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <TextField
      autoFocus
      type="password"
      fullWidth
      size="small"
      value={value}
      onChange={handleChange}
      error={isInvalid}
      required={isRequired}
      label={isRequired ? 'Password' : 'Password (optional)'}
      placeholder="Enter a secret password for this transfer..."
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={PASSWORD_TOOLTIP}>
                <IconButton edge="end" size="small" tabIndex={-1}>
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
