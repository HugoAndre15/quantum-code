"use client";
import { useState, useEffect, useCallback } from "react";

export default function Toast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);

  const show = useCallback((text) => {
    setMsg(text);
    setVisible(true);
    setTimeout(() => setVisible(false), 2800);
  }, []);

  useEffect(() => {
    window.__showToast = show;
    return () => {
      delete window.__showToast;
    };
  }, [show]);

  return (
    <div className={`toast${visible ? " show" : ""}`}>
      <span className="toast-ico">⚡</span>
      <span>{msg}</span>
    </div>
  );
}
