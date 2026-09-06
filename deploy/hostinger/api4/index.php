<?php
// Health check — confirms the endpoint is reachable without revealing anything.
header('Content-Type: application/json; charset=utf-8');
echo json_encode(array('service' => 'zync-upload', 'status' => 'ok'));
