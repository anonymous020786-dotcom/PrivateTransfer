<?php
/**
 * Zync profile-photo upload endpoint (shared-hosting / PHP).
 *
 * Deploy to: https://api.zestcommerce.in/api4/upload.php
 *
 * Contract (matches the Zync app's storage.ts Hostinger fallback):
 *   POST multipart/form-data
 *   Header:  Authorization: Bearer <ZYNC_UPLOAD_SECRET>
 *   Fields:  file=<binary>  path=<userId>/<name>.<ext>  (path optional)
 *   Returns: 200 { "ok": true, "url": "https://.../uploads/<path>" }
 *            4xx/5xx { "error": "..." }
 */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
// Server-to-server normally, but allow CORS so a browser can call it too.
// Lock to the app origin (override per deployment as needed).
header('Access-Control-Allow-Origin: https://videodownloaders.cloud');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function fail($code, $msg) {
  http_response_code($code);
  echo json_encode(array('error' => $msg));
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  fail(405, 'Method not allowed');
}

// ── Authenticate via Bearer token ───────────────────────────────────────────
$authHeader = '';
if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
  $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
  $headers = apache_request_headers();
  if (isset($headers['Authorization'])) {
    $authHeader = $headers['Authorization'];
  }
}

$token = '';
if (preg_match('/Bearer\s+(.+)$/i', trim($authHeader), $m)) {
  $token = trim($m[1]);
}
if ($token === '' || !hash_equals(ZYNC_UPLOAD_SECRET, $token)) {
  fail(401, 'Unauthorized');
}

// ── Validate the uploaded file ──────────────────────────────────────────────
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
  fail(400, 'No file uploaded');
}
$file = $_FILES['file'];

if ($file['size'] <= 0 || $file['size'] > ZYNC_MAX_BYTES) {
  fail(413, 'File too large or empty');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!isset($ZYNC_ALLOWED[$mime])) {
  fail(415, 'Unsupported file type');
}
$ext = $ZYNC_ALLOWED[$mime];

// ── Resolve a safe target path ──────────────────────────────────────────────
$rel = isset($_POST['path']) ? (string) $_POST['path'] : '';
$rel = str_replace('\\', '/', $rel);
$rel = str_replace('..', '', $rel);                 // no traversal
$rel = preg_replace('#[^a-zA-Z0-9/_-]#', '', $rel); // safe charset
$rel = ltrim($rel, '/');

$dir = '';
$name = '';
if ($rel !== '') {
  $parts = explode('/', $rel);
  $name = array_pop($parts);
  $dir = implode('/', array_filter($parts));
  // force our validated extension
  $name = pathinfo($name, PATHINFO_FILENAME);
}
if ($name === '') {
  $name = bin2hex(random_bytes(16));
}
$name .= '.' . $ext;

$targetDir = rtrim(ZYNC_UPLOAD_DIR, '/');
if ($dir !== '') {
  $targetDir .= '/' . $dir;
}
if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
  fail(500, 'Could not create upload directory');
}

$targetPath = $targetDir . '/' . $name;
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
  fail(500, 'Failed to store file');
}
@chmod($targetPath, 0644);

$publicRel = ($dir !== '' ? $dir . '/' : '') . $name;
$url = rtrim(ZYNC_PUBLIC_BASE, '/') . '/' . $publicRel;

echo json_encode(array('ok' => true, 'url' => $url));
