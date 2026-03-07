import React from 'react';
import './EmptyState.css';

export const EmptyState = ({ icon, title, description, children }) => (
  <div className="empty-state">
    {icon && (
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
    )}
    {title && <p className="empty-state-title">{title}</p>}
    {description && <p className="empty-state-description">{description}</p>}
    {children}
  </div>
);
