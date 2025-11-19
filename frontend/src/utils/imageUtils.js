// Generic image URL helper for non-avatar images (articles, departments, etc.)
// Similar logic to avatarUtils but keeps a separate default placeholder.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

/**
 * Build full image URL from relative or absolute path.
 * Accepts values like '/uploads/abc.jpg', 'uploads/abc.jpg', full http URL.
 */
export function getFullImageUrl(raw) {
  if (!raw || !String(raw).trim()) return '/images/placeholder-image.png';
  const v = String(raw).trim();
  if (/^https?:\/\//i.test(v)) return v; // already absolute
  if (v.startsWith('/images/') || v.startsWith('/assets/')) return v;
  return v.startsWith('/') ? `${API_BASE_URL}${v}` : `${API_BASE_URL}/${v}`;
}

/**
 * Provide a small JSX fallback element (optional usage).
 */
export function imageFallback(label = 'No image') {
  return (
    <div
      className="bg-light border d-flex align-items-center justify-content-center text-muted"
      style={{ width: 72, height: 48, fontSize: 11 }}
    >
      {label}
    </div>
  );
}

export default { getFullImageUrl, imageFallback };