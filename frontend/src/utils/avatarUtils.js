/**
 * Utility functions for handling avatar URLs
 */
import config from '../config/config';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

/**
 * Convert relative avatar URL to full URL
 * @param {string} avatarUrl - The avatar URL (can be relative or absolute)
 * @returns {string} - Full URL for the avatar
 */
export function getFullAvatarUrl(raw) {
  if (!raw) return '/images/default-doctor.png';
  const v = String(raw).trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('/images/')) return v;
  return v.startsWith('/') ? `${API_BASE_URL}${v}` : `${API_BASE_URL}/${v}`;
}

/**
 * Check if avatar URL is valid
 * @param {string} avatarUrl - The avatar URL to check
 * @returns {boolean} - True if URL is valid
 */
export const isValidAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return false;
  
  // Check if it's a valid URL format
  try {
    const url = getFullAvatarUrl(avatarUrl);
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get avatar placeholder for users without avatar
 * @param {string} name - User's name for initials
 * @returns {string} - Placeholder text
 */
export const getAvatarPlaceholder = (name) => {
  if (!name) return '?';
  
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  return words[0][0].toUpperCase();
}

/**
 * Normalize avatar URL to a standard format
 * @param {string} raw - The raw avatar URL
 * @returns {string} - Normalized avatar URL
 */
export function normalizeAvatar(raw) {
  if (!raw || typeof raw !== "string" || !raw.trim())
    return "/images/default-doctor.png";
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/images/") || v.startsWith("/assets/")) return v;
  if (v.startsWith("/uploads") || v.startsWith("/avatars") || v.startsWith("/files"))
    return `${API_BASE_URL}${v}`;
  return v.startsWith("/") ? v : `/${v}`;
}
