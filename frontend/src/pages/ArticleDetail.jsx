import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Heart, Eye, Clock } from 'lucide-react';
import articleApi from '../api/articleApi';
import { toast } from '../utils/toast';
import { getFullAvatarUrl } from '../utils/avatarUtils';
import useScrollToTop from '../hooks/useScrollToTop';
import config from '../config/config';

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);

  // Scroll to top when component mounts
  useScrollToTop();

  // Kiểm tra trạng thái đăng nhập và localStorage
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setCurrentUser(user);
        
        // Kiểm tra trạng thái tim trong localStorage
        const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');
        setIsLiked(likedArticles.includes(parseInt(id)));
      } catch (err) {
        console.error('Error parsing user data:', err);
        setCurrentUser(null);
      }
    }
  }, [id]);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await articleApi.getArticleById(id);
        setArticle(response.data);
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Không tải được bài viết');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

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

  const handleLike = async () => {
    if (isLiking) return;

    // Kiểm tra đăng nhập
    if (!currentUser) {
      toast.warning('Vui lòng đăng nhập để thả tim bài viết!');
      return;
    }

    try {
      setIsLiking(true);
      await articleApi.likeArticle(id);
      
      // Cập nhật localStorage
      const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');
      if (!likedArticles.includes(parseInt(id))) {
        likedArticles.push(parseInt(id));
        localStorage.setItem('likedArticles', JSON.stringify(likedArticles));
        setIsLiked(true);
      }
    } catch (err) {
      console.error('Error liking article:', err);
      toast.error('Lỗi khi like bài viết: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLiking(false);
    }
  };

  const handleUnlike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      await articleApi.unlikeArticle(id);
      
      // Cập nhật localStorage
      const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');
      const updatedLikedArticles = likedArticles.filter(articleId => articleId !== parseInt(id));
      localStorage.setItem('likedArticles', JSON.stringify(updatedLikedArticles));
      setIsLiked(false);
    } catch (err) {
      console.error('Error unliking article:', err);
      toast.error('Lỗi khi unlike bài viết: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLiking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy bài viết</h2>
              <p className="text-gray-600 mb-6">{error || 'Bài viết không tồn tại hoặc đã bị xóa.'}</p>
              <Link 
                to="/articles"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại danh sách bài viết
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Link
              to="/articles"
              className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại danh sách bài viết
            </Link>
          </div>

          {/* Article Content */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Article Header */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex items-center space-x-3">
                  {article.author?.avatarUrl ? (
                    <img
                      src={getFullAvatarUrl(article.author.avatarUrl)}
                      alt={`${article.author.firstName} ${article.author.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm" style={{ display: article.author?.avatarUrl ? 'none' : 'flex' }}>
                    {article.author?.firstName?.charAt(0)}{article.author?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {article.author?.firstName} {article.author?.lastName}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(article.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>

              {/* Article Content */}
              <div className="prose prose-lg max-w-none mb-6">
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {article.content}
                </div>
              </div>

              {/* Article Image */}
              {getImageUrl(article.imageUrl) && (
                <div className="mb-6">
                  <img
                    src={getImageUrl(article.imageUrl)}
                    alt={article.title}
                    className="w-full h-auto rounded-lg object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Article Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-gray-600">{article.likeCount || 0} lượt tim</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!currentUser ? (
                    <button
                      className="flex items-center space-x-2 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                      onClick={() => toast.warning('Vui lòng đăng nhập để thả tim bài viết!')}
                    >
                      <Heart className="h-6 w-6" />
                      <span className="text-base font-medium">Thả tim</span>
                    </button>
                  ) : isLiked ? (
                    <button
                      className="flex items-center px-4 py-3 text-base border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                      onClick={handleUnlike}
                      disabled={isLiking}
                    >
                      {isLiking ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-1"></div>
                      ) : (
                        <Heart className="h-6 w-6 mr-1 fill-current" />
                      )}
                      Bỏ tim
                    </button>
                  ) : (
                    <button
                      className="flex items-center px-4 py-3 text-base border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                      onClick={handleLike}
                      disabled={isLiking}
                    >
                      {isLiking ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-1"></div>
                      ) : (
                        <Heart className="h-6 w-6 mr-1" />
                      )}
                      Thả tim
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
