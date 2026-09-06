import { JSX } from 'react'
import Stack from '@mui/material/Stack'
import { notFound } from 'next/navigation'
import { getOrCreateChannelRepo } from '../../../channel'
import TransferSpinner from '../../../components/TransferSpinner'
import Downloader from '../../../components/Downloader'
import WebRTCPeerProvider from '../../../components/WebRTCProvider'
import ReportTermsViolationButton from '../../../components/ReportTermsViolationButton'
import ChannelPresenceBadge from '../../../components/ChannelPresenceBadge'

const normalizeSlug = (rawSlug: string | string[]): string => {
  if (typeof rawSlug === 'string') {
    return rawSlug
  } else {
    return rawSlug.join('/')
  }
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<JSX.Element> {
  const { slug: slugRaw } = await params
  const slug = normalizeSlug(slugRaw)
  const channel = await getOrCreateChannelRepo().fetchChannel(slug)

  if (!channel) {
    notFound()
  }

  return (
    <Stack
      spacing={2.5}
      sx={{
        alignItems: 'center',
        py: 5,
        px: 2,
        maxWidth: 672,
        mx: 'auto',
        width: '100%',
      }}
    >
      <TransferSpinner direction="down" />
      <ChannelPresenceBadge slug={channel.shortSlug} />
      <WebRTCPeerProvider>
        <Downloader
          uploaderPeerID={channel.uploaderPeerID}
          slug={channel.shortSlug}
          note={channel.note}
        />
        <ReportTermsViolationButton
          uploaderPeerID={channel.uploaderPeerID}
          slug={slug}
        />
      </WebRTCPeerProvider>
    </Stack>
  )
}
