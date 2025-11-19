import axiosClient from './axiosClient';

const articleApi = {
  // Get all articles with pagination
  getAllArticles: (page = 0, size = 10, sort = 'createdAt,desc') => {
    return axiosClient.get('/articles', {
      params: { page, size, sort }
    });
  },

  // Get article by ID
  getArticleById: (id) => {
    return axiosClient.get(`/articles/${id}`);
  },

  // Search articles
  searchArticles: (searchParams, page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = { page, size, sort };
    if (searchParams.title) params.title = searchParams.title;
    if (searchParams.status) params.status = searchParams.status;
    if (searchParams.authorId) params.authorId = searchParams.authorId;
    
    console.log('API call params:', params);
    return axiosClient.get('/articles/search', { params });
  },

  // Create new article
  createArticle: (articleData) => {
    return axiosClient.post('/articles', articleData);
  },

  // Update article
  updateArticle: (id, articleData) => {
    return axiosClient.put(`/articles/${id}`, articleData);
  },

  // Delete article
  deleteArticle: (id) => {
    return axiosClient.delete(`/articles/${id}`);
  },

  // Change article status
  changeArticleStatus: (id, status) => {
    return axiosClient.put(`/articles/${id}/status`, null, {
      params: { status }
    });
  },

  // Restore article
  restoreArticle: (id) => {
    return axiosClient.put(`/articles/${id}/restore`);
  },

  // Approve article
  approveArticle: (id) => {
    return axiosClient.put(`/articles/${id}/approve`);
  },

  // Reject article
  rejectArticle: (id) => {
    return axiosClient.put(`/articles/${id}/reject`);
  },

  // Like article
  likeArticle: (id) => {
    return axiosClient.post(`/articles/${id}/like`);
  },

  // Unlike article
  unlikeArticle: (id) => {
    return axiosClient.post(`/articles/${id}/unlike`);
  }
};

export default articleApi;


