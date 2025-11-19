import axiosClient from './axiosClient';

/**
 * Generic image upload that matches current backend endpoint /api/files/upload.
 * Usage across app expects: uploadImage(file, id?, type?)
 * - type: 'user' | 'article' | 'doctor' | 'department'
 * - id optional; if absent backend will assign UUID filename.
 * Other callers (chat/messages) may only pass the file.
 */
function uploadImage(file, entityId = null, entityType = null) {
  const formData = new FormData();
  formData.append('file', file);

  // Map entity type to backend parameter name
  if (entityId && entityType === 'user') formData.append('userId', entityId);
  if (entityId && entityType === 'article') formData.append('articleId', entityId);
  if (entityId && entityType === 'doctor') formData.append('doctorId', entityId);
  if (entityId && entityType === 'department') formData.append('departmentId', entityId);

  return axiosClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// Legacy helpers kept (not currently used in code but retained for backwards compatibility)
function uploadFile(formData) {
  return axiosClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

function uploadAvatar(formData) {
  return axiosClient.post('/files/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// Unified, recommended API
export const upload = uploadImage;

export default {
  upload,        // preferred
  uploadImage,   // backward compatibility
  uploadFile,    // legacy
  uploadAvatar,  // legacy
};



