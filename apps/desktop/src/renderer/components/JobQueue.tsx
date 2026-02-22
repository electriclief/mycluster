import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Job {
  id: string;
  script: string;
  targetComputerId: string;
  args?: Record<string, unknown>;
  status: 'pending' | 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  priority: number;
  result?: {
    type: 'text' | 'image' | 'video' | 'audio' | 'files';
    data?: string;
    files?: string[];
    exitCode?: number;
    error?: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  timeout?: number;
}

interface JobStats {
  total: number;
  pending: number;
  running: number;
  complete: number;
  failed: number;
  cancelled: number;
}

interface LanComputer {
  id: string;
  computerName: string;
}

function JobQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [computers, setComputers] = useState<LanComputer[]>([]);
  const [selectedComputer, setSelectedComputer] = useState('');
  const [script, setScript] = useState('');
  const [priority, setPriority] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'running' | 'complete' | 'failed'>('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load computers
  const loadComputers = async () => {
    const list = await window.electronAPI.invoke('lan:getComputers');
    setComputers(list as LanComputer[]);
  };

  // Load jobs
  const loadJobs = async () => {
    const jobList = await window.electronAPI.invoke('job:list', filter === 'all' ? undefined : filter);
    setJobs(jobList as Job[]);
  };

  // Load stats
  const loadStats = async () => {
    const s = await window.electronAPI.invoke('job:stats');
    setStats(s as JobStats);
  };

  // WebSocket for real-time updates
  const handleWSMessage = useCallback((message: { type: string; payload: unknown }) => {
    if (message.type === 'job-progress') {
      // Refresh jobs on job progress update
      loadJobs();
      loadStats();
    }
  }, []);

  const { isConnected } = useWebSocket({
    url: `ws://${window.location.host}/ws`,
    onMessage: handleWSMessage,
    autoReconnect: true,
    reconnectInterval: 5000,
  });

  useEffect(() => {
    loadComputers();
    loadJobs();
    loadStats();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadJobs();
      loadStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [filter]);

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComputer || !script.trim()) return;

    setIsSubmitting(true);
    try {
      await window.electronAPI.invoke('job:enqueue', {
        script: script.trim(),
        targetComputerId: selectedComputer,
        priority,
        args: {},
      });
      setScript('');
      setPriority(0);
      setSelectedComputer('');
      await loadJobs();
      await loadStats();
    } catch (error) {
      console.error('Failed to submit job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelJob = async (id: string) => {
    if (!confirm('Cancel this job?')) return;
    await window.electronAPI.invoke('job:cancel', id);
    await loadJobs();
    await loadStats();
  };

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'running': return '#2196f3';
      case 'complete': return '#4caf50';
      case 'failed': return '#f44336';
      case 'cancelled': return '#9e9e9e';
      default: return '#666';
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#e94560' }}>Job Queue</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>
            {isConnected ? '🟢 Real-time updates' : '🔴 Connecting...'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
        }}>
          <div style={{ padding: '15px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Total</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#eee' }}>{stats.total}</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Pending</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff9800' }}>{stats.pending}</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Running</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2196f3' }}>{stats.running}</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Complete</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4caf50' }}>{stats.complete}</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#16213e', borderRadius: '8px', border: '1px solid #0f3460' }}>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Failed</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f44336' }}>{stats.failed}</div>
          </div>
        </div>
      )}

      {/* Submit Job Form */}
      <div style={{
        padding: '20px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
        border: '1px solid #0f3460',
        marginBottom: '20px',
      }}>
        <h3 style={{ color: '#aaa', marginTop: 0, marginBottom: '15px' }}>Submit New Job</h3>
        <form onSubmit={handleSubmitJob}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>
              Target Computer
            </label>
            <select
              value={selectedComputer}
              onChange={(e) => setSelectedComputer(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0f3460',
                border: '1px solid #1a1a2e',
                borderRadius: '6px',
                color: '#eee',
                fontSize: '1rem',
              }}
            >
              <option value="">Select a computer...</option>
              {computers.map((c) => (
                <option key={c.id} value={c.id}>{c.computerName}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>
              Python Script
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="print('Hello from the cluster!')"
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0f3460',
                border: '1px solid #1a1a2e',
                borderRadius: '6px',
                color: '#eee',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>
              Priority: {priority}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '0.85rem' }}>
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedComputer || !script.trim()}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: (isSubmitting || !selectedComputer || !script.trim()) ? '#0f3460' : '#e94560',
              border: 'none',
              borderRadius: '6px',
              color: '#eee',
              fontSize: '1rem',
              cursor: (isSubmitting || !selectedComputer || !script.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Submitting...' : '🚀 Submit Job'}
          </button>
        </form>
      </div>

      {/* Job List */}
      <div style={{
        padding: '20px',
        backgroundColor: '#16213e',
        borderRadius: '8px',
        border: '1px solid #0f3460',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#aaa', margin: 0 }}>Jobs</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['all', 'pending', 'running', 'complete', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: filter === f ? '#e94560' : '#0f3460',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#eee',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {jobs.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
            No jobs found. Submit a job to get started!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px',
                  backgroundColor: '#0f3460',
                  borderRadius: '6px',
                  border: `1px solid ${getStatusColor(job.status)}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: getStatusColor(job.status),
                      color: '#fff',
                    }}>
                      {job.status}
                    </span>
                    <span style={{ color: '#aaa', fontSize: '0.85rem' }}>
                      Priority: {job.priority}
                    </span>
                  </div>
                  <div style={{ color: '#eee', fontFamily: 'monospace', fontSize: '0.9rem', marginBottom: '5px' }}>
                    {job.script.substring(0, 80)}{job.script.length > 80 ? '...' : ''}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>
                    Created: {formatTime(job.createdAt)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleViewDetails(job)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1a1a2e',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#eee',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Details
                  </button>
                  {job.status === 'pending' || job.status === 'running' ? (
                    <button
                      onClick={() => handleCancelJob(job.id)}
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
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {showDetails && selectedJob && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDetails(false)}
        >
          <div
            style={{
              backgroundColor: '#16213e',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#e94560', marginTop: 0 }}>Job Details</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Status</div>
              <span style={{
                fontSize: '0.9rem',
                padding: '4px 12px',
                borderRadius: '4px',
                backgroundColor: getStatusColor(selectedJob.status),
                color: '#fff',
              }}>
                {selectedJob.status}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Script</div>
              <pre style={{
                backgroundColor: '#0f3460',
                padding: '15px',
                borderRadius: '6px',
                color: '#eee',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {selectedJob.script}
              </pre>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Target Computer ID</div>
              <div style={{ color: '#eee', fontFamily: 'monospace' }}>{selectedJob.targetComputerId}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Created</div>
                <div style={{ color: '#eee' }}>{formatTime(selectedJob.createdAt)}</div>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Started</div>
                <div style={{ color: '#eee' }}>{formatTime(selectedJob.startedAt)}</div>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Completed</div>
                <div style={{ color: '#eee' }}>{formatTime(selectedJob.completedAt)}</div>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Priority</div>
                <div style={{ color: '#eee' }}>{selectedJob.priority}</div>
              </div>
            </div>

            {selectedJob.result && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Result</div>
                <div style={{
                  backgroundColor: selectedJob.result.error ? '#2a1a1a' : '#1a2a1a',
                  padding: '15px',
                  borderRadius: '6px',
                  color: selectedJob.result.error ? '#ff6b6b' : '#69f0ae',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                }}>
                  {selectedJob.result.error || selectedJob.result.data || `Exit code: ${selectedJob.result.exitCode}`}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDetails(false)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0f3460',
                border: 'none',
                borderRadius: '6px',
                color: '#eee',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobQueue;
