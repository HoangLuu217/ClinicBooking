import React, { useState } from 'react';
import { downloadTablePdf } from '../../api/exportPdf';

/**
 * Generic button to export all items to a PDF table.
 * Props:
 *  - title: PDF title
 *  - fileName: optional file name (without .pdf)
 *  - columns: array of column headers
 *  - getRows: function returning rows (array of arrays) or rows array directly
 */
export default function ExportAllPdfButton({
  title,
  fileName,
  columns,
  getRows,
  className,
  children,
}: {
  title: string;
  fileName?: string;
  columns: (string | number)[];
  // getRows can be sync or async returning 2D array
  getRows: (() => Promise<(string | number | null)[][]> | (string | number | null)[][]) | (string | number | null)[][];
  className?: string;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      const rowsMaybe = typeof getRows === 'function' ? (getRows as any)() : (getRows as any);
      const rows = rowsMaybe instanceof Promise ? await rowsMaybe : rowsMaybe;
      await downloadTablePdf({ title, headers: columns as any, rows: rows as any, fileName });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} className={className || 'btn btn-outline-secondary'} disabled={loading}>
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" /> Đang xuất...
        </>
      ) : (
        children || (
          <>
            <i className="bi bi-file-earmark-pdf me-2" />
            Xuất tất cả
          </>
        )
      )}
    </button>
  );
}
