import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Heart, Eye, Clock } from 'lucide-react';
import articleApi from '../api/articleApi';
import { getFullAvatarUrl } from '../utils/avatarUtils';
import { toast } from '../utils/toast';
import useScrollToTop from '../hooks/useScrollToTop';
import config from '../config/config';

const Articles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [likedArticles, setLikedArticles] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sortOption, setSortOption] = useState('createdAt,desc');

  // Scroll to top when component mounts
  useScrollToTop();

  const fetchArticles = async ({ page = 0, search = activeSearch, sort = sortOption } = {}) => {
    try {
      setLoading(true);
      
      // Luôn sử dụng searchArticles với status ACTIVE
      const searchParams = {
        status: 'ACTIVE'
      };
      
      // Thêm title nếu có search
      if (search && search.trim()) {
        searchParams.title = search.trim();
      }
      
      const response = await articleApi.searchArticles(searchParams, page, 12, sort);
      
      const pageData = response.data;
      
      setArticles(pageData.content || []);
      setTotalPages(pageData.totalPages || 0);
      setTotalElements(pageData.totalElements || 0);
      setCurrentPage(page);
      
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Không thể tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra trạng thái đăng nhập và localStorage
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setCurrentUser(user);
        
        // Load liked articles từ localStorage
        const likedArticlesFromStorage = JSON.parse(localStorage.getItem('likedArticles') || '[]');
        setLikedArticles(new Set(likedArticlesFromStorage));
      } catch (err) {
        console.error('Error parsing user data:', err);
        setCurrentUser(null);
      }
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, []);


  const handlePageChange = (page) => {
    if (page < 0 || page >= totalPages) return;
    fetchArticles({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      if (diffInMinutes < 1) {
        return 'Vừa xong';
      }
      return `${diffInMinutes} phút trước`;
    } else if (diffInHours < 24) {
      return `${diffInHours} giờ trước`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} ngày trước`;
      } else {
        return date.toLocaleDateString('vi-VN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return config.helpers.getImageUrl(imageUrl);
  };


  const handleLike = async (articleId) => {
    // Kiểm tra đăng nhập
    if (!currentUser) {
      toast.warning('Vui lòng đăng nhập để thả tim bài viết!');
      return;
    }

    try {
      const isLiked = likedArticles.has(articleId);
      if (isLiked) {
        await articleApi.unlikeArticle(articleId);
        setLikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
        
        // Cập nhật localStorage
        const likedArticlesFromStorage = JSON.parse(localStorage.getItem('likedArticles') || '[]');
        const updatedLikedArticles = likedArticlesFromStorage.filter(id => id !== articleId);
        localStorage.setItem('likedArticles', JSON.stringify(updatedLikedArticles));
        
        // Cập nhật likeCount trong articles
        setArticles(prev => prev.map(article => 
          article.articleId === articleId 
            ? { ...article, likeCount: Math.max(0, (article.likeCount || 0) - 1) }
            : article
        ));
      } else {
        await articleApi.likeArticle(articleId);
        setLikedArticles(prev => new Set(prev).add(articleId));
        
        // Cập nhật localStorage
        const likedArticlesFromStorage = JSON.parse(localStorage.getItem('likedArticles') || '[]');
        if (!likedArticlesFromStorage.includes(articleId)) {
          likedArticlesFromStorage.push(articleId);
          localStorage.setItem('likedArticles', JSON.stringify(likedArticlesFromStorage));
        }
        
        // Cập nhật likeCount trong articles
        setArticles(prev => prev.map(article => 
          article.articleId === articleId 
            ? { ...article, likeCount: (article.likeCount || 0) + 1 }
            : article
        ));
      }
    } catch (err) {
      console.error('Error liking article:', err);
      toast.error('Lỗi khi thả tim: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    setActiveSearch(trimmed);
    setCurrentPage(0);
    fetchArticles({ page: 0, search: trimmed });
  };

  const handleSortChange = (event) => {
    const value = event.target.value;
    setSortOption(value);
    setCurrentPage(0);
    fetchArticles({ page: 0, sort: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">{error}</div>
            <button 
              onClick={() => fetchArticles()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Bài viết y tế</h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
              Cập nhật những thông tin y tế mới nhất, lời khuyên từ chuyên gia và kiến thức chăm sóc sức khỏe
            </p>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">
              Chưa có bài viết nào
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-4xl mx-auto mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-col gap-3">
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 w-full">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm bài viết..."
                  className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tìm kiếm
                </button>
              </form>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sắp xếp</label>
                <select
                  value={sortOption}
                  onChange={handleSortChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt,desc">Mới nhất</option>
                  <option value="createdAt,asc">Cũ nhất</option>
                  <option value="title,asc">Tiêu đề (A-Z)</option>
                  <option value="title,desc">Tiêu đề (Z-A)</option>
                  <option value="likeCount,desc">Lượt thích nhiều</option>
                  <option value="likeCount,asc">Lượt thích ít</option>
                </select>
              </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-3">
              {articles.map((article) => (
                <div key={article.articleId} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  {/* Article Header */}
                  <div className="px-3 sm:px-4 pt-3 pb-2">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      {/* Author Avatar */}
                      {article.author?.avatarUrl ? (
                        <img
                          src={getFullAvatarUrl(article.author.avatarUrl)}
                          alt={`${article.author.firstName} ${article.author.lastName}`}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-black"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm sm:text-base border-2 border-black flex-shrink-0" style={{ display: article.author?.avatarUrl ? 'none' : 'flex' }}>
                        {article.author?.firstName?.charAt(0)}{article.author?.lastName?.charAt(0)}
                      </div>
                      
                      {/* Author Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                          {article.author?.firstName} {article.author?.lastName}
                        </h4>
                        <div className="flex items-center text-sm sm:text-base text-gray-500">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{formatDate(article.createdAt)}</span>
                        </div>
                      </div>
                      
                      {/* More Options */}
                      <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Article Content */}
                  <div className="px-3 sm:px-4 py-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      <Link 
                        to={`/articles/${article.articleId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        {article.title}
                      </Link>
                    </h3>
                    
                    <div className="text-gray-700 mb-0 whitespace-pre-wrap text-base sm:text-lg leading-relaxed">
                      {article.content}
                    </div>
                  </div>

                  {/* Article Image */}
                  {getImageUrl(article.imageUrl) && (
                    <div className="w-full -mx-3 sm:-mx-4">
                      <img
                        src={getImageUrl(article.imageUrl)}
                        alt={article.title}
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Article Stats */}
                  <div className="px-3 sm:px-4 py-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex items-center space-x-1">
                          <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="text-sm sm:text-base">{article.likeCount || 0}</span>
                        </div>
                      </div>
                      
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-3 sm:px-4 py-2">
                    <div className="flex items-center justify-center">
                      {!currentUser ? (
                        <button 
                          className="flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                          onClick={() => toast.warning('Vui lòng đăng nhập để thả tim bài viết!')}
                        >
                          <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
                          <span className="text-sm sm:text-base font-medium">Thả tim</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleLike(article.articleId)}
                          className={`flex items-center space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                            likedArticles.has(article.articleId) ? 'text-red-500' : 'text-gray-500'
                          }`}
                        >
                          <Heart 
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              likedArticles.has(article.articleId) ? 'fill-current text-red-500' : 'text-gray-500'
                            }`} 
                          />
                          <span className={`text-xs sm:text-sm font-medium ${
                            likedArticles.has(article.articleId) ? 'text-red-500' : 'text-gray-700'
                          }`}>
                            {likedArticles.has(article.articleId) ? 'Đã thích' : 'Thích'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page + 1}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Articles;
