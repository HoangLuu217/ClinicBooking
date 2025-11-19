import React from 'react';
import { downloadPdf } from '../../../api/exportPdf';

export default function ExportPdfButton() {
  const handleClick = () => {
    downloadPdf({
      title: 'Báo cáo lịch hẹn',
      lines: ['Dòng 1', 'Dòng 2 dài để test xuống dòng tự động']
    }).catch(err => console.error(err));
  };

  return <button onClick={handleClick}>Tải PDF</button>;
}