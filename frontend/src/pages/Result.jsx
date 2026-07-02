import React from "react";
import { useLocation } from "react-router-dom";

export default function Result() {

  const { state } = useLocation();

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
      <h1>✅ Processing Complete</h1>

      <h3>Job ID</h3>
      <p>{state?.job_id}</p>

      <h3>Status</h3>
      <p>{state?.status}</p>
    </div>
  );
}