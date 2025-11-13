import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.hoangluu.id.vn';

export async function downloadPdf(payload) {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/export/pdf`, payload, {
      responseType: 'blob',
      headers: { 'Content-Type': 'application/json', Accept: 'application/pdf,*/*' },
    });

    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = (payload.title?.trim() || 'report') + '.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      console.error('Export PDF error:', text);
      alert(text);
    } else {
      console.error(err);
    }
    throw err;
  }
}

export async function downloadTablePdf(payload) {
  const normalized = {
    title: String(payload.title || 'Report'),
    headers: (payload.headers || []).map((h) => (h == null ? '' : String(h))),
    rows: (payload.rows || []).map((r) => (r || []).map((v) => (v == null ? '' : String(v)))),
  };
  const res = await axios.post(`${API_BASE_URL}/api/export/table-pdf`, normalized, {
    responseType: 'blob',
    headers: { 'Content-Type': 'application/json', Accept: 'application/pdf,*/*' },
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = (payload.fileName?.trim() || normalized.title || 'report') + '.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
