<?php
// Longest-edge cap (pixels) applied when a caller doesn't pass its own —
// covers hero/cover/banner-style images. Logos pass a smaller value
// explicitly (see call sites). Never upscales a smaller source image.
const UPLOAD_DEFAULT_MAX_DIMENSION = 1600;
const UPLOAD_LOGO_MAX_DIMENSION = 500;
const UPLOAD_GALLERY_MAX_DIMENSION = 900;

// Re-encode settings: JPEG/WebP take a 0-100 quality; PNG takes a 0-9
// compression *effort* level (PNG stays lossless — the size win there
// comes from the resize step, not from this).
const UPLOAD_JPEG_QUALITY = 82;
const UPLOAD_WEBP_QUALITY = 80;
const UPLOAD_PNG_COMPRESSION = 6;

/**
 * Saves an uploaded file (from $_FILES[$field]) under uploads/{$subdir}/,
 * resizing it so neither dimension exceeds $maxDimension and re-encoding
 * it at a fixed quality (see compress_and_save_image()), and returns its
 * public URL, or null if absent.
 */
function save_upload(string $field, string $subdir, int $maxDimension = UPLOAD_DEFAULT_MAX_DIMENSION): ?string {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $tmpPath = $_FILES[$field]['tmp_name'];
    $mime = mime_content_type($tmpPath);
    if (!isset($allowed[$mime])) {
        json_error('Only JPEG, PNG, or WEBP images are allowed', 422);
    }

    $dir = __DIR__ . "/../uploads/{$subdir}";
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        record_incident('upload_failed', 'critical', ['subdir' => $subdir, 'reason' => 'could not create upload directory'], dedupeKey: "dir:{$subdir}");
        json_error("Server could not create the upload directory for '{$subdir}'. Check file permissions.", 500);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    $destPath = "{$dir}/{$filename}";

    if (!compress_and_save_image($tmpPath, $destPath, $mime, $maxDimension)) {
        record_incident('upload_failed', 'critical', ['subdir' => $subdir, 'reason' => 'image processing failed'], dedupeKey: "process:{$subdir}");
        json_error('Server could not process the uploaded image.', 500);
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    return "{$scheme}://{$host}/gmls_api/uploads/{$subdir}/{$filename}";
}

const UPLOAD_DOCUMENT_MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * Sibling to save_upload() for proof documents (e.g. a mall-store
 * allocation letter) that may be a scanned image OR a PDF — save_upload()
 * can't take a PDF since it always routes through compress_and_save_image()
 * (GD has no PDF support). Images still get resized/re-encoded the same
 * way; a PDF is stored as-is (size-capped, since there's no compression
 * step to shrink it). Returns its public URL, or null if absent.
 */
function save_document_upload(string $field, string $subdir): ?string {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $tmpPath = $_FILES[$field]['tmp_name'];
    $mime = mime_content_type($tmpPath);

    $dir = __DIR__ . "/../uploads/{$subdir}";
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        record_incident('upload_failed', 'critical', ['subdir' => $subdir, 'reason' => 'could not create upload directory'], dedupeKey: "dir:{$subdir}");
        json_error("Server could not create the upload directory for '{$subdir}'. Check file permissions.", 500);
    }

    $allowedImages = ['image/jpeg' => 'jpg', 'image/png' => 'png'];

    if ($mime === 'application/pdf') {
        if ($_FILES[$field]['size'] > UPLOAD_DOCUMENT_MAX_PDF_BYTES) {
            json_error('PDF must be under 10MB', 422);
        }
        $filename = bin2hex(random_bytes(16)) . '.pdf';
        if (!move_uploaded_file($tmpPath, "{$dir}/{$filename}")) {
            record_incident('upload_failed', 'critical', ['subdir' => $subdir, 'reason' => 'pdf move failed'], dedupeKey: "process:{$subdir}");
            json_error('Server could not save the uploaded document.', 500);
        }
    } elseif (isset($allowedImages[$mime])) {
        $filename = bin2hex(random_bytes(16)) . '.' . $allowedImages[$mime];
        if (!compress_and_save_image($tmpPath, "{$dir}/{$filename}", $mime, UPLOAD_DEFAULT_MAX_DIMENSION)) {
            record_incident('upload_failed', 'critical', ['subdir' => $subdir, 'reason' => 'image processing failed'], dedupeKey: "process:{$subdir}");
            json_error('Server could not process the uploaded image.', 500);
        }
    } else {
        json_error('Only JPEG, PNG, or PDF documents are allowed', 422);
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    return "{$scheme}://{$host}/gmls_api/uploads/{$subdir}/{$filename}";
}

/**
 * Loads $srcPath (already validated as jpeg/png/webp), rotates a JPEG
 * upright per its EXIF Orientation tag (phone cameras routinely save the
 * pixels sideways/upside-down and rely on that tag alone — GD ignores it
 * unless we apply it ourselves), downsamples so neither dimension exceeds
 * $maxDimension (never upscales), and writes the result to $destPath at a
 * fixed re-encode quality. Returns false on any failure so the caller can
 * respond with a clean error instead of silently saving a broken file.
 */
function compress_and_save_image(string $srcPath, string $destPath, string $mime, int $maxDimension): bool {
    $image = match ($mime) {
        'image/jpeg' => @imagecreatefromjpeg($srcPath),
        'image/png' => @imagecreatefrompng($srcPath),
        'image/webp' => @imagecreatefromwebp($srcPath),
        default => false,
    };
    if (!$image) {
        return false;
    }

    if ($mime === 'image/jpeg') {
        $image = apply_exif_rotation($image, $srcPath);
    }

    $width = imagesx($image);
    $height = imagesy($image);
    $longestEdge = max($width, $height);

    if ($longestEdge > $maxDimension) {
        $scale = $maxDimension / $longestEdge;
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $resized = imagecreatetruecolor($newWidth, $newHeight);
        // Preserve transparency for png/webp logos; a no-op for opaque jpegs.
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);
        $image = $resized;
    }

    $saved = match ($mime) {
        'image/jpeg' => imagejpeg($image, $destPath, UPLOAD_JPEG_QUALITY),
        'image/png' => imagepng($image, $destPath, UPLOAD_PNG_COMPRESSION),
        'image/webp' => imagewebp($image, $destPath, UPLOAD_WEBP_QUALITY),
        default => false,
    };
    imagedestroy($image);

    return (bool) $saved;
}

/** Rotates a loaded JPEG GdImage upright per its EXIF Orientation tag (returns the same instance untouched for tag 1/absent). */
function apply_exif_rotation(\GdImage $image, string $srcPath): \GdImage {
    $exif = @exif_read_data($srcPath);
    $orientation = $exif['Orientation'] ?? 1;

    // imagerotate()'s angle is counter-clockwise, opposite of how EXIF
    // orientation describes the correction needed.
    $degrees = match ($orientation) {
        3 => 180,
        6 => -90,
        8 => 90,
        default => 0,
    };
    if ($degrees === 0) {
        return $image;
    }

    $rotated = imagerotate($image, $degrees, 0);
    imagedestroy($image);
    return $rotated;
}
