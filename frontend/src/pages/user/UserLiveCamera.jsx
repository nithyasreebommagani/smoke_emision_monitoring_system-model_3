import React, { useState, useEffect, useRef } from 'react';
import { Camera, Video, AlertCircle, Play, Square, Loader, CheckCircle2, AlertOctagon, Eye } from 'lucide-react';
import { uploadService, userService } from '../../services/api';

const UserLiveCamera = ({ onViewEvidence }) => {
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [mediaBlob, setMediaBlob] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(''); // 'idle', 'uploading', 'processing', 'completed', 'failed'
  const [uploadedVideoId, setUploadedVideoId] = useState(null);
  const [violations, setViolations] = useState([]);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Poll for violations if a video is processing
  useEffect(() => {
    if (!uploadedVideoId || uploadStatus !== 'processing') return;

    const pollViolationsAndStatus = async () => {
      try {
        // 1. Check video status
        const vid = await uploadService.getVideoStatus(uploadedVideoId);
        if (vid.status === 'completed') {
          setUploadStatus('completed');
        } else if (vid.status === 'failed') {
          setUploadStatus('failed');
        }

        // 2. Fetch violations for this video
        const results = await userService.getMyViolations({
          uploaded_video_id: uploadedVideoId
        });
        setViolations(results.items);
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollViolationsAndStatus();
    const interval = setInterval(pollViolationsAndStatus, 3000);
    return () => clearInterval(interval);
  }, [uploadedVideoId, uploadStatus]);

  const startCamera = async () => {
    setError('');
    setMediaBlob(null);
    setUploadedVideoId(null);
    setViolations([]);
    setUploadStatus('idle');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error(err);
      setError('Failed to access camera. Please check camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    setDuration(0);
    setRecording(true);
    setUploadStatus('idle');

    // Setup MediaRecorder
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: '' };
        }
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setMediaBlob(blob);
        submitRecordingForAnalysis(blob);
      };

      // Start recording with 1s timeslices
      mediaRecorder.start(1000);

      // Start Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      setError('Recording failed to start.');
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
      stopCamera();
    }
  };

  const submitRecordingForAnalysis = async (blobToUpload) => {
    setUploadStatus('uploading');
    setError('');
    
    try {
      const fileObj = new File(
        [blobToUpload], 
        `live_stream_${new Date().getTime()}.mp4`, 
        { type: 'video/mp4' }
      );
      
      const response = await uploadService.uploadVideo(fileObj);
      setUploadedVideoId(response.id);
      setUploadStatus('processing');
    } catch (err) {
      console.error(err);
      setError('Failed to submit stream recording for analysis.');
      setUploadStatus('failed');
    }
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Session Stream</h1>
          <p className="page-subtitle">Record and analyze live footage from your local device camera</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
        
        {/* Stream Viewport Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Camera Stream</h3>
            {recording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255, 69, 58, 0.08)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '8px' }}>
                <span className="pulse" style={{ display: 'block', width: '10px', height: '10px', background: 'var(--color-danger)', borderRadius: '50%' }}></span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-danger)' }}>REC {formatDuration(duration)}</span>
              </div>
            )}
          </div>

          {/* Viewport */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#090d16', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {stream ? (
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <Camera size={48} style={{ opacity: 0.3 }} />
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Camera Stream is offline</span>
              </div>
            )}
          </div>

          {/* Stream Controls */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {!stream && (
              <button onClick={startCamera} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} />
                <span>Start Camera</span>
              </button>
            )}
            {stream && !recording && (
              <>
                <button onClick={startRecording} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={16} />
                  <span>Start Detection</span>
                </button>
                <button onClick={stopCamera} className="btn btn-secondary">
                  Stop Camera
                </button>
              </>
            )}
            {recording && (
              <button onClick={stopRecording} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Square size={16} />
                <span>Stop Detection</span>
              </button>
            )}
          </div>

          {error && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'rgba(255, 69, 58, 0.08)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Processing & Violations Results Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600 }}>Detection Results</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: 0 }}>Analysis log from current session</p>
          </div>

          {/* Upload Status Card */}
          {uploadStatus !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              {uploadStatus === 'uploading' && (
                <>
                  <Loader className="spin" size={18} color="var(--color-primary)" />
                  <span style={{ fontSize: '0.85rem' }}>Uploading stream recording to server...</span>
                </>
              )}
              {uploadStatus === 'processing' && (
                <>
                  <Loader className="spin" size={18} color="var(--color-primary)" />
                  <span style={{ fontSize: '0.85rem' }}>AI processing video file...</span>
                </>
              )}
              {uploadStatus === 'completed' && (
                <>
                  <CheckCircle2 size={18} color="#32d74b" />
                  <span style={{ fontSize: '0.85rem', color: '#32d74b', fontWeight: 600 }}>Analysis completed successfully!</span>
                </>
              )}
              {uploadStatus === 'failed' && (
                <>
                  <AlertCircle size={18} color="var(--color-danger)" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Video analysis failed.</span>
                </>
              )}
            </div>
          )}

          {/* Results List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px' }}>
            {violations.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.9rem', minHeight: '150px' }}>
                {uploadStatus === 'processing' ? 'Awaiting AI detections...' : 'No detections reported.'}
              </div>
            ) : (
              violations.map((v) => (
                <div 
                  key={v.id} 
                  style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="status-badge danger" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>VIOLATION</span>
                      <strong style={{ fontSize: '0.85rem' }}>{v.plate_number}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Offset: {v.timestamp}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary)' }}>{(v.confidence * 100).toFixed(0)}%</span>
                    <button 
                      onClick={() => onViewEvidence(v.id)}
                      className="btn btn-outline"
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    >
                      <Eye size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserLiveCamera;
