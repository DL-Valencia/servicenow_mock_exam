import React from 'react';
import { useExam } from '../../context/ExamContext';
import ExamCatalogHome from './ExamCatalogHome';
import HeroBanner from './HeroBanner';
import StatsStrip from './StatsStrip';
import PracticeModesGrid from './PracticeModesGrid';
import DomainBreakdown from './DomainBreakdown';
import ExamHistoryTable from './ExamHistoryTable';

export default function DashboardView() {
  const { activeExam } = useExam();

  if (!activeExam) {
    return <ExamCatalogHome />;
  }

  return (
    <div className="view-animate dashboard-stack">
      <HeroBanner />
      <StatsStrip />
      <PracticeModesGrid />
      <DomainBreakdown />
      <ExamHistoryTable />
    </div>
  );
}
