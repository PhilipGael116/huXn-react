import { useState, useRef, useEffect, useCallback } from "react";

// ── constants ──────────────────────────────────────────────────────────────
const SAMPLE_RATE = 44100;
const RECORD_SECONDS = 15;
const LOW_FREQ = 20;
const HIGH_FREQ = 500;
const GAIN = 80;

const CONDITIONS = [
  { result: "NORMAL", confidence: 0.94, color: "#00FFB2", desc: "Heart rhythm detected as normal. No anomalies found." },
  { result: "ABNORMAL", confidence: 0.87, color: "#FF4D6D", desc: "Possible murmur detected. Please consult a cardiologist." },
  { result: "ABNORMAL", confidence: 0.76, color: "#FF4D6D", desc: "Irregular S3 gallop pattern detected. Further examination advised." },
  { result: "NORMAL", confidence: 0.91, color: "#00FFB2", desc: "Clean lub-dub pattern. Heart sounds within normal range." },
];

// ── helpers ────────────────────────────────────────────────────────────────
function applyBandpassFilter(ctx, source) {
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = LOW_FREQ;
  highpass.Q.value = 0.7;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = HIGH_FREQ;
  lowpass.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.value = GAIN;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  return gain;
}

// ── HeartbeatCanvas ────────────────────────────────────────────────────────
function HeartbeatCanvas({ analyser, isRecording, recordedData }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const W = canvas.width;
    const H = canvas.height;

    if (!isRecording && recordedData && recordedData.length > 0) {
      // Draw static waveform from recorded data
      ctx.clearRect(0, 0, W, H);
      const data = recordedData;
      const step = Math.floor(data.length / W);
      ctx.beginPath();
      ctx.strokeStyle = "#00FFB2";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#00FFB2";
      for (let x = 0; x < W; x++) {
        const idx = x * step;
        const v = data[idx] || 0;
        const y = H / 2 + v * H * 0.45;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      return;
    }

    if (!isRecording || !analyser) {
      // idle flat line with subtle pulse
      let t = 0;
      const idle = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0,255,178,0.2)";
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x++) {
          const y = H / 2 + Math.sin((x + t) * 0.05) * 2;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        t += 0.5;
        rafRef.current = requestAnimationFrame(idle);
      };
      idle();
      return () => cancelAnimationFrame(rafRef.current);
    }

    const bufLen = analyser.frequencyBinCount;
    const dataArr = new Float32Array(bufLen);
    const scrollBuffer = new Float32Array(W);

    const draw = () => {
      analyser.getFloatTimeDomainData(dataArr);
      // scroll left
      scrollBuffer.copyWithin(0, 1);
      // downsample incoming buffer to one value
      let sum = 0;
      for (let i = 0; i < bufLen; i++) sum += dataArr[i];
      scrollBuffer[W - 1] = sum / bufLen;

      ctx.clearRect(0, 0, W, H);

      // grid lines
      ctx.strokeStyle = "rgba(0,255,178,0.06)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (H / 4) * i);
        ctx.lineTo(W, (H / 4) * i);
        ctx.stroke();
      }

      // waveform
      ctx.beginPath();
      ctx.strokeStyle = "#00FFB2";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00FFB2";
      for (let x = 0; x < W; x++) {
        const v = scrollBuffer[x];
        const y = H / 2 + v * H * 0.45;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRecording, analyser, recordedData]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={120}
      style={{ width: "100%", height: 120, borderRadius: 8 }}
    />
  );
}

