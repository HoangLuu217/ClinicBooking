import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Heart, ArrowRight, Clock } from 'lucide-react';
import articleApi from '../../api/articleApi';
import { getFullAvatarUrl } from '../../utils/avatarUtils';
import config from '../../config/config';

const ArticlesSection = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestArticles = async () => {
      try {
        setLoading(true);
        const searchParams = {
          status: 'ACTIVE'
        };
        
        const response = await articleApi.searchArticles(searchParams, 0, 8, 'createdAt,desc');
        const pageData = response.data;
        setArticles(pageData.content || []);
      } catch (err) {
        console.error('Error fetching latest articles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestArticles();
  }, []);

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
          day: 'numeric'
        });
      }
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return config.helpers.getImageUrl(imageUrl);
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Bài viết sức khỏe mới nhất
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Cập nhật những thông tin sức khỏe hữu ích và lời khuyên từ các chuyên gia y tế
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>{articles.length} bài viết mới nhất</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>Cập nhật hàng ngày</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <span>Chuyên gia y tế</span>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        {articles.length > 0 ? (
          <div className="relative mb-12">
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:mx-0 md:snap-none">
            {articles.map((article) => (
              <div
                key={article.articleId}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow min-w-[70vw] max-w-[75vw] sm:min-w-[260px] sm:max-w-none flex-shrink-0 snap-start md:min-w-0 md:max-w-none md:flex-shrink md:snap-none"
              >
                {/* Article Image */}
                {getImageUrl(article.imageUrl) && (
                  <div className="h-32 md:h-48 overflow-hidden">
                    <img
                      src={getImageUrl(article.imageUrl)}
                      alt={article.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Article Content */}
                <div className="p-4 md:p-6">
                  {/* Author Info */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center space-x-3">
                      {article.author?.avatarUrl ? (
                        <img
                          src={getFullAvatarUrl(article.author.avatarUrl)}
                          alt={`${article.author.firstName} ${article.author.lastName}`}
                          className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-xs md:text-sm border-2 border-gray-200" style={{ display: article.author?.avatarUrl ? 'none' : 'flex' }}>
                        {article.author?.firstName?.charAt(0)}{article.author?.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs md:text-sm font-semibold text-gray-900">
                          {article.author?.firstName} {article.author?.lastName}
                        </div>
                        <div className="flex items-center text-[11px] md:text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatDate(article.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Article Title */}
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3 line-clamp-2 leading-tight">
                    <Link 
                      to={`/articles/${article.articleId}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h3>

                  {/* Article Excerpt */}
                  <p className="text-gray-600 text-xs md:text-sm mb-4 line-clamp-3 leading-relaxed">
                    {article.content && article.content.length > 200 
                      ? article.content.substring(0, 200) + '...' 
                      : article.content
                    }
                  </p>

                  {/* Article Stats */}
                  <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                        <span className="font-medium">{article.likeCount || 0}</span>
                        <span className="text-[11px] md:text-xs">lượt tim</span>
                      </div>
                    </div>
                    <Link 
                      to={`/articles/${article.articleId}`}
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center text-xs md:text-sm"
                    >
                      Đọc thêm
                      <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có bài viết nào</h3>
              <p className="text-gray-600 mb-6">
                Hiện tại chưa có bài viết nào được xuất bản. Hãy quay lại sau để xem những bài viết mới nhất về sức khỏe.
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Cập nhật thường xuyên</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>Nội dung chất lượng</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View All Button */}
        <div className="text-center">
          <Link
            to="/articles"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <span>Xem tất cả bài viết</span>
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
          <p className="text-sm text-gray-500 mt-3">
            Khám phá thêm nhiều bài viết sức khỏe hữu ích khác
          </p>
        </div>
      </div>
    </section>
  );
};

export default ArticlesSection;
