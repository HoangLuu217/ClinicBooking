import React, { useEffect, useMemo, useState } from 'react';
import notificationApi from '../api/notificationApi';
import { Bell, Calendar, Check, X, Info } from 'lucide-react';

const TypeIcon = ({ type }) => {
  const base = 'inline-flex items-center justify-center w-9 h-9 rounded-full text-white';
  switch ((type || '').toLowerCase()) {
    case 'appointment':
      return <div className={`${base} bg-blue-500`}><Calendar size={18} /></div>;
    case 'cancellation':
      return <div className={`${base} bg-red-500`}><X size={18} /></div>;
    case 'reminder':
      return <div className={`${base} bg-amber-500`}><Bell size={18} /></div>;
    case 'system':
    default:
      return <div className={`${base} bg-violet-500`}><Info size={18} /></div>;
  }
};

function timeAgo(date) {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return d.toLocaleString('vi-VN');
}

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all | unread | appointment | system | cancellation | reminder

  const filtered = useMemo(() => {
    let data = items;
    if (filter === 'unread') data = data.filter(n => !n.isRead);
    else if (filter !== 'all') data = data.filter(n => (n.type || '').toLowerCase() === filter);
    return data;
  }, [items, filter]);

  const load = async (p = 0) => {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    const u = JSON.parse(raw);
    setUser(u);
    if (!u?.id) return;
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications(u.id, p, size);
      setItems(Array.isArray(res.data?.content) ? res.data.content : []);
      setTotalPages(res.data?.totalPages || 0);
      setPage(p);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const markAll = async () => {
    if (!user?.id) return;
    await notificationApi.markAllAsRead(user.id);
    load(page);
  };

  const markOne = async (id) => {
    await notificationApi.markAsRead(id);
    // Optimistic update
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <div className="w-full bg-gray-50 min-h-[60vh]">
      <div className="max-w-5xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white border rounded-xl shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0d6efd]/10 text-[#0d6efd] flex items-center justify-center"><Bell size={18} /></div>
              <div>
                <h1 className="text-xl font-semibold leading-tight">Thông báo</h1>
                <p className="text-sm text-gray-500">Xem tất cả cập nhật từ hệ thống và lịch hẹn</p>
              </div>
            </div>
            <button onClick={markAll} className="text-sm px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50">Đánh dấu tất cả đã đọc</button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'unread', label: 'Chưa đọc' },
              { key: 'appointment', label: 'Đặt lịch' },
              { key: 'cancellation', label: 'Huỷ lịch' },
              { key: 'reminder', label: 'Nhắc nhở' },
              { key: 'system', label: 'Hệ thống' },
            ].map(f => (
              <button
                key={f.key}
                className={`text-sm px-3 py-1.5 rounded-full border ${filter === f.key ? 'bg-[#0d6efd] text-white border-[#0d6efd]' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><Bell /></div>
              <div className="text-gray-600 font-medium">Không có thông báo nào</div>
              <div className="text-sm text-gray-400 mt-1">Bạn sẽ thấy thông báo mới tại đây</div>
            </div>
          ) : (
            filtered.map(n => (
              <div key={n.id} className={`flex gap-3 p-4 border-b last:border-0 ${!n.isRead ? 'bg-blue-50/40' : 'bg-white'}`}>
                <TypeIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>{n.title}</h3>
                      <p className="text-sm text-gray-600 mt-0.5 break-words">{n.message}</p>
                      <div className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && (
                      <button onClick={() => markOne(n.id)} className="text-xs text-[#0d6efd] hover:underline flex items-center gap-1"><Check size={14}/> Đã đọc</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button disabled={page<=0} onClick={() => load(page-1)} className="px-3 py-1 border rounded disabled:opacity-50">Trước</button>
            <span className="text-sm text-gray-600">Trang {page+1}/{totalPages}</span>
            <button disabled={page>=totalPages-1} onClick={() => load(page+1)} className="px-3 py-1 border rounded disabled:opacity-50">Sau</button>
          </div>
        )}
      </div>
    </div>
  );
}