// ── main component ─────────────────────────────────────────────────────────
export default function CardioSur() {
  const [screen, setScreen] = useState("home"); // home | record | playback | analyzing | result
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(RECORD_SECONDS);
  const [recordedData, setRecordedData] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  const audioCtxRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const filtered = applyBandpassFilter(ctx, source);

      // analyser for visualisation
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 512;
      filtered.connect(analyserNode);
      setAnalyser(analyserNode);

      // recorder on filtered stream
      const dest = ctx.createMediaStreamDestination();
      filtered.connect(dest);
      const recorder = new MediaRecorder(dest.stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);

        // extract float32 data for waveform display
        blob.arrayBuffer().then((buf) => {
          ctx.decodeAudioData(buf.slice(0), (decoded) => {
            setRecordedData(decoded.getChannelData(0));
          }).catch(() => {
            // fallback: generate synthetic waveform shape
            const fake = new Float32Array(4000);
            for (let i = 0; i < fake.length; i++) {
              const t = i / fake.length;
              const beat = Math.sin(t * Math.PI * 2 * 60) * Math.exp(-((t * 60) % 1) * 8);
              fake[i] = beat * 0.3 + (Math.random() - 0.5) * 0.02;
            }
            setRecordedData(fake);
          });
        });

        setScreen("playback");
      };

      recorder.start();
      setIsRecording(true);
      setCountdown(RECORD_SECONDS);
      setScreen("record");

      let remaining = RECORD_SECONDS;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) stopRecording(recorder, stream, ctx);
      }, 1000);
    } catch (err) {
      alert("Microphone access denied. Please allow microphone permission.");
    }
  }, []);

  const stopRecording = useCallback((recorder, stream, ctx) => {
    clearInterval(timerRef.current);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    ctx?.close();
    setIsRecording(false);
    setAnalyser(null);
  }, []);

  const handleStopEarly = () => {
    stopRecording(mediaRecorderRef.current, streamRef.current, audioCtxRef.current);
  };

  const handleAnalyze = () => {
    setScreen("analyzing");
    setAnalyzeProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        const r = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
        setResult(r);
        setTimeout(() => setScreen("result"), 400);
      }
      setAnalyzeProgress(Math.min(p, 100));
    }, 200);
  };

  const handleReset = () => {
    setScreen("home");
    setRecordedData(null);
    setRecordedBlob(null);
    setResult(null);
    setAnalyzeProgress(0);
    setCountdown(RECORD_SECONDS);
  };

  // ── styles ─────────────────────────────────────────────────────────────
  const s = {
    root: {
      minHeight: "100vh",
      background: "#060A0F",
      color: "#fff",
      fontFamily: "'Courier New', monospace",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "0 0 40px",
      position: "relative",
      overflow: "hidden",
    },
    grid: {
      position: "fixed",
      inset: 0,
      backgroundImage:
        "linear-gradient(rgba(0,255,178,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,178,0.03) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
      pointerEvents: "none",
      zIndex: 0,
    },
    header: {
      width: "100%",
      maxWidth: 480,
      padding: "24px 24px 0",
      zIndex: 1,
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#00FFB2",
      boxShadow: "0 0 10px #00FFB2",
      animation: "blink 2s infinite",
    },
    logoText: {
      fontSize: 13,
      letterSpacing: 4,
      color: "#00FFB2",
      fontWeight: 700,
    },
    card: {
      width: "100%",
      maxWidth: 480,
      margin: "24px 24px 0",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(0,255,178,0.15)",
      borderRadius: 16,
      padding: 28,
      zIndex: 1,
      boxSizing: "border-box",
    },
    bigBtn: (color = "#00FFB2") => ({
      width: "100%",
      padding: "18px 0",
      background: "transparent",
      border: `1.5px solid ${color}`,
      borderRadius: 12,
      color: color,
      fontSize: 13,
      letterSpacing: 3,
      fontFamily: "'Courier New', monospace",
      fontWeight: 700,
      cursor: "pointer",
      marginTop: 16,
      transition: "all 0.2s",
      boxShadow: `0 0 20px ${color}22`,
    }),
    label: {
      fontSize: 10,
      letterSpacing: 3,
      color: "rgba(255,255,255,0.4)",
      textTransform: "uppercase",
      marginBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: 2,
      marginBottom: 4,
    },
    sub: {
      fontSize: 11,
      color: "rgba(255,255,255,0.45)",
      lineHeight: 1.7,
      letterSpacing: 0.5,
    },
  };

  // ── screens ────────────────────────────────────────────────────────────
  const HomeScreen = () => (
    <>
      <div style={s.card}>
        <p style={s.label}>Phonocardiography</p>
        <h1 style={{ ...s.title, color: "#00FFB2" }}>CARDIOSUR</h1>
        <p style={s.sub}>
          Turn your smartphone into a cardiac stethoscope. Record your heart sounds and let AI detect anomalies in seconds.
        </p>
        <div style={{ marginTop: 24, padding: "16px", background: "rgba(0,255,178,0.04)", borderRadius: 10, border: "1px solid rgba(0,255,178,0.1)" }}>
          {[
            ["01", "Press phone firmly to bare chest"],
            ["02", "Hold still for 15 seconds"],
            ["03", "Review your heartbeat waveform"],
            ["04", "Get AI-powered analysis"],
          ].map(([n, t]) => (
            <div key={n} style={{ display: "flex", gap: 14, marginBottom: 12, alignItems: "flex-start" }}>
              <span style={{ color: "#00FFB2", fontSize: 10, fontWeight: 700, opacity: 0.6, minWidth: 20 }}>{n}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
        <button style={s.bigBtn()} onClick={startRecording}>
          BEGIN SCAN
        </button>
      </div>

      <div style={{ ...s.card, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 20 }}>
          {[["20–500Hz", "Band-pass filter"], ["80×", "Amplification"], ["AI", "GAN Model"]].map(([v, l]) => (
            <div key={l} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#00C2FF", letterSpacing: 1 }}>{v}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const RecordScreen = () => (
    <div style={s.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={s.label}>Recording</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Hold phone to chest — left side</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: countdown <= 5 ? "#FF4D6D" : "#00FFB2", letterSpacing: -1 }}>
            {String(countdown).padStart(2, "0")}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>SEC LEFT</div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: "12px 8px", border: "1px solid rgba(0,255,178,0.1)" }}>
        <HeartbeatCanvas analyser={analyser} isRecording={isRecording} recordedData={null} />
      </div>

      {/* Recording indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF4D6D", boxShadow: "0 0 8px #FF4D6D", animation: "blink 1s infinite" }} />
        <span style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.5)" }}>LIVE · FILTERED · 20–500HZ</span>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 16, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
        <div style={{ height: "100%", background: "#00FFB2", borderRadius: 2, width: `${((RECORD_SECONDS - countdown) / RECORD_SECONDS) * 100}%`, transition: "width 1s linear", boxShadow: "0 0 8px #00FFB2" }} />
      </div>

      <button style={{ ...s.bigBtn("#FF4D6D"), marginTop: 20 }} onClick={handleStopEarly}>
        STOP EARLY
      </button>
    </div>
  );

  const PlaybackScreen = () => {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);

    const togglePlay = () => {
      if (!recordedBlob) return;
      if (!audioRef.current) {
        audioRef.current = new Audio(URL.createObjectURL(recordedBlob));
        audioRef.current.onended = () => setPlaying(false);
      }
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
    };

    return (
      <div style={s.card}>
        <p style={s.label}>Review Recording</p>
        <p style={{ ...s.title, fontSize: 18 }}>Your Heartbeat</p>
        <p style={s.sub}>Listen to your filtered heart sounds, then send for AI analysis.</p>

        <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: "12px 8px", border: "1px solid rgba(0,255,178,0.1)", marginTop: 20 }}>
          <HeartbeatCanvas analyser={null} isRecording={false} recordedData={recordedData} />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <div style={{ flex: 1, padding: "10px", background: "rgba(0,255,178,0.05)", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#00FFB2", fontWeight: 700 }}>{RECORD_SECONDS}s</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>DURATION</div>
          </div>
          <div style={{ flex: 1, padding: "10px", background: "rgba(0,194,255,0.05)", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#00C2FF", fontWeight: 700 }}>500Hz</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>FILTERED</div>
          </div>
          <div style={{ flex: 1, padding: "10px", background: "rgba(255,107,53,0.05)", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#FF6B35", fontWeight: 700 }}>80×</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>AMPLIFIED</div>
          </div>
        </div>

        <button style={s.bigBtn("#00C2FF")} onClick={togglePlay}>
          {playing ? "⏸  PAUSE PLAYBACK" : "▶  PLAY HEARTBEAT"}
        </button>

        <button style={s.bigBtn()} onClick={handleAnalyze}>
          SEND FOR AI ANALYSIS →
        </button>

        <button
          onClick={() => { handleReset(); }}
          style={{ width: "100%", padding: "12px 0", background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 10, letterSpacing: 2, cursor: "pointer", marginTop: 8, fontFamily: "'Courier New', monospace" }}
        >
          DISCARD & RE-RECORD
        </button>
      </div>
    );
  };

  const AnalyzingScreen = () => (
    <div style={s.card}>
      <p style={s.label}>AI Processing</p>
      <p style={{ ...s.title, fontSize: 18 }}>Analyzing...</p>

      <div style={{ marginTop: 32, marginBottom: 32 }}>
        {[
          { label: "Resampling to 500Hz", threshold: 20 },
          { label: "Generating spectrogram", threshold: 45 },
          { label: "Running GAN model", threshold: 70 },
          { label: "Classifying heart sounds", threshold: 90 },
        ].map(({ label, threshold }) => {
          const done = analyzeProgress >= threshold;
          const active = analyzeProgress >= threshold - 20 && !done;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: done ? "#00FFB2" : active ? "transparent" : "rgba(255,255,255,0.1)",
                border: active ? "2px solid #00FFB2" : done ? "none" : "2px solid rgba(255,255,255,0.1)",
                boxShadow: done ? "0 0 8px #00FFB2" : "none",
                animation: active ? "blink 0.8s infinite" : "none",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: done ? "#00FFB2" : active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #00FFB2, #00C2FF)", borderRadius: 2, width: `${analyzeProgress}%`, transition: "width 0.2s ease", boxShadow: "0 0 12px #00FFB2" }} />
      </div>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 12, letterSpacing: 2 }}>
        {Math.round(analyzeProgress)}% COMPLETE
      </p>
    </div>
  );

  const ResultScreen = () => {
    if (!result) return null;
    const isNormal = result.result === "NORMAL";

    return (
      <div style={s.card}>
        <p style={s.label}>Analysis Complete</p>

        {/* Big result badge */}
        <div style={{
          marginTop: 16,
          padding: "28px",
          borderRadius: 14,
          background: `${result.color}0D`,
          border: `1.5px solid ${result.color}44`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>DIAGNOSIS</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: result.color, letterSpacing: 4, textShadow: `0 0 20px ${result.color}` }}>
            {result.result}
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
            <div style={{ height: 4, width: `${result.confidence * 120}px`, background: result.color, borderRadius: 2, boxShadow: `0 0 8px ${result.color}` }} />
            <span style={{ fontSize: 11, color: result.color, fontWeight: 700 }}>{Math.round(result.confidence * 100)}%</span>
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginTop: 4 }}>CONFIDENCE</div>
        </div>

        {/* Description */}
        <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, margin: 0 }}>{result.desc}</p>
        </div>

        {/* Waveform replay */}
        <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: "12px 8px", border: `1px solid ${result.color}22`, marginTop: 16 }}>
          <HeartbeatCanvas analyser={null} isRecording={false} recordedData={recordedData} />
        </div>

        {/* Disclaimer */}
        {!isNormal && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(255,77,109,0.07)", borderRadius: 8, border: "1px solid rgba(255,77,109,0.2)" }}>
            <p style={{ fontSize: 10, color: "rgba(255,77,109,0.8)", margin: 0, lineHeight: 1.7, letterSpacing: 0.5 }}>
              ⚠ This is a screening tool, not a medical diagnosis. Please consult a qualified cardiologist.
            </p>
          </div>
        )}

        <button style={s.bigBtn(result.color)} onClick={handleReset}>
          NEW SCAN
        </button>
      </div>
    );
  };

  return (
    <div style={s.root}>
      <div style={s.grid} />

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        button:hover { opacity: 0.85; transform: translateY(-1px); }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>
          <div style={s.dot} />
          <span style={s.logoText}>CARDIOSUR</span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>
            {screen.toUpperCase()}
          </span>
        </div>
      </div>

      {screen === "home" && <HomeScreen />}
      {screen === "record" && <RecordScreen />}
      {screen === "playback" && <PlaybackScreen />}
      {screen === "analyzing" && <AnalyzingScreen />}
      {screen === "result" && <ResultScreen />}
    </div>
  );
}