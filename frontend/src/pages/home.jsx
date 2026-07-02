import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";
export default function Home() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const handleRecordClick = () => {
    fileInputRef.current?.click();
  };

  const handleVideoSelected = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      alert("Uploading video...");

      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch(
        `${API_BASE_URL}/api/uploads/video`,
        {
          method: "POST",
          body: formData,
        }
      );

      console.log("Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Backend Error:", errorText);
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();

      console.log("Upload Response:", data);

      // Navigate to Processing Page
      navigate("/processing", {
        state: {
          jobId: data.job_id,
        },
      });

    } catch (error) {
      console.error("Upload Error:", error);

      alert(`❌ Upload Failed

${error.message}`);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#111",
        color: "white",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "15px 20px",
        }}
      >
        <h2 style={{ margin: 0 }}>🚗 SmokeWatch</h2>

        <button
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          👤
        </button>
      </div>

      {/* Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleVideoSelected}
      />

      {/* Center Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <div>
          <h2>Record Smoke-Emitting Vehicle</h2>

          <p>
            Tap the record button below and capture a clear video of the
            smoke-emitting vehicle.
          </p>
        </div>
      </div>

      {/* Record Button */}
      <div
        style={{
          padding: "30px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          onClick={handleRecordClick}
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            border: "none",
            background: "#ff3b30",
            color: "white",
            fontSize: "34px",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(255,59,48,0.4)",
          }}
        >
          🔴
        </button>
      </div>
    </div>
  );
}