// frontend/src/forum/components/ComposeModal.jsx
import { useState, useRef, useCallback } from "react";
import { postsAPI, uploadAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../contexts/LanguageContext";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 5;

export default function ComposeModal({ onClose, onPublished }) {
  const { t } = useTheme();
  const { t: __ } = useTranslation();

  const CATEGORIES = [
    { value: "school_closure",  label: __("schoolClosureSingle"), icon: "🏫" },
    { value: "community_aid",   label: __("communityAidSingle"), icon: "🤝" },
    { value: "infrastructure",  label: __("infrastructureSingle"), icon: "🏗" },
    { value: "weather_alert",   label: __("weatherAlertSingle"), icon: "⚠️" },
    { value: "other",           label: __("other"), icon: "📝" },
  ];

  const RISK_LEVELS = [
    { value: "green",  label: `🟢 ${__('safe')}`, icon: "🟢", color: "#22c55e" },
    { value: "yellow", label: `🟡 ${__('caution')}`, icon: "🟡", color: "#eab308" },
    { value: "orange", label: `🟠 ${__('warning')}`, icon: "🟠", color: "#f97316" },
    { value: "red",    label: `🔴 ${__('alert')}`, icon: "🔴", color: "#ef4444" },
    { value: "purple", label: `🟣 ${__('emergency')}`, icon: "🟣", color: "#a855f7" },
  ];

  const GOVERNORATES = [
    "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte",
    "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse", "Monastir", "Mahdia",
    "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Medenine",
    "Tataouine", "Gafsa", "Tozeur", "Kébili",
  ];

  const [form, setForm] = useState({
    title: "", body: "", category: "", risk_level: "green", governorate: "",
  });
  const [mediaFiles, setMediaFiles] = useState([]);
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
      setError(__(`Maximum ${MAX_FILES} files allowed.`));
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    const newFiles = [];

    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        newFiles.push({ file, preview: null, url: null, type: "unknown", name: file.name, uploading: false, progress: 0, error: __('fileNotSupported') });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        newFiles.push({ file, preview: null, url: null, type: "unknown", name: file.name, uploading: false, progress: 0, error: __('fileTooLarge') });
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
        const msg = e.response?.data?.detail || __('uploadFailed');
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
      setError(__('fillRequired'));
      return;
    }
    setError(null);
    setAiStatus("checking");
    try {
      const result = await postsAPI.check(form);
      setAiStatus(result);
    } catch {
      setAiStatus({ approved: false, reason: __('moderationError') });
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
        setError(detail ?? __('errorCreatingPost'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskIcon = (level) => {
    const risk = RISK_LEVELS.find(r => r.value === level);
    return risk ? risk.icon : "⚪";
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
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .compose-field {
            width: 100%;
            padding: 14px 16px;
            border-radius: 12px;
            font-size: 14px;
            box-sizing: border-box;
            outline: none;
            transition: all 0.2s;
            font-family: inherit;
          }
          .compose-field:focus {
            box-shadow: 0 0 0 3px ${t.accent}20;
          }
          .compose-select {
            width: 100%;
            padding: 14px 16px;
            border-radius: 12px;
            font-size: 14px;
            box-sizing: border-box;
            outline: none;
            transition: all 0.2s;
            font-family: inherit;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 14px center;
          }
          .compose-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .compose-btn {
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            transition: all 0.2s;
            cursor: pointer;
          }
          .compose-btn:hover { transform: translateY(-1px); }
          .compose-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
          .compose-section { margin-bottom: 20px; }
        `}
      </style>

      <div
        style={{
          background: t.bgCard,
          borderRadius: 24,
          border: `1px solid ${t.border}`,
          width: 680,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: t.shadowModal,
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            background: t.bgMuted,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
                width: 40,
                height: 40,
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
              <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{__('createPost')}</span>
              <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>{__('shareInfo')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 20,
              color: t.textMuted,
              lineHeight: 1,
              padding: "6px 12px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.background = t.bgHover; e.target.style.color = t.text; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = t.textMuted; }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Category */}
          <div className="compose-section">
            <label className="compose-label" style={{ color: t.textMuted }}>
              <span style={{ marginRight: 4 }}>📂</span> {__('category')} <span style={{ color: t.danger }}>*</span>
            </label>
            <select
              value={form.category}
              onChange={set("category")}
              className="compose-select"
              style={{ background: t.bgInput, color: t.text, border: `1px solid ${t.border}` }}
              onFocus={(e) => e.target.style.borderColor = t.accent}
              onBlur={(e) => e.target.style.borderColor = t.border}
            >
              <option value="">{__('selectCategory')}</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="compose-section">
            <label className="compose-label" style={{ color: t.textMuted }}>
              <span style={{ marginRight: 4 }}>📌</span> {__('title')} <span style={{ color: t.danger }}>*</span>
            </label>
            <input
              value={form.title}
              onChange={set("title")}
              placeholder={__('titlePlaceholder')}
              className="compose-field"
              style={{ background: t.bgInput, color: t.text, border: `1px solid ${t.border}` }}
              onFocus={(e) => e.target.style.borderColor = t.accent}
              onBlur={(e) => e.target.style.borderColor = t.border}
            />
          </div>

          {/* Body */}
          <div className="compose-section">
            <label className="compose-label" style={{ color: t.textMuted }}>
              <span style={{ marginRight: 4 }}>💬</span> {__('content')} <span style={{ color: t.danger }}>*</span>
            </label>
            <textarea
              value={form.body}
              onChange={set("body")}
              placeholder={__('contentPlaceholder')}
              className="compose-field"
              style={{ height: 120, resize: "vertical", background: t.bgInput, color: t.text, border: `1px solid ${t.border}` }}
              onFocus={(e) => e.target.style.borderColor = t.accent}
              onBlur={(e) => e.target.style.borderColor = t.border}
            />
          </div>

          {/* Row: risk + governorate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label className="compose-label" style={{ color: t.textMuted }}>
                <span style={{ marginRight: 4 }}>⚠️</span> {__('riskLevel')}
              </label>
              <select
                value={form.risk_level}
                onChange={set("risk_level")}
                className="compose-select"
                style={{ background: t.bgInput, color: t.text, border: `1px solid ${t.border}`, borderLeft: `3px solid ${RISK_LEVELS.find(r => r.value === form.risk_level)?.color || t.textMuted}` }}
                onFocus={(e) => e.target.style.borderColor = t.accent}
                onBlur={(e) => e.target.style.borderColor = t.border}
              >
                {RISK_LEVELS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="compose-label" style={{ color: t.textMuted }}>
                <span style={{ marginRight: 4 }}>📍</span> {__('governorate')}
              </label>
              <select
                value={form.governorate}
                onChange={set("governorate")}
                className="compose-select"
                style={{ background: t.bgInput, color: t.text, border: `1px solid ${t.border}` }}
                onFocus={(e) => e.target.style.borderColor = t.accent}
                onBlur={(e) => e.target.style.borderColor = t.border}
              >
                <option value="">{__('allGovernorates')}</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Media Upload */}
          <div className="compose-section">
            <label className="compose-label" style={{ color: t.textMuted }}>
              <span style={{ marginRight: 4 }}>📎</span> {__('photosVideos')} ({mediaFiles.length}/{MAX_FILES})
            </label>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? t.accent : t.border}`,
                borderRadius: 16,
                padding: mediaFiles.length > 0 ? 12 : 28,
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? t.accentBg : t.bgMuted,
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
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 14, color: t.textSecondary, fontWeight: 600 }}>
                    {__('dragDropHere')}
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                    {__('clickBrowse')}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: t.textMuted }}>
                  {__('clickDropMore')}
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
                      borderRadius: 12,
                      overflow: "hidden",
                      background: t.bgMuted,
                      border: mf.error ? `1px solid ${t.dangerBorder}` : `1px solid ${t.border}`,
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
                        color: t.danger,
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
                        <div style={{ textAlign: "center", color: t.danger, fontSize: 10 }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>❌</div>
                          {mf.error}
                        </div>
                      </div>
                    ) : mf.type === "video" ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: t.bg }}>
                        {mf.url ? (
                          <video src={mf.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                        ) : (
                          <div style={{ fontSize: 32, color: t.textMuted }}>🎬</div>
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
                          borderTopColor: t.accent,
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
                        background: `${t.accent}cc`,
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
                      padding: "4px 8px",
                      fontSize: 9,
                      color: t.textMuted,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      background: t.bg,
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
                padding: "14px 16px",
                borderRadius: 12,
                fontSize: 13,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: aiStatus.approved ? t.accentBg : t.dangerBg,
                border: `1px solid ${aiStatus.approved ? t.accentBorder : t.dangerBorder}`,
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 18 }}>
                {aiStatus.approved ? "✅" : "❌"}
              </span>
              <div>
                <div style={{ fontWeight: 600, color: aiStatus.approved ? t.accent : t.danger, marginBottom: 4 }}>
                  {aiStatus.approved ? __('approvedByAI') : __('notApproved')}
                </div>
                <div style={{ color: t.textSecondary, fontSize: 12 }}>
                  {aiStatus.reason}
                </div>
              </div>
            </div>
          )}

          {aiStatus === "checking" && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                fontSize: 13,
                background: `${t.accent}10`,
                border: `1px solid ${t.accentBorder}`,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ width: 20, height: 20, border: `2px solid ${t.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: t.accent }}>{__('aiReviewing')}</span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                fontSize: 13,
                background: t.dangerBg,
                border: `1px solid ${t.dangerBorder}`,
                color: t.danger,
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
            padding: "16px 24px",
            borderTop: `1px solid ${t.border}`,
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
            background: t.bgMuted,
          }}
        >
          <button
            onClick={onClose}
            className="compose-btn"
            style={{
              border: `1px solid ${t.border}`,
              background: "transparent",
              color: t.textMuted,
            }}
            onMouseEnter={(e) => { e.target.style.background = t.bgHover; e.target.style.borderColor = t.textMuted; e.target.style.color = t.text; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = t.border; e.target.style.color = t.textMuted; }}
          >
            {__('cancel')}
          </button>

          <button
            onClick={check}
            disabled={aiStatus === "checking" || uploadInProgress}
            className="compose-btn"
            style={{
              border: `1px solid ${t.accent}`,
              background: "transparent",
              color: t.accent,
              opacity: aiStatus === "checking" || uploadInProgress ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (aiStatus !== "checking" && !uploadInProgress) { e.target.style.background = t.accentBg; e.target.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={(e) => { if (aiStatus !== "checking" && !uploadInProgress) { e.target.style.background = "transparent"; e.target.style.transform = "translateY(0)"; } }}
          >
            🤖 {__('checkWithAI')}
          </button>

          <button
            onClick={submit}
            disabled={submitting || !aiStatus || aiStatus === "checking" || !aiStatus.approved || uploadInProgress || hasErrors}
            className="compose-btn"
            style={{
              background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
              color: "white",
              border: "none",
              fontWeight: 600,
              opacity: (submitting || !aiStatus || aiStatus === "checking" || !aiStatus.approved || uploadInProgress || hasErrors) ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!submitting && aiStatus && aiStatus !== "checking" && aiStatus.approved && !uploadInProgress) e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { if (!submitting && aiStatus && aiStatus !== "checking" && aiStatus.approved && !uploadInProgress) e.target.style.transform = "translateY(0)"; }}
          >
            {submitting ? __('publishing') : `📮 ${__('publishFiles')}${uploadedUrls.length > 0 ? ` (${uploadedUrls.length} file${uploadedUrls.length > 1 ? "s" : ""})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
