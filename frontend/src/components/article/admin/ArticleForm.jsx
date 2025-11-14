import React, { useState, useEffect } from "react";
import articleApi from "../../../api/articleApi";
import fileUploadApi from "../../../api/fileUploadApi";
import { toast } from "../../../utils/toast";
import config from "../../../config/config";

const ArticleForm = ({ article, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
    status: "DRAFT",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreviewKey, setImagePreviewKey] = useState(0);

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || "",
        content: article.content || "",
        imageUrl: article.imageUrl || "",
        status: article.status || "DRAFT",
      });
    }
  }, [article]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Tiêu đề là bắt buộc";
    if (!formData.content.trim()) newErrors.content = "Nội dung là bắt buộc";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (article) {
        await articleApi.updateArticle(article.articleId, formData);
        toast.success("Cập nhật bài viết thành công!");
      } else {
        let authorId;
        try {
          const rawUser = localStorage.getItem("user");
          if (rawUser) {
            const user = JSON.parse(rawUser);
            authorId = user?.id ?? user?.userId;
          }
        } catch (_) {}
        const payload = authorId ? { ...formData, authorId } : { ...formData };
        await articleApi.createArticle(payload);
        toast.success("Tạo bài viết thành công!");
      }
      onSave?.(formData);
    } catch (err) {
      console.error("Error saving article:", err);
      toast.error(
        "Lỗi khi lưu bài viết: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.warning("Chỉ cho phép file ảnh (JPEG, PNG, GIF)");
      e.target.value = ""; // Reset input
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.warning("Kích thước file không được vượt quá 5MB");
      e.target.value = ""; // Reset input
      return;
    }
    setUploading(true);
    try {
      // Nếu là bài viết mới (chưa có ID), upload không cần ID
      // Nếu là bài viết đã có ID, gửi articleId để backend đổi tên file
      const response = await fileUploadApi.upload(
        file,
        article?.articleId || null,
        "article"
      );
      if (response.data.success) {
        // Force remount image component by changing key
        setImagePreviewKey((prev) => prev + 1);
        // Update imageUrl
        setFormData((prev) => ({
          ...prev,
          imageUrl: response.data.url,
        }));
        toast.success("Upload ảnh thành công!");
      } else {
        toast.error("Lỗi: " + response.data.message);
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      const errorMessage = err.response?.data?.message || "Lỗi khi upload ảnh";
      toast.error("Lỗi: " + errorMessage);
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input để có thể upload lại cùng file
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          <i className="bi bi-file-text me-2"></i>
          {article ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
        </h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-8">
              <div className="mb-3">
                <label htmlFor="title" className="form-label">
                  Tiêu đề <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.title ? "is-invalid" : ""}`}
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Nhập tiêu đề bài viết"
                />
                {errors.title && (
                  <div className="invalid-feedback">{errors.title}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="content" className="form-label">
                  Nội dung <span className="text-danger">*</span>
                </label>
                <textarea
                  className={`form-control ${
                    errors.content ? "is-invalid" : ""
                  }`}
                  id="content"
                  name="content"
                  rows="10"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Nhập nội dung bài viết"
                />
                {errors.content && (
                  <div className="invalid-feedback">{errors.content}</div>
                )}
              </div>
            </div>

            <div className="col-md-4">
              <div className="mb-3">
                <label htmlFor="status" className="form-label">
                  Trạng thái
                </label>
                <select
                  className="form-select"
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="ACTIVE">Đã xuất bản</option>
                  <option value="INACTIVE">Lưu trữ</option>
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="imageUrl" className="form-label">
                  URL ảnh
                </label>
                <input
                  type="text"
                  className={`form-control ${
                    errors.imageUrl ? "is-invalid" : ""
                  }`}
                  id="imageUrl"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg hoặc /uploads/filename.jpg"
                />
                {errors.imageUrl && (
                  <div className="invalid-feedback">{errors.imageUrl}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="fileUpload" className="form-label">
                  Upload ảnh
                </label>
                <input
                  type="file"
                  className="form-control"
                  id="fileUpload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <div className="mt-2">
                    <div
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    >
                      <span className="visually-hidden">Uploading...</span>
                    </div>
                    <small className="text-muted">Đang upload...</small>
                  </div>
                )}
              </div>

              {formData.imageUrl && (
                <div className="mb-3" key={`preview-${imagePreviewKey}`}>
                  <label className="form-label">Ảnh hiện tại</label>
                  <div>
                    <img
                      src={
                        formData.imageUrl.startsWith("http")
                          ? formData.imageUrl
                          : config.helpers.getImageUrl(formData.imageUrl)
                      }
                      alt="Preview"
                      className="img-fluid rounded"
                      style={{ maxHeight: "200px" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              <i className="bi bi-x-circle me-2"></i>
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  >
                    <span className="visually-hidden">Loading...</span>
                  </span>
                  Đang lưu...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {article ? "Cập nhật" : "Tạo mới"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ArticleForm;
