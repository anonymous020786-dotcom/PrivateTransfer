<?php
/**
 * Zync upload endpoint configuration.
 *
 * IMPORTANT: ZYNC_UPLOAD_SECRET must EXACTLY match the HOSTINGER_API_TOKEN
 * value in your Zync app's .env.local. This is the shared secret that
 * authorizes uploads. Keep it private â€” never commit it to a public repo and
 * regenerate it if it is ever exposed.
 */

// â”€â”€ Shared secret (both sides must match) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
define('ZYNC_UPLOAD_SECRET', 'PASTE_YOUR_64_CHAR_UPLOAD_TOKEN_HERE');

// â”€â”€ Where uploaded files are written on disk (auto-created) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
define('ZYNC_UPLOAD_DIR', __DIR__ . '/uploads');

// â”€â”€ Public URL that serves ZYNC_UPLOAD_DIR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// e.g. https://api.zestcommerce.in/api4/uploads/<userId>/<file>
define('ZYNC_PUBLIC_BASE', 'https://api.zestcommerce.in/api4/uploads');

// â”€â”€ Maximum upload size in bytes (default 5 MB for avatars) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
define('ZYNC_MAX_BYTES', 5 * 1024 * 1024);

// â”€â”€ Allowed image types â†’ file extension â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
$ZYNC_ALLOWED = array(
  'image/jpeg' => 'jpg',
  'image/png'  => 'png',
  'image/webp' => 'webp',
  'image/gif'  => 'gif',
);
