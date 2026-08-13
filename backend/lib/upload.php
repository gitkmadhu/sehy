<?php
/** Saves an uploaded file (from $_FILES[$field]) under uploads/{$subdir}/ and returns its public URL, or null if absent. */
function save_upload(string $field, string $subdir): ?string {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $mime = mime_content_type($_FILES[$field]['tmp_name']);
    if (!isset($allowed[$mime])) {
        json_error('Only JPEG, PNG, or WEBP images are allowed', 422);
    }

    $dir = __DIR__ . "/../uploads/{$subdir}";
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    move_uploaded_file($_FILES[$field]['tmp_name'], "{$dir}/{$filename}");

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    return "{$scheme}://{$host}/gmls_api/uploads/{$subdir}/{$filename}";
}
