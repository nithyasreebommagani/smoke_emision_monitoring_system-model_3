import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Upload, 
  Video, 
  VideoOff,
  History, 
  Play, 
  Square, 
  RotateCcw, 
  Check, 
  Loader2, 
  Eye, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileVideo 
} from "lucide-react";
import { uploadService } from "../services/api";

export default function UploadVideo() {
  const [activeTab, setActiveTab] = useState("file"); // "file" or "record"
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  // MediaRecorder states
  const [stream, setStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recordDuration, setRecordDuration] = useState(0);
  const [cameraError, setCameraError] = useState("");
  
  // Refs
  const videoPreviewRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Upload History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch upload history on mount
  const fetchHistory = async () => {
    try {
      const data = await uploadService.getMyVideos();
      setHistory(data);
    } catch (err) {
      console.error("Error fetching upload history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // Poll history every 5 seconds to get real-time status updates of processing
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  // Web camera stream setup
  const startCamera = async () => {
    setCameraError("");
    setRecordedBlob(null);
    setRecordedUrl("");
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false // No audio needed for smoke monitoring
      });
      setStream(userStream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = userStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("Camera access denied. Please grant permissions and reload.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (activeTab === "record") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  // MediaRecorder triggers
  const startRecording = () => {
    if (!stream) return;
    mediaChunksRef.current = [];
    
    // Use supported mimetype
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/mp4' };
        }
      }
    }

    try {
      const recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          mediaChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
      };

      setMediaRecorder(recorder);
      recorder.start(250); // Slice data every 250ms
      setIsRecording(true);
      setRecordDuration(0);

      // Duration timer
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error("Failed to start MediaRecorder:", e);
      setCameraError("Failed to initialize recorder.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setRecordedUrl("");
    setRecordDuration(0);
    if (stream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
    }
  };

  // Drag and Drop events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (['mp4', 'avi', 'mov'].includes(ext)) {
        setFile(droppedFile);
        setUploadSuccess(false);
      } else {
        alert("Unsupported file format! Please upload an MP4, AVI, or MOV video.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadSuccess(false);
    }
  };

  // Upload function
  const handleUpload = async (fileToUpload) => {
    if (!fileToUpload) return;
    setUploading(true);
    setUploadSuccess(false);
    try {
      await uploadService.uploadVideo(fileToUpload);
      setUploadSuccess(true);
      setFile(null);
      setRecordedBlob(null);
      setRecordedUrl("");
      fetchHistory();
    } catch (err) {
      console.error("Upload error:", err);
      alert(err.response?.data?.detail || "Failed to upload video.");
    } finally {
      setUploading(false);
    }
  };

  const submitFile = () => {
    handleUpload(file);
  };

  const submitRecording = () => {
    if (!recordedBlob) return;
    const recordedFile = new File(
      [recordedBlob], 
      `live_record_${Date.now()}.mp4`, 
      { type: "video/mp4" }
    );
    handleUpload(recordedFile);
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return (
          <span className="status-badge approved" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={12} />
            <span>Completed</span>
          </span>
        );
      case "failed":
        return (
          <span className="status-badge dismissed" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <XCircle size={12} />
            <span>Failed</span>
          </span>
        );
      case "processing":
        return (
          <span className="status-badge pending" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Loader2 size={12} className="spin" />
            <span>Processing</span>
          </span>
        );
      default:
        return (
          <span className="status-badge pending" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} />
            <span>Queued</span>
          </span>
        );
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Portal & Ingest</h1>
          <p className="page-subtitle">Submit video feeds or record live camera streams for AI emission analysis</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT COLUMN: UPLOAD / RECORDER PANEL */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "24px" }}>
            <button
              onClick={() => setActiveTab("file")}
              className={`sidebar-link`}
              style={{
                background: "none",
                borderRadius: "0",
                borderBottom: activeTab === "file" ? "2px solid var(--color-primary)" : "2px solid transparent",
                color: activeTab === "file" ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontWeight: 600,
                padding: "12px 24px",
                flex: 1,
                textAlign: "center"
              }}
            >
              <Upload size={16} style={{ marginRight: "8px", display: "inline" }} />
              Upload File
            </button>
            <button
              onClick={() => setActiveTab("record")}
              className={`sidebar-link`}
              style={{
                background: "none",
                borderRadius: "0",
                borderBottom: activeTab === "record" ? "2px solid var(--color-primary)" : "2px solid transparent",
                color: activeTab === "record" ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontWeight: 600,
                padding: "12px 24px",
                flex: 1,
                textAlign: "center"
              }}
            >
              <Video size={16} style={{ marginRight: "8px", display: "inline" }} />
              Record Live Video
            </button>
          </div>

          {/* TAB 1: FILE UPLOAD CONTAINER */}
          {activeTab === "file" && (
            <div>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: dragActive ? "2px dashed var(--color-primary)" : "2px dashed var(--border-color)",
                  borderRadius: "12px",
                  padding: "40px 20px",
                  textAlign: "center",
                  background: dragActive ? "rgba(0, 210, 255, 0.03)" : "rgba(0, 0, 0, 0.15)",
                  transition: "var(--transition-smooth)",
                  cursor: "pointer"
                }}
                onClick={() => document.getElementById("file-input").click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".mp4,.avi,.mov"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                
                <FileVideo size={48} color={file ? "var(--color-primary)" : "var(--color-text-muted)"} style={{ margin: "0 auto 16px" }} />
                
                {file ? (
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "1rem" }}>{file.name}</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "1.05rem" }}>Drag & Drop video here</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                      or click to browse local files
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "12px" }}>
                      Supports MP4, AVI, or MOV video (Max 100MB)
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setFile(null)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "12px" }}
                    disabled={uploading}
                  >
                    Clear
                  </button>
                  <button
                    onClick={submitFile}
                    className="btn btn-primary"
                    style={{ flex: 2, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Ingest & Process Video</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE CAMERA RECORDER */}
          {activeTab === "record" && (
            <div>
              {cameraError ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-danger)" }}>
                  <VideoOff size={32} style={{ margin: "0 auto 12px" }} />
                  <p>{cameraError}</p>
                  <button onClick={startCamera} className="btn btn-secondary" style={{ marginTop: "16px" }}>
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", background: "#000", border: "1px solid var(--border-color)", aspectRatio: "16/9" }}>
                    
                    {/* HTML5 video element */}
                    {!recordedUrl ? (
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <video
                        src={recordedUrl}
                        controls
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}

                    {/* Recording Overlay */}
                    {isRecording && (
                      <div style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255, 69, 58, 0.8)", padding: "6px 12px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: "bold" }}>
                        <span style={{ width: "8px", height: "8px", background: "#fff", borderRadius: "50%", display: "inline-block" }} className="pulse"></span>
                        REC | {formatDuration(recordDuration)}
                      </div>
                    )}
                  </div>

                  {/* Recorder Controls */}
                  <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
                    {!recordedUrl ? (
                      !isRecording ? (
                        <button
                          onClick={startRecording}
                          className="btn btn-primary"
                          style={{ background: "#ff453a", borderColor: "#ff453a", display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}
                        >
                          <Play size={16} />
                          Start Recording
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="btn btn-secondary"
                          style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}
                        >
                          <Square size={16} />
                          Stop Recording
                        </button>
                      )
                    ) : (
                      <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                        <button
                          onClick={resetRecording}
                          className="btn btn-secondary"
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px" }}
                          disabled={uploading}
                        >
                          <RotateCcw size={16} />
                          Retake
                        </button>
                        <button
                          onClick={submitRecording}
                          className="btn btn-primary"
                          style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px" }}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <Loader2 size={16} className="spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Check size={16} />
                              <span>Submit & Process Clip</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadSuccess && (
            <div style={{ marginTop: "20px", padding: "12px", background: "rgba(50, 215, 75, 0.08)", border: "1px solid rgba(50, 215, 75, 0.2)", borderRadius: "8px", color: "var(--color-success)", fontSize: "0.85rem", textAlign: "center" }}>
              Video submitted successfully! Processing pipeline triggered.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: HISTORY LIST */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 0, marginBottom: "20px" }}>
            <History size={18} color="var(--color-primary)" />
            <span>Ingestion Queue & History</span>
          </h3>

          <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--color-text-secondary)" }}>
                Loading ingestion history...
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                No uploads found in your history.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      padding: "12px 16px", 
                      background: "rgba(0,0,0,0.15)", 
                      border: "1px solid var(--border-color)", 
                      borderRadius: "8px" 
                    }}
                  >
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.filename}>
                        {item.filename}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                        Uploaded: {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {getStatusBadge(item.status)}
                      
                      {item.status === "completed" && (
                        <button
                          onClick={() => navigate(`/violations?uploaded_video_id=${item.id}`)}
                          className="btn"
                          style={{
                            padding: "6px 10px",
                            background: "rgba(0, 210, 255, 0.08)",
                            border: "1px solid rgba(0, 210, 255, 0.2)",
                            color: "var(--color-primary)",
                            borderRadius: "4px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.75rem",
                            cursor: "pointer"
                          }}
                          title="View Detected Violations"
                        >
                          <Eye size={12} />
                          <span>Results</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}