// frontend/src/forum/components/ComposeModal.jsx
import { useState, useRef, useCallback } from "react";
import { postsAPI, uploadAPI } from "../api/client";

const CATEGORIES = [
  { value: "school_closure",  label: "School closure", icon: "🏫" },
  { value: "community_aid",   label: "Community aid", icon: "🤝" },
  { value: "infrastructure",  label: "Infrastructure", icon: "🏗" },
  { value: "weather_alert",   label: "Weather alert", icon: "⚠️" },
  { value: "other",           label: "Other", icon: "📝" },
];

const RISK_LEVELS = [
  { value: "green",  label: "Green – Safe", icon: "🟢", color: "#22c55e" },
  { value: "yellow", label: "Yellow – Be aware", icon: "🟡", color: "#eab308" },
  { value: "orange", label: "Orange – Be prepared", icon: "🟠", color: "#f97316" },
  { value: "red",    label: "Red – Take action", icon: "🔴", color: "#ef4444" },
  { value: "purple", label: "Purple – Emergency", icon: "🟣", color: "#a855f7" },
];

const GOVERNORATES = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte",
  "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse", "Monastir", "Mahdia",
  "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Medenine",
  "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 5;

export default function ComposeModal({ onClose, onPublished }) {
  const [form, setForm] = useState({
    title: "", body: "", category: "", risk_level: "green", governorate: "",
  });
  const [mediaFiles, setMediaFiles] = useState([]); // { file, preview, url, type, name, uploading, progress, error }
  const [aiStatus, setAiStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const isUploading = mediaFiles.some((f) => f.uploading);
  const hasErrors = mediaFiles.some((f) => f.error);

  const handleFiles = useCallback(async (files) => {
    const remaining = MAX_FILES - mediaFiles.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    const newFiles = [];

    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        newFiles.push({ file, preview: null, url: null, type: "unknown", name: file.name, uploading: false, progress: 0, error: "File type not supported" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        newFiles.push({ file, preview: null, url: null, type: "unknown", name: file.name, uploading: false, progress: 0, error: "File too large (max 50 MB)" });
        continue;
      }

      const isVideo = file.type.startsWith("video");
      const preview = isVideo ? null : URL.createObjectURL(file);

      newFiles.push({ file, preview, url: null, type: isVideo ? "video" : "image", name: file.name, uploading: false, progress: 0, error: null });
    }

    setMediaFiles((prev) => [...prev, ...newFiles]);
    setError(null);

    // Auto-upload each file
    for (let i = 0; i < newFiles.length; i++) {
      const idx = mediaFiles.length + i;
      if (newFiles[i].error) continue;

      setMediaFiles((prev) => prev.map((f, j) => j === idx ? { ...f, uploading: true } : f));

      try {
        const result = await uploadAPI.upload(newFiles[i].file, (progress) => {
          setMediaFiles((prev) => prev.map((f, j) => j === idx ? { ...f, progress } : f));
        });
        setMediaFiles((prev) => prev.map((f, j) => j === idx ? { ...f, uploading: false, url: result.file_url } : f));
      } catch (e) {
        const msg = e.response?.data?.detail || "Upload failed";
        setMediaFiles((prev) => prev.map((f, j) => j === idx ? { ...f, uploading: false, error: msg } : f));
      }
    }
  }, [mediaFiles.length]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const removeFile = useCallback((idx) => {
    if (mediaFiles[idx].preview) URL.revokeObjectURL(mediaFiles[idx].preview);
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
  }, [mediaFiles]);

  const check = async () => {
    if (!form.title || !form.body || !form.category) {
      setError("Please fill in title, content, and category before checking.");
      return;
    }
    setError(null);
    setAiStatus("checking");
    try {
      const result = await postsAPI.check(form);
      setAiStatus(result);
    } catch {
      setAiStatus({ approved: false, reason: "Moderation service error. Please retry." });
    }
  };

  const submit = async () => {
    const uploadedUrls = mediaFiles.filter((f) => f.url && !f.error).map((f) => f.url);
    setSubmitting(true);
    setError(null);
    try {
      const postData = { ...form, media_urls: uploadedUrls };
      const post = await postsAPI.create(postData);
      // Cleanup previews
      mediaFiles.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
      onPublished?.(post);
      onClose();
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (typeof detail === "object") {
        setAiStatus({ approved: false, reason: detail.ai_reason });
        setError(detail.message);
      } else {
        setError(detail ?? "Error creating post");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskIcon = (level) => {
    const risk = RISK_LEVELS.find(r => r.value === level);
    return risk ? risk.icon : "⚪";
  };

  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#1e293b",
    fontFamily: "sans-serif",
    fontSize: 14,
    color: "white",
    boxSizing: "border-box",
    transition: "all 0.2s",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#94a3b8",
    marginBottom: 6,
    letterSpacing: "0.3px",
  };

  const uploadedUrls = mediaFiles.filter((f) => f.url && !f.error);
  const uploadInProgress = mediaFiles.some((f) => f.uploading);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
          borderRadius: 24,
          border: "1px solid rgba(29, 158, 117, 0.2)",
          width: 640,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            background: "rgba(11, 17, 32, 0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <div
              style={{
                background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              ✏️
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, color: "white" }}>Create a post</span>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Share information with your community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 20,
              color: "#94a3b8",
              lineHeight: 1,
              padding: "6px 12px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "#94a3b8"; }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem" }}>
          {/* Category */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>📂</span> Category <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={form.category}
              onChange={set("category")}
              style={fieldStyle}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            >
              <option value="" style={{ color: "#94a3b8" }}>Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} style={{ color: "white" }}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>📌</span> Title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={form.title}
              onChange={set("title")}
              placeholder="Clear, descriptive title…"
              style={fieldStyle}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>💬</span> Content <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={form.body}
              onChange={set("body")}
              placeholder="Describe what's happening…"
              style={{ ...fieldStyle, height: 120, resize: "vertical", fontFamily: "sans-serif" }}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </div>

          {/* Row: risk + governorate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
            <div>
              <label style={labelStyle}>
                <span style={{ marginRight: 4 }}>⚠️</span> Risk level
              </label>
              <select
                value={form.risk_level}
                onChange={set("risk_level")}
                style={{ ...fieldStyle, borderLeft: `3px solid ${RISK_LEVELS.find(r => r.value === form.risk_level)?.color || "#64748b"}` }}
                onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
                onBlur={(e) => e.target.style.borderColor = "#334155"}
              >
                {RISK_LEVELS.map((r) => (
                  <option key={r.value} value={r.value} style={{ color: "white" }}>
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                <span style={{ marginRight: 4 }}>📍</span> Governorate
              </label>
              <select
                value={form.governorate}
                onChange={set("governorate")}
                style={fieldStyle}
                onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
                onBlur={(e) => e.target.style.borderColor = "#334155"}
              >
                <option value="" style={{ color: "#94a3b8" }}>All governorates</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g} style={{ color: "white" }}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Media Upload */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>📎</span> Photos & Videos ({mediaFiles.length}/{MAX_FILES})
            </label>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#1D9E75" : "#334155"}`,
                borderRadius: 12,
                padding: mediaFiles.length > 0 ? "12px" : "24px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "rgba(29, 158, 117, 0.05)" : "rgba(30, 41, 59, 0.3)",
                transition: "all 0.2s",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />
              {mediaFiles.length === 0 ? (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                    Drag & drop photos/videos here
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                    or click to browse • JPG, PNG, GIF, WebP, MP4, WebM • Max 50 MB
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  + Click or drop to add more files
                </div>
              )}
            </div>

            {/* Media previews */}
            {mediaFiles.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 8,
                marginTop: 10,
              }}>
                {mediaFiles.map((mf, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: "relative",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#1e293b",
                      border: mf.error ? "1px solid #ef4444" : "1px solid #334155",
                      aspectRatio: mf.type === "video" ? "16/9" : "1",
                    }}
                  >
                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        zIndex: 10,
                        background: "rgba(0,0,0,0.7)",
                        border: "none",
                        borderRadius: "50%",
                        width: 22,
                        height: 22,
                        cursor: "pointer",
                        color: "#f87171",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>

                    {/* Preview content */}
                    {mf.error ? (
                      <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <div style={{ textAlign: "center", color: "#f87171", fontSize: 10 }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>❌</div>
                          {mf.error}
                        </div>
                      </div>
                    ) : mf.type === "video" ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#0f172a" }}>
                        {mf.url ? (
                          <video src={mf.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                        ) : mf.preview ? (
                          <div style={{ fontSize: 32, color: "#64748b" }}>🎬</div>
                        ) : (
                          <div style={{ fontSize: 32, color: "#64748b" }}>🎬</div>
                        )}
                      </div>
                    ) : mf.preview ? (
                      <img src={mf.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}

                    {/* Uploading overlay */}
                    {mf.uploading && (
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}>
                        <div style={{
                          width: 24,
                          height: 24,
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#1D9E75",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }} />
                        <span style={{ fontSize: 10, color: "white", fontWeight: 600 }}>{mf.progress}%</span>
                      </div>
                    )}

                    {/* Success indicator */}
                    {mf.url && !mf.uploading && !mf.error && (
                      <div style={{
                        position: "absolute",
                        bottom: 4,
                        right: 4,
                        background: "rgba(29, 158, 117, 0.8)",
                        borderRadius: "50%",
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "white",
                      }}>
                        ✓
                      </div>
                    )}

                    {/* File name */}
                    <div style={{
                      padding: "4px 6px",
                      fontSize: 9,
                      color: "#94a3b8",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      background: "#0f172a",
                    }}>
                      {mf.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI status */}
          {aiStatus && aiStatus !== "checking" && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 13,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: aiStatus.approved ? "rgba(29, 158, 117, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${aiStatus.approved ? "rgba(29, 158, 117, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 18 }}>
                {aiStatus.approved ? "✅" : "❌"}
              </span>
              <div>
                <div style={{ fontWeight: 600, color: aiStatus.approved ? "#4ade80" : "#f87171", marginBottom: 4 }}>
                  {aiStatus.approved ? "Approved by AI moderation" : "Not approved"}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>
                  {aiStatus.reason}
                </div>
              </div>
            </div>
          )}

          {aiStatus === "checking" && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 13,
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ width: 20, height: 20, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: "#60a5fa" }}>AI is reviewing your post for relevance…</span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 13,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #1e293b",
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
            background: "rgba(11, 17, 32, 0.3)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid #334155",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "sans-serif",
              color: "#94a3b8",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.borderColor = "#475569"; e.target.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = "#334155"; e.target.style.color = "#94a3b8"; }}
          >
            Cancel
          </button>

          <button
            onClick={check}
            disabled={aiStatus === "checking" || uploadInProgress}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid #1D9E75",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "sans-serif",
              color: "#1D9E75",
              transition: "all 0.2s",
              opacity: aiStatus === "checking" || uploadInProgress ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (aiStatus !== "checking" && !uploadInProgress) { e.target.style.background = "rgba(29, 158, 117, 0.1)"; e.target.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={(e) => { if (aiStatus !== "checking" && !uploadInProgress) { e.target.style.background = "transparent"; e.target.style.transform = "translateY(0)"; } }}
          >
            🤖 Check with AI
          </button>

          <button
            onClick={submit}
            disabled={submitting || !aiStatus || aiStatus === "checking" || !aiStatus.approved || uploadInProgress || hasErrors}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "sans-serif",
              transition: "all 0.2s",
              opacity: (submitting || !aiStatus || aiStatus === "checking" || !aiStatus.approved || uploadInProgress || hasErrors) ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!submitting && aiStatus && aiStatus !== "checking" && aiStatus.approved && !uploadInProgress) e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { if (!submitting && aiStatus && aiStatus !== "checking" && aiStatus.approved && !uploadInProgress) e.target.style.transform = "translateY(0)"; }}
          >
            {submitting ? "Publishing…" : `📮 Publish${uploadedUrls.length > 0 ? ` (${uploadedUrls.length} file${uploadedUrls.length > 1 ? "s" : ""})` : ""}`}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
