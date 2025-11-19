import React, { useState } from 'react';
import ArticleList from '../../components/article/admin/ArticleList';
import ArticleForm from '../../components/article/admin/ArticleForm';

const ArticleManagement = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchParams, setSearchParams] = useState({
    title: '',
    status: '',
    authorId: ''
  });

  const handleCreate = () => {
    setSelectedArticle(null);
    setCurrentView('create');
  };

  const handleEdit = (article) => {
    setSelectedArticle(article);
    setCurrentView('edit');
  };

  const handleSave = (savedArticle) => {
    setCurrentView('list');
    setSelectedArticle(null);
    // The ArticleList component will automatically refresh
  };

  const handleCancel = () => {
    setCurrentView('list');
    setSelectedArticle(null);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Trigger search by updating searchParams
    setSearchParams({ ...searchParams });
  };

  const handleSearchReset = () => {
    setSearchParams({
      title: '',
      status: '',
      authorId: ''
    });
  };

  const renderContent = () => {
    switch (currentView) {
      case 'create':
        return (
          <ArticleForm
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      case 'edit':
        return (
          <ArticleForm
            article={selectedArticle}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      default:
        return (
          <div>
            {/* Search Form */}
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="card-title mb-0">
                  <i className="bi bi-search me-2"></i>
                  Tìm kiếm bài viết
                </h6>
              </div>
              <div className="card-body">
                <form onSubmit={handleSearch}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label htmlFor="searchTitle" className="form-label">
                        Tiêu đề
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="searchTitle"
                        value={searchParams.title}
                        onChange={(e) => setSearchParams(prev => ({
                          ...prev,
                          title: e.target.value
                        }))}
                        placeholder="Nhập tiêu đề để tìm kiếm"
                      />
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="searchStatus" className="form-label">
                        Trạng thái
                      </label>
                      <select
                        className="form-select"
                        id="searchStatus"
                        value={searchParams.status}
                        onChange={(e) => setSearchParams(prev => ({
                          ...prev,
                          status: e.target.value
                        }))}
                      >
                        <option value="">Tất cả trạng thái</option>
                        <option value="ACTIVE">Đã xuất bản</option>
                        <option value="INACTIVE">Lưu trữ</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="searchAuthorId" className="form-label">
                        ID Tác giả
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        id="searchAuthorId"
                        value={searchParams.authorId}
                        onChange={(e) => setSearchParams(prev => ({
                          ...prev,
                          authorId: e.target.value
                        }))}
                        placeholder="ID tác giả"
                      />
                    </div>
                    <div className="col-md-2 d-flex align-items-end">
                      <div className="btn-group w-100" role="group">
                        <button type="submit" className="btn btn-primary">
                          <i className="bi bi-search"></i> Tìm
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary"
                          onClick={handleSearchReset}
                        >
                          <i className="bi bi-arrow-clockwise"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Article List */}
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="bi bi-file-text me-2"></i>
                  Quản lý bài viết
                </h5>
                <button
                  className="btn btn-primary"
                  onClick={handleCreate}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Tạo bài viết mới
                </button>
              </div>
              <div className="card-body">
                <ArticleList
                  onEdit={handleEdit}
                  onDelete={() => {}} // Handled in ArticleList component
                  searchParams={searchParams}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Breadcrumb removed as requested */}

          {/* Page Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">Quản lý bài viết</h2>
              <p className="text-muted mb-0">
                {currentView === 'create' && 'Tạo bài viết mới'}
                {currentView === 'edit' && 'Chỉnh sửa bài viết'}
                {currentView === 'list' && 'Danh sách và quản lý tất cả bài viết'}
              </p>
            </div>
            
            {currentView !== 'list' && (
              <button
                className="btn btn-outline-secondary"
                onClick={handleCancel}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Quay lại danh sách
              </button>
            )}
          </div>

          {/* Main Content */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ArticleManagement;


