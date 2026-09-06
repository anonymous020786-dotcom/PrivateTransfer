#!/usr/bin/env node
const express = require('express')
const { ExpressPeerServer } = require('peer')

// Bind to the platform-provided port (Render/Railway/Fly set $PORT), else 9000.
const PORT = process.env.PORT || 9000

const app = express()
const server = app.listen(PORT, () => {
  console.log(`[peerjs] listening on :${PORT} at /peerjs/filepizza`)
})
const peerServer = ExpressPeerServer(server, {
  path: '/filepizza',
})

app.get('/', (_req, res) => res.send('Zync PeerJS server'))
app.use('/peerjs', peerServer)
