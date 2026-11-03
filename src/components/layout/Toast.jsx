import React from 'react';
import { useExam } from '../../context/ExamContext';

export default function Toast() {
  const { toastMsg } = useExam();
  if (!toastMsg) return null;

  return <div className="toast">{toastMsg}</div>;
}

