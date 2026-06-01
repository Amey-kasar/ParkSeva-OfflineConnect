(() => {
  const alertsFeed = document.getElementById("alerts-feed");
  const alertPopups = document.getElementById("alert-popups");
  const evidenceGrid = document.getElementById("evidence-grid");
  const statusBadge = document.getElementById("sse-status");
  const knownEvidence = new Set();
  const maxFeedItems = 12;

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  function normalizeSeverity(value) {
    if (!value) return "info";
    const val = value.toString().toLowerCase();
    if (["critical", "high", "medium", "info", "low"].includes(val)) {
      return val === "low" ? "info" : val;
    }
    return "info";
  }

  function formatTimestamp(ts) {
    if (!ts) return timeFormatter.format(new Date());
    const date = new Date(ts * 1000);
    if (Number.isNaN(date.getTime())) {
      return timeFormatter.format(new Date());
    }
    return timeFormatter.format(date);
  }

  function setStatus(state) {
    if (!statusBadge) return;
    const states = {
      connecting: { text: "Connecting…", className: "" },
      live: { text: "Live Feed", className: "" },
      error: { text: "Reconnecting…", className: "error" },
    };
    const next = states[state] || states.connecting;
    statusBadge.textContent = next.text;
    statusBadge.className = `status-badge ${next.className}`.trim();
  }

  function createAlertFeedItem(event) {
    const severityClass = `severity-${normalizeSeverity(event.severity)}`;
    const item = document.createElement("div");
    item.className = `alert-row ${severityClass}`;

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = (event.kind || "Alert").toString().toUpperCase();

    const detail = document.createElement("div");
    detail.className = "detail";
    detail.textContent = event.detail || "";

    const meta = document.createElement("div");
    meta.className = "meta";
    const source = document.createElement("span");
    source.textContent = `Source: ${event.source || "system"}`;
    const time = document.createElement("span");
    time.textContent = formatTimestamp(event.ts);
    meta.append(source, time);

    item.append(title, detail, meta);
    return item;
  }

  function showAlertPopup(event) {
    const card = document.createElement("div");
    card.className = `popup-card severity-${normalizeSeverity(event.severity)}`;

    const header = document.createElement("div");
    header.className = "header";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = (event.kind || "Alert").toString().toUpperCase();
    const time = document.createElement("div");
    time.className = "time";
    time.textContent = formatTimestamp(event.ts);
    header.append(label, time);

    const detail = document.createElement("div");
    detail.className = "detail";
    detail.textContent = event.detail || "";
    card.append(header, detail);

    if (event.extra && event.extra.transcript) {
      const transcript = document.createElement("div");
      transcript.className = "detail";
      transcript.textContent = `Transcript: ${event.extra.transcript}`;
      card.append(transcript);
    } else if (event.extra && event.extra.audio_text) {
      const transcript = document.createElement("div");
      transcript.className = "detail";
      transcript.textContent = `Audio: ${event.extra.audio_text}`;
      card.append(transcript);
    }

    if (event.evidence && event.evidence.id) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = `/api/evidence/${event.evidence.id}?preview=1&v=${Date.now()}`;
      img.alt = event.evidence.filename || "Evidence snapshot";
      card.append(img);
    }

    alertPopups.prepend(card);
    requestAnimationFrame(() => {
      card.classList.add("visible");
    });

    setTimeout(() => {
      card.classList.add("hide");
      setTimeout(() => card.remove(), 400);
    }, 9000);
  }

  function registerEvidence(meta) {
    if (!meta || !meta.id || knownEvidence.has(meta.id)) {
      return;
    }
    knownEvidence.add(meta.id);
    const card = document.createElement("div");
    card.className = "evidence-card";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = `/api/evidence/${meta.id}?v=${Date.now()}`;
    img.alt = meta.filename || "Evidence snapshot";

    const info = document.createElement("div");
    info.className = "evidence-meta";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = meta.filename || meta.id;

    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = meta.stored_at
      ? new Date(meta.stored_at).toLocaleString()
      : "recent";

    const extra = document.createElement("div");
    extra.className = "info";
    const sizeKb =
      typeof meta.size === "number" ? `${Math.round(meta.size / 1024)} KB` : "";
    extra.textContent = [sizeKb, meta.content_type || ""].filter(Boolean).join(" • ");

    info.append(name, timestamp, extra);
    card.append(img, info);

    evidenceGrid.prepend(card);
    if (evidenceGrid.children.length > 24) {
      evidenceGrid.removeChild(evidenceGrid.lastChild);
    }
  }

  function handleAlertEvent(event) {
    const item = createAlertFeedItem(event);
    alertsFeed.prepend(item);
    while (alertsFeed.children.length > maxFeedItems) {
      alertsFeed.removeChild(alertsFeed.lastChild);
    }

    showAlertPopup(event);
    if (event.evidence) {
      registerEvidence(event.evidence);
    }
  }

  function handleEvidenceEvent(event) {
    if (event.evidence) {
      registerEvidence(event.evidence);
    }
  }

  async function loadInitialEvidence() {
    try {
      const res = await fetch("/api/evidence");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const items = await res.json();
      items.forEach(registerEvidence);
    } catch (err) {
      console.error("Failed to load evidence list:", err);
    }
  }

  function initEventStream() {
    setStatus("connecting");
    const source = new EventSource("/api/events");
    source.onopen = () => setStatus("live");
    source.onerror = () => setStatus("error");
    source.onmessage = (evt) => {
      if (!evt.data) return;
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "alert") {
          handleAlertEvent(data);
        } else if (data.type === "evidence") {
          handleEvidenceEvent(data);
        }
      } catch (err) {
        console.error("Invalid SSE payload", err);
      }
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadInitialEvidence();
    initEventStream();
  });
})();
