import React, { useState } from 'react';
import { downloadTablePdf } from '../../api/exportPdf';

// Plain JS version for environments without TS support
export default function ExportAllPdfButton(props) {
  const { title, fileName, columns, getRows, className, children } = props;
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      const rowsMaybe = typeof getRows === 'function' ? getRows() : getRows;
      const rows = rowsMaybe && typeof rowsMaybe.then === 'function' ? await rowsMaybe : rowsMaybe;
      await downloadTablePdf({ title, headers: columns, rows, fileName });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} className={className || 'btn btn-outline-secondary'} disabled={loading}>
      {loading ? (
        <span className="d-inline-flex align-items-center">
          <span className="spinner-border spinner-border-sm me-2" />
          Đang xuất...
        </span>
      ) : (
        children || (
          <span className="d-inline-flex align-items-center">
            <i className="bi bi-file-earmark-pdf me-2" />
            Xuất tất cả
          </span>
        )
      )}
    </button>
  );
}

