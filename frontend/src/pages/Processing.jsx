import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";

export default function Processing() {

  const location = useLocation();
  const navigate = useNavigate();

  const jobId = location.state?.jobId;

  useEffect(() => {

    if (!jobId) return;

    const ws = new WebSocket(
      API_BASE_URL.replace("http", "ws") + "/ws"
    );

    ws.onopen = () => {
      console.log("WebSocket Connected");
    };

    ws.onmessage = (event) => {

      const data = JSON.parse(event.data);

      console.log(data);

      if (
        data.job_id === jobId &&
        data.status === "completed"
      ) {

        navigate("/result", {
          state: data
        });

      }

    };

    return () => ws.close();

  }, [jobId, navigate]);

  return (
    <div
      style={{
        height: "100vh",
        background: "#111",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <h1>🚗 SmokeWatch</h1>

      <h2>⏳ Processing...</h2>

      <p>Please wait while we analyze your video.</p>
    </div>
  );
}