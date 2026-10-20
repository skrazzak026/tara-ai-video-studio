import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'tara-video-jobs-v1';
const EXAMPLES = [
  { icon: '🌆', title: 'Cyberpunk city', text: 'A cinematic aerial shot flying through a futuristic neon city at night, wet reflective streets, atmospheric fog, ultra-detailed, fluid camera movement.' },
  { icon: '🐉', title: 'Fantasy world', text: 'A beautiful jade dragon soaring through misty mountain peaks at sunrise, intricate scales, soft golden lighting, epic cinematic wide shot.' },
  { icon: '🌊', title: 'Nature documentary', text: 'A slow cinematic tracking shot of an ocean wave rolling toward a black sand beach at golden hour, highly realistic water droplets, peaceful atmosphere.' },
];
function Icon({ name, size = 19 }) {
  const paths = {
    sparkle: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17ZM4 16l.8 1.2L6 18l-1.2.8L4 20l-.8-1.2L2 18l1.2-.8L4 16Z"/></>,
    play: <path d="m8 5 11 7-11 7V5Z"/>,
    arrow: <><path d="m5 12 14 0M13 6l6 6-6 6"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    film: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16m10-16v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    wand: <><path d="m4 20 13-13M14 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM20 14l.6 2 1.4.5-1.4.5-.6 2-.6-2-1.4-.5 1.4-.5.6-2Z"/></>,
    alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4v.1"/></>,
    copy: <><rect x="8" y="7" width="12" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/></>,
    bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7V2Z"/>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.sparkle}</svg>;
}

function readJobs() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.slice(0, 15) : [];
  } catch { return []; }
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('5');
  const [ratio, setRatio] = useState('16:9');
  const [code, setCode] = useState(() => sessionStorage.getItem('tara-beta-access') || '');
  const [showCode, setShowCode] = useState(false);
  const [jobs, setJobs] = useState(readJobs);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const active = jobs.find(j => j.id === selectedId) || jobs[0] || null;
  const pendingIds = useMemo(() => jobs.filter(j => ['IN_QUEUE', 'IN_PROGRESS'].includes(j.status)).map(j => j.id).join('|'), [jobs]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 15))); }, [jobs]);
  useEffect(() => { sessionStorage.setItem('tara-beta-access', code); }, [code]);
  useEffect(() => {
    if (!code || !pendingIds) return;
    let stopped = false;
    async function check() {
      for (const id of pendingIds.split('|')) {
        try {
          const res = await fetch(`/api/status/${encodeURIComponent(id)}`, { headers: { 'X-Access-Code': code } });
          const data = await res.json();
          if (stopped) return;
          if (!res.ok) { if (res.status === 401) setError('Access code rejected. Re-enter your studio access code.'); continue; }
          setJobs(prev => prev.map(job => job.id === id ? { ...job, status: data.status || job.status, videoUrl: data.video_url || job.videoUrl } : job));
        } catch { /* Network failures are temporary; retry at the next polling interval. */ }
      }
    }
    check();
    const poller = setInterval(check, 8500);
    return () => { stopped = true; clearInterval(poller); };
  }, [pendingIds, code]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2600); return () => clearTimeout(id); }, [toast]);

  async function generate(event) {
    event.preventDefault();
    setError('');
    if (!code.trim()) { setError('Enter your studio access code first.'); return; }
    if (prompt.trim().length < 10) { setError('Please describe your video in at least 10 characters.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Code': code.trim() },
        body: JSON.stringify({ prompt: prompt.trim(), duration, aspect_ratio: ratio })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create your video.');
      const job = { id: data.request_id, prompt: prompt.trim(), duration, ratio, status: 'IN_QUEUE', createdAt: Date.now() };
      setJobs(prev => [job, ...prev.filter(p => p.id !== job.id)].slice(0, 15));
      setSelectedId(job.id);
      setToast('Generation queued successfully');
    } catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setSubmitting(false); }
  }
  const statusText = !active ? 'Awaiting your first masterpiece' : active.status === 'COMPLETED' ? 'Your video is ready' : active.status === 'IN_PROGRESS' ? 'Creating your video...' : active.status === 'IN_QUEUE' ? 'In generation queue...' : 'Video generation';

  return <div className="app">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="header shell">
      <a className="brand" href="#top" aria-label="Tara AI Studio home"><span className="brandmark"><Icon name="play" size={23}/></span><span>TARA<span className="brandlight">AI</span><strong> STUDIO</strong></span></a>
      <nav className="nav"><a href="#studio">Create</a><a href="#recent">My creations</a><a href="#how-it-works">How it works</a></nav>
      <a className="topbutton" href="#studio"><Icon name="sparkle" size={17}/> Start creating</a>
    </header>

    <main id="top">
      <section className="hero shell">
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot"/> NEXT-GEN AI VIDEO CREATION <span className="eyebrow-arrow">↗</span></div>
          <h1>Your imagination.<br/><span className="title-gradient">Now in motion.</span></h1>
          <p>Turn words into extraordinary cinematic videos. Describe any scene, pick your format, and bring your ideas to life with AI.</p>
          <div className="hero-pills"><span><Icon name="check" size={16}/> Text to video</span><span><Icon name="check" size={16}/> Cinematic quality</span><span><Icon name="check" size={16}/> Download MP4</span></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="visual-orbit orbit-a"/><div className="visual-orbit orbit-b"/><div className="crystal c1"/><div className="crystal c2"/><div className="crystal c3"/><span className="art-glow"/><div className="hero-play"><Icon name="play" size={33}/></div><div className="art-label"><Icon name="sparkle" size={16}/> MAKE ANYTHING POSSIBLE</div></div>
      </section>

      <section id="studio" className="shell studio-section">
        <div className="section-head"><div><span className="kicker">YOUR CREATIVE WORKSPACE</span><h2>AI Video Studio <span className="h2-spark">✦</span></h2></div><span className="model-chip"><span className="chip-dot"/> Kling 2.5 Turbo Pro</span></div>
        <div className="workspace">
          <form className="editor panel" onSubmit={generate}>
            <div className="panel-title"><span className="icon-box purple"><Icon name="wand" size={20}/></span><div><h3>Create from text</h3><p>Describe what you want to see</p></div></div>
            <label className="form-label" htmlFor="prompt">Your video prompt <span>*</span></label>
            <div className="prompt-wrap"><textarea id="prompt" maxLength={1800} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A breathtaking cinematic shot of a futuristic city at night, neon reflections on wet streets, flying vehicles, dramatic lighting, smooth camera movement..." required/><span className="char-count">{prompt.length} / 1800</span></div>
            <div className="suggestions-heading">NEED INSPIRATION? <span>TRY A PROMPT</span></div>
            <div className="suggestions">{EXAMPLES.map(e => <button key={e.title} type="button" onClick={() => setPrompt(e.text)}><span>{e.icon}</span>{e.title}</button>)}</div>
            <div className="border-line"/>
            <div className="setting-block"><div className="setting-head"><label className="form-label">Video duration</label><span>Choose length</span></div><div className="option-grid two">{['5','10'].map(s => <button type="button" key={s} className={`option ${duration===s?'selected':''}`} onClick={() => setDuration(s)}><Icon name="clock" size={17}/>{s} seconds</button>)}</div></div>
            <div className="setting-block"><div className="setting-head"><label className="form-label">Aspect ratio</label><span>Select frame</span></div><div className="option-grid three">{[['16:9','Landscape'],['9:16','Portrait'],['1:1','Square']].map(([r, name]) => <button type="button" key={r} className={`option ${ratio===r?'selected':''}`} onClick={() => setRatio(r)}><span className={`aspect-icon aspect-${r.replace(':','')}`}/><span>{name}</span><small>{r}</small></button>)}</div></div>
            <div className="border-line"/>
            <div className="code-row"><label className="form-label" htmlFor="code"><Icon name="lock" size={15}/> Private beta access code</label><button className="show-link" onClick={() => setShowCode(x=>!x)} type="button">{showCode?'Hide':'Show'}</button></div>
            <input id="code" autoComplete="off" className="access-input" type={showCode?'text':'password'} value={code} onChange={e => setCode(e.target.value)} placeholder="Enter access code provided by site owner"/>
            <p className="helper-text">Beta access helps prevent unauthorized API charges. Public user accounts and credits can be added later.</p>
            {error && <div className="error-msg"><Icon name="alert" size={16}/>{error}</div>}
            <button type="submit" disabled={submitting} className="generate-btn"><Icon name="sparkle" size={20}/>{submitting?'Sending to AI...':'Generate video'}<Icon name="arrow" size={20}/></button>
            <div className="price-hint"><Icon name="bolt" size={15}/> Estimated AI provider cost: <strong>${duration==='5'?'0.35':'0.70'}</strong> per generation</div>
          </form>

          <div className="result panel"><div className="panel-title"><span className="icon-box pink"><Icon name="film" size={20}/></span><div><h3>Video preview</h3><p>Your creation comes to life here</p></div></div>
            <div className={`preview ${active?.status==='COMPLETED' && active.videoUrl?'with-video':''}`}>
            {active?.status==='COMPLETED' && active.videoUrl ? <video key={active.id} src={active.videoUrl} controls playsInline preload="metadata"/> : <><div className="preview-haze"/><div className="preview-grid"/><div className={`preview-center ${active && active.status!=='COMPLETED'?'busy':''}`}><div className="preview-icon"><Icon name={active?'sparkle':'play'} size={32}/></div><h4>{active ? statusText : 'Your vision starts here'}</h4><p>{active ? 'AI video jobs can take several minutes. This page checks the status automatically.' : 'Write a prompt, adjust your settings, and create something amazing.'}</p>{active && <span className="status-pill"><span className="status-dot"/>{active.status.replaceAll('_',' ')}</span>}</div><span className="preview-corner top-left"/><span className="preview-corner top-right"/><span className="preview-corner bottom-left"/><span className="preview-corner bottom-right"/></>}
            </div>
            <div className="preview-footer"><div className="meta"><span className="meta-label">FORMAT</span><strong>{active?.ratio || ratio}</strong></div><div className="meta"><span className="meta-label">DURATION</span><strong>{active?.duration || duration}s</strong></div><div className="meta"><span className="meta-label">STATUS</span><strong className="accent-text">{active?.status==='COMPLETED'?'Ready':active?'Processing':'Not started'}</strong></div></div>
            {active?.status==='COMPLETED' && active.videoUrl ? <a className="download-btn" href={active.videoUrl} target="_blank" rel="noreferrer"><Icon name="download" size={18}/> Open / download MP4 <Icon name="arrow" size={17}/></a> : <div className="tip"><Icon name="sparkle" size={17}/><p><strong>Pro tip:</strong> Include camera angles, lighting, motion, and style in your prompt for better results.</p></div>}
          </div>
        </div>
      </section>

      <section className="shell recent-section" id="recent"><div className="section-head"><div><span className="kicker">YOUR CREATIVE JOURNEY</span><h2>Recent generations</h2></div><span className="record-counter">{jobs.length} saved in this browser</span></div>
      {jobs.length===0?<div className="empty-state"><div className="empty-icon"><Icon name="film" size={25}/></div><h3>Your gallery is waiting</h3><p>Your recent video generations will appear here.</p></div>:
        <div className="jobs-grid">{jobs.map(job=><button key={job.id} className={`job-card ${active?.id===job.id?'active':''}`} onClick={()=>{setSelectedId(job.id);document.getElementById('studio')?.scrollIntoView({behavior:'smooth'})}}><div className="job-thumbnail">{job.videoUrl ? <video src={job.videoUrl} muted preload="metadata"/>:<Icon name="film" size={28}/>}<span className="job-tag">{job.status==='COMPLETED'?'READY':job.status.replaceAll('_',' ')}</span></div><div className="job-description">{job.prompt}</div><div className="job-meta">{job.duration}s · {job.ratio} <span>{new Date(job.createdAt).toLocaleDateString()}</span></div></button>)}</div>}
      </section>
      <section className="shell how-section" id="how-it-works"><div><span className="kicker">JUST THREE STEPS</span><h2>From words to wow.</h2><p>No editing timeline. No complex tools. Your imagination does the directing.</p></div><div className="steps"><div><span>01</span><h3>Describe your idea</h3><p>Write a detailed scene prompt.</p></div><div><span>02</span><h3>Let AI do its magic</h3><p>Our video model brings it to life.</p></div><div><span>03</span><h3>Save your creation</h3><p>Preview and download your MP4.</p></div></div></section>
    </main>
    <footer className="footer shell"><span>© {new Date().getFullYear()} Tara AI Studio</span><span>Powered by Kling via fal.ai · Private beta</span></footer>
    {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
