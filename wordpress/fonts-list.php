<?php
/**
 * Upload this file INSIDE the fonts folder itself, as:
 *   https://sayid.ir/fonts/list.php
 *
 * It scans its own folder for .woff2 / .ttf files and returns a JSON list
 * grouping same-name files together, e.g.:
 *   [{"name":"Vazirmatn","woff2":"Vazirmatn.woff2","ttf":"Vazirmatn.ttf"}, ...]
 *
 * The page at /online-story-font/ fetches this endpoint on load to build
 * its font list and @font-face rules. No database, no WordPress bootstrap —
 * just plain file listing, so it works even if directory browsing
 * (autoindex) is disabled on the server.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=3600');
header('X-Content-Type-Options: nosniff');

$dir = __DIR__;
$allowedExtensions = ['woff2', 'ttf'];
$families = [];

$entries = @scandir($dir);
if ($entries === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not read fonts directory']);
    exit;
}

foreach ($entries as $file) {
    if ($file === '.' || $file === '..') continue;
    if ($file === basename(__FILE__)) continue;

    $path = $dir . '/' . $file;
    if (!is_file($path)) continue;

    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExtensions, true)) continue;

    $name = pathinfo($file, PATHINFO_FILENAME);
    if ($name === '') continue;

    if (!isset($families[$name])) {
        $families[$name] = ['name' => $name];
    }
    $families[$name][$ext] = rawurlencode($file);
}

ksort($families, SORT_NATURAL | SORT_FLAG_CASE);

echo json_encode(array_values($families), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
