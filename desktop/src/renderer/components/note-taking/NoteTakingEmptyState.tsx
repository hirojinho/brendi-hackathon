import React from 'react';
import './NoteTakingEmptyState.css';

export const NoteTakingEmptyState: React.FC = () => {
  return (
    <div className="note-taking-empty-state">
      <p>Type your notes in natural language. The agent will automatically identify the source (conference, book, presentation, etc.) and decide if it should create a note.</p>
      <p className="empty-state-examples">Examples:</p>
      <ul>
        <li>"I'm at AWS re:Invent and learned that Lambda functions can now handle larger payloads..."</li>
        <li>"From the Clean Code book, I learned that functions should do one thing..."</li>
        <li>"In today's presentation on microservices, the speaker mentioned that service mesh provides..."</li>
      </ul>
    </div>
  );
};

