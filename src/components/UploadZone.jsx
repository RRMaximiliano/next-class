import React, { useState } from 'react';
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

    // Validate for text-based files
    const supportedExts = ['.vtt', '.txt', '.srt'];
    const hasSupported = supportedExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasSupported && file.type && !file.type.startsWith('text/')) {
      setError(`Unsupported file type "${file.name.split('.').pop()}". Please upload a .vtt, .srt, or .txt transcript file.`);
      return;
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
      role="button"
      tabIndex={0}
      aria-label="Upload transcript file. Drag and drop or press Enter to browse."
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.currentTarget.querySelector('input[type="file"]')?.click();
        }
      }}
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
          Upload your <strong>Class Transcript</strong> or <strong>Session Recording Files</strong>
        </p>
        <p className="upload-subhint">
          Supports .vtt, .srt, .txt files
        </p>
        <label className="browse-btn">
          Browse Files
          <input type="file" accept=".vtt,.srt,.txt" onChange={handleFileInput} hidden />
        </label>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
};
