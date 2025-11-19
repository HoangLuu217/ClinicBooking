import axios from 'axios';

export async function downloadPdf(payload: { title: string; lines: string[] }) {
  try {
    const res = await axios.post('http://localhost:8080/api/export/pdf', payload, {
      responseType: 'blob',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/pdf,*/*' }
    });

    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = (payload.title?.trim() || 'report') + '.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err: any) {
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

export async function downloadTablePdf(payload: {
  title: string;
  headers: (string | number | null)[];
  rows: (string | number | null)[][];
  fileName?: string;
}) {
  const normalized = {
    title: String(payload.title || 'Report'),
    headers: (payload.headers || []).map((h) => (h == null ? '' : String(h))),
    rows: (payload.rows || []).map((r) => (r || []).map((v) => (v == null ? '' : String(v))))
  };
  const res = await axios.post('http://localhost:8080/api/export/table-pdf', normalized, {
    responseType: 'blob',
    headers: { 'Content-Type': 'application/json', Accept: 'application/pdf,*/*' }
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