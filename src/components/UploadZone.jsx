import React, { useState, useCallback } from 'react';
import './UploadZone.css';

export const UploadZone = ({ onFileLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFile = (file) => {
    setError(null);
    if (!file) return;

    // Simple validation for text-based files
    if (file.type && !file.type.startsWith('text/') && !file.name.endsWith('.vtt') && !file.name.endsWith('.txt')) {
      // We'll be lenient for now but warn
      console.warn("File type might not be supported:", file.type);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      onFileLoaded({ name: file.name, content });
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''} ${error ? 'error' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="upload-content">
        <div className="icon-wrapper">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <p className="upload-hint">
          Upload your <strong>Zoom Transcript</strong> or <strong>Class Session Files</strong>
        </p>
        <p className="upload-subhint">
          Supports .vtt, .txt (More formats coming soon)
        </p>
        <label className="browse-btn">
          Browse Files
          <input type="file" accept=".vtt,.txt" onChange={handleFileInput} hidden />
        </label>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
};
