import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import articleApi from '../../api/articleApi';
import { toast } from '../../utils/toast';
import { Modal, Button } from 'react-bootstrap';
import { getFullAvatarUrl } from '../../utils/avatarUtils';
import { getFullImageUrl } from '../../utils/imageUtils';

const ArticleList = ({ onEdit, onDelete, searchParams }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Modal confirm states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Search params:', searchParams);
      const res = await articleApi.searchArticles(searchParams);
      const pageData = res.data;
      const content = pageData?.content || [];
      // Sort articles by ID
      setArticles(content.sort((a, b) => a.articleId - b.articleId));
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Không tải được danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [searchParams]);

  const handleDelete = async (article) => {
    setSelectedArticle(article);
    setConfirmAction('delete');
    setShowConfirmModal(true);
  };

  const handleRestore = async (article) => {
    setSelectedArticle(article);
    setConfirmAction('restore');
    setShowConfirmModal(true);
  };

  const confirmActionHandler = async () => {
    if (!selectedArticle) return;

    try {
      if (confirmAction === 'delete') {
        await articleApi.deleteArticle(selectedArticle.articleId);
        toast.success('Xóa bài viết thành công!');
      } else if (confirmAction === 'restore') {
        await articleApi.restoreArticle(selectedArticle.articleId);
        toast.success('Khôi phục bài viết thành công!');
      }
      fetchArticles(); // Refresh the list
    } catch (err) {
      console.error(`Error ${confirmAction}ing article:`, err);
      const actionText = confirmAction === 'delete' ? 'xóa' : 'khôi phục';
      toast.error(`Lỗi khi ${actionText} bài viết: ` + (err.response?.data?.message || err.message));
    } finally {
      setShowConfirmModal(false);
      setSelectedArticle(null);
      setConfirmAction(null);
    }
  };

  const cancelAction = () => {
    setShowConfirmModal(false);
    setSelectedArticle(null);
    setConfirmAction(null);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'DRAFT': return 'Nháp';
      case 'ACTIVE': return 'Đã xuất bản';
      case 'INACTIVE': return 'Lưu trữ';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-secondary';
      case 'ACTIVE': return 'bg-success';
      case 'INACTIVE': return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Đang tải danh sách bài viết...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="bi bi-file-text display-1 text-muted"></i>
        <h5 className="mt-3">Không có bài viết nào</h5>
        <p className="text-muted">Chưa có bài viết nào được tạo hoặc không tìm thấy bài viết phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead className="table-light">
          <tr>
            <th>ID</th>
            <th>Bài viết</th>
            <th>Ảnh</th>
            <th>Tác giả</th>
            <th>Trạng thái</th>
            <th>Likes</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((item) => (
            <tr key={item.articleId}>
              <td>{item.articleId}</td>
              <td>
                <div className="d-flex align-items-start">
                  <div className="me-3">
                    {item.author?.avatarUrl && (
                      <img
                        src={getFullAvatarUrl(item.author.avatarUrl)}
                        alt={(item.author?.firstName || '') + ' ' + (item.author?.lastName || '')}
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <button className="btn btn-link p-0 text-start fw-semibold"
                            onClick={() => navigate(`/admin/articles/${item.articleId}`)}>
                      <span style={{ fontSize: '1.1rem' }}>{item.title}</span>
                    </button>
                    {item.content && (
                      <div className="text-muted small mt-1">
                        {item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td>
                {item.imageUrl ? (
                  <img
                    src={getFullImageUrl(item.imageUrl)}
                    alt={item.title}
                    style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 4 }}
                  />
                ) : (
                  <span className="text-muted small">Không có ảnh</span>
                )}
              </td>
              <td>
                {item.author ? `${item.author.firstName} ${item.author.lastName}` : 'N/A'}
              </td>
              <td>
                <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                  {getStatusText(item.status)}
                </span>
              </td>
              <td>
                <div className="d-flex align-items-center">
                  <i className="bi bi-heart-fill text-danger me-1"></i>
                  <span className="fw-semibold">{item.likeCount || 0}</span>
                </div>
              </td>
              <td>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </td>
              <td>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => onEdit?.(item)}
                    title="Chỉnh sửa"
                  >
                    <i className="bi bi-pencil" />
                  </button>
                  {item.status === 'INACTIVE' ? (
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={() => handleRestore(item)}
                      title="Khôi phục"
                    >
                      <i className="bi bi-arrow-clockwise" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(item)}
                      title="Xóa"
                    >
                      <i className="bi bi-trash" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Confirm Modal */}
      <Modal show={showConfirmModal} onHide={cancelAction} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {confirmAction === 'delete' ? 'Xác nhận xóa bài viết' : 'Xác nhận khôi phục bài viết'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {confirmAction === 'delete' 
              ? `Bạn có chắc chắn muốn xóa bài viết "${selectedArticle?.title}"?` 
              : `Bạn có chắc chắn muốn khôi phục bài viết "${selectedArticle?.title}"?`
            }
          </p>
          <p className="text-muted small">
            {confirmAction === 'delete' 
              ? 'Hành động này sẽ chuyển bài viết vào thùng rác và có thể khôi phục sau.'
              : 'Bài viết sẽ được khôi phục và hiển thị lại trong danh sách.'
            }
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelAction}>
            Hủy
          </Button>
          <Button 
            variant={confirmAction === 'delete' ? 'danger' : 'success'} 
            onClick={confirmActionHandler}
          >
            {confirmAction === 'delete' ? 'Xóa' : 'Khôi phục'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ArticleList;


