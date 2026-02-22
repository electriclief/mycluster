import { useState, useEffect, useCallback } from 'react';

interface ResultFile {
  filename: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
  jobId: string;
}

interface Job {
  id: string;
  status: string;
  completedAt?: string;
}

interface StorageStats {
  totalBytes: number;
  totalMB: number;
  fileCount: number;
}

function ResultsViewer() {
  const [files, setFiles] = useState<ResultFile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<ResultFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewType, setPreviewType] = useState<string>('');

  // Load completed jobs
  const loadJobs = async () => {
    try {
      const allJobs = await window.electronAPI.invoke('job:list');
      const completedJobs = allJobs.filter((j: Job) => j.status === 'complete');
      setJobs(completedJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  // Load files for selected job
  const loadFiles = async (jobId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://${window.location.host}/api/results/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load storage stats
  const loadStorageStats = async () => {
    try {
      const response = await fetch(`http://${window.location.host}/api/results/stats`);
      if (response.ok) {
        const data = await response.json();
        setStorageStats(data);
      }
    } catch (error) {
      // Ignore errors
    }
  };

  useEffect(() => {
    loadJobs();
    loadStorageStats();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      loadFiles(selectedJob);
    } else {
      setFiles([]);
    }
  }, [selectedJob]);

  const handleViewFile = async (file: ResultFile) => {
    setSelectedFile(file);
    setShowPreview(true);
    setPreviewContent('');
    setPreviewType(file.type);

    try {
      const response = await fetch(`http://${window.location.host}/api/results/${file.jobId}/${encodeURIComponent(file.filename)}`);
      
      if (file.type === 'text') {
        const text = await response.text();
        setPreviewContent(text);
      } else if (file.type === 'image') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewContent(url);
      } else if (file.type === 'json') {
        const json = await response.json();
        setPreviewContent(JSON.stringify(json, null, 2));
      }
    } catch (error) {
      console.error('Failed to load file preview:', error);
      setPreviewContent('Error loading preview');
    }
  };

  const handleDownloadFile = async (file: ResultFile) => {
    try {
      const response = await fetch(
        `http://${window.location.host}/api/results/${file.jobId}/${encodeURIComponent(file.filename)}/download`
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleDeleteJobFiles = async (jobId: string) => {
    if (!confirm(`Delete all result files for job ${jobId}?`)) return;
    
    try {
      const response = await fetch(`http://${window.location.host}/api/results/${jobId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        if (selectedJob === jobId) {
          setFiles([]);
        }
        await loadStorageStats();
      }
    } catch (error) {
      console.error('Failed to delete files:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'text': return '📄';
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'json': return '📋';
      default: return '📦';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#e94560' }}>Results Viewer</h2>
      </div>

      {/* Storage Stats */}
      {storageStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
        }}>
          <div style={{ padding: '15px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Total Files</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#eee' }}>{storageStats.fileCount}</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Storage Used</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4caf50' }}>{storageStats.totalMB.toFixed(2)} MB</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* Job Selection */}
        <div style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
          maxHeight: '70vh',
          overflow: 'auto',
        }}>
          <h3 style={{ color: '#aaa', marginTop: 0, marginBottom: '15px' }}>Select Job</h3>
          
          {jobs.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
              No completed jobs with results
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job.id)}
                  style={{
                    padding: '12px',
                    backgroundColor: selectedJob === job.id ? '#e94560' : '#0f3460',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#eee',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {job.id.substring(0, 12)}...
                  </div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>
                    {formatTime(job.completedAt || '')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Files List */}
        <div style={{
          padding: '20px',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          border: '1px solid #0f3460',
          minHeight: '70vh',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#aaa', margin: 0 }}>
              Files {selectedJob && `(${files.length})`}
            </h3>
            {selectedJob && files.length > 0 && (
              <button
                onClick={() => handleDeleteJobFiles(selectedJob)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#b71c1c',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Delete All
              </button>
            )}
          </div>

          {!selectedJob ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
              Select a job to view its result files
            </p>
          ) : isLoading ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
              Loading files...
            </p>
          ) : files.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
              No files found for this job
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {files.map((file) => (
                <div
                  key={`${file.jobId}-${file.filename}`}
                  style={{
                    backgroundColor: '#0f3460',
                    borderRadius: '8px',
                    padding: '15px',
                    border: '1px solid #1a1a2e',
                    transition: 'transform 0.2s',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                    {getFileIcon(file.type)}
                  </div>
                  <div style={{
                    color: '#eee',
                    fontSize: '0.85rem',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.filename}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '12px' }}>
                    {formatSize(file.size)} • {file.type}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleViewFile(file)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: '#1a1a2e',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#eee',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: '#e94560',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {showPreview && selectedFile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              backgroundColor: '#16213e',
              padding: '20px',
              borderRadius: '12px',
              maxWidth: '90%',
              maxHeight: '90%',
              width: '800px',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#e94560', margin: 0 }}>
                {getFileIcon(selectedFile.type)} {selectedFile.filename}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0f3460',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#eee',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Close
              </button>
            </div>

            <div style={{
              backgroundColor: '#0f3460',
              borderRadius: '6px',
              padding: '15px',
              maxHeight: '60vh',
              overflow: 'auto',
            }}>
              {previewType === 'image' && previewContent && (
                <img
                  src={previewContent}
                  alt={selectedFile.filename}
                  style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
                />
              )}
              
              {previewType === 'text' && previewContent && (
                <pre style={{
                  color: '#eee',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  margin: 0,
                }}>
                  {previewContent}
                </pre>
              )}
              
              {previewType === 'json' && previewContent && (
                <pre style={{
                  color: '#69f0ae',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  margin: 0,
                }}>
                  {previewContent}
                </pre>
              )}

              {(previewType === 'video' || previewType === 'audio') && (
                <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                  <p>{previewType === 'video' ? '🎥' : '🎵'} Media file</p>
                  <p style={{ fontSize: '0.85rem' }}>Download to view {previewType}</p>
                </div>
              )}

              {!previewContent && previewType !== 'video' && previewType !== 'audio' && (
                <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                  Preview not available
                </div>
              )}
            </div>

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
              <div style={{ color: '#888', fontSize: '0.85rem' }}>
                Size: {formatSize(selectedFile.size)} • Type: {selectedFile.type}
              </div>
              <button
                onClick={() => handleDownloadFile(selectedFile)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e94560',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultsViewer;
