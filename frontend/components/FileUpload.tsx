import React, { useState, useRef } from 'react';

interface UploadResponse {
  message: string;
  filename: string;
  chunks_count: number;
  processing_time: number;
}

interface FileUploadProps {
  apiUrl?: string; 
  onUploadComplete?: (result: UploadResponse) => void;
  onUploadError?: (error: string) => void;
}

export default function FileUpload({
  apiUrl = "http://localhost:8000/api/upload",
  onUploadComplete,
  onUploadError
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // 1. Validate file type (PDF only)
      if (!selectedFile.type.includes('pdf')) {
        if (onUploadError) onUploadError('Only PDF files are allowed');
        return;
      }
      
      // 2. Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        if (onUploadError) onUploadError('File size exceeds 10MB limit');
        return;
      }
      
      // 3. Set selected file
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // 1. Create FormData with selected file
      const formData = new FormData();
      formData.append('file', file);
      
      // Use a simulated progress for better UX since fetch doesn't track progress directly
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // Simulate progress up to 90% (the last 10% will be when response is received)
          if (prev < 90) return prev + 5;
          return prev;
        });
      }, 300);

      // 2. Send POST request to API using fetch
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      // Clear the progress interval
      clearInterval(progressInterval);
      
      // 3. Handle response
      if (response.ok) {
        setUploadProgress(100); // Complete the progress bar
        const data = await response.json() as UploadResponse;
        
        if (onUploadComplete) onUploadComplete(data);
        setFile(null);
        setTimeout(() => setUploadProgress(0), 1000); // Reset progress after showing 100%
      } else {
        const errorText = await response.text();
        console.error('Upload error:', response.status, errorText);
        if (onUploadError) onUploadError(`Upload failed (${response.status}): ${errorText}`);
      }
      
      setIsUploading(false);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      if (onUploadError) onUploadError('Error uploading file');
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Validate file type
      if (!droppedFile.type.includes('pdf')) {
        if (onUploadError) onUploadError('Only PDF files are allowed');
        return;
      }
      
      // Validate file size
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (droppedFile.size > maxSize) {
        if (onUploadError) onUploadError('File size exceeds 10MB limit');
        return;
      }
      
      setFile(droppedFile);
    }
  };
  
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload">
      {/* Drag & Drop area */}
      <div 
        className={`upload-area ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="upload-icon">
          {file ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          )}
        </div>
        
        <div className="upload-text">
          {file ? (
            <>
              <p className="filename">{file.name}</p>
              <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </>
          ) : (
            <>
              <p className="primary-text">Drag & Drop your financial PDF file here</p>
              <p className="secondary-text">or click to browse</p>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Upload button */}
      {file && (
        <div className="upload-actions">
          <button 
            className="upload-button"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Process PDF'}
          </button>
          
          {!isUploading && (
            <button 
              className="cancel-button"
              onClick={() => setFile(null)}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {isUploading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="progress-text">{uploadProgress}%</div>
        </div>
      )}
    </div>
  );
} 