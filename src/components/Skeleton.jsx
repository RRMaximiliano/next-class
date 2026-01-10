import React from 'react';
import './Skeleton.css';

// Single line skeleton text
export const SkeletonText = ({ width = '100%', height = '1rem' }) => (
  <div
    className="skeleton skeleton-text"
    style={{ width, height }}
  />
);

// Rectangular block skeleton
export const SkeletonBlock = ({ width = '100%', height = '4rem' }) => (
  <div
    className="skeleton skeleton-block"
    style={{ width, height }}
  />
);

// Skeleton for Class Summary content
export const SummarySkeleton = () => (
  <div className="skeleton-container">
    <div className="skeleton-section">
      <SkeletonText width="40%" height="1.25rem" />
      <div style={{ marginTop: '1rem' }}>
        <SkeletonText width="100%" />
        <SkeletonText width="90%" />
        <SkeletonText width="95%" />
      </div>
    </div>

    <div className="skeleton-section">
      <SkeletonText width="35%" height="1.25rem" />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <SkeletonBlock width="30%" height="3rem" />
        <SkeletonBlock width="30%" height="3rem" />
        <SkeletonBlock width="30%" height="3rem" />
      </div>
    </div>

    <div className="skeleton-section">
      <SkeletonText width="45%" height="1.25rem" />
      <SkeletonBlock width="100%" height="6rem" />
    </div>
  </div>
);

// Skeleton for Detailed Feedback content
export const FeedbackSkeleton = () => (
  <div className="skeleton-container">
    <div className="skeleton-section">
      <SkeletonText width="50%" height="1.25rem" />
      <div style={{ marginTop: '1rem' }}>
        <SkeletonBlock width="100%" height="5rem" />
        <SkeletonBlock width="100%" height="5rem" />
      </div>
    </div>

    <div className="skeleton-section">
      <SkeletonText width="45%" height="1.25rem" />
      <div style={{ marginTop: '1rem' }}>
        <SkeletonBlock width="100%" height="5rem" />
        <SkeletonBlock width="100%" height="5rem" />
      </div>
    </div>
  </div>
);

// Skeleton for table rows
export const TableRowSkeleton = ({ columns = 3 }) => (
  <tr className="skeleton-row">
    {Array(columns).fill(0).map((_, i) => (
      <td key={i}>
        <SkeletonText width={i === 1 ? '80%' : '60%'} />
      </td>
    ))}
  </tr>
);
