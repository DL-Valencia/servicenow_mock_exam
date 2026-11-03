import React from 'react';
import SessionHeader from './SessionHeader';
import QuestionCard from './QuestionCard';
import QuestionPalette from './QuestionPalette';

export default function SessionView() {
  return (
    <div className="view-animate">
      <SessionHeader />
      <div className="session-body">
        <QuestionCard />
        <QuestionPalette />
      </div>
    </div>
  );
}

