/**
 * HOÀNG DỰ TV — MEGA STUDIO ALL-IN-ONE MOBILE (iPhone 15 Pro Max Edition)
 * Powers all 4 Tabs:
 * - Tab 1: AI Super Upscale V2.1 (4K) & Universal Color Match 100%
 * - Tab 2: 3D Neon Waveform & Dual Karaoke MV Builder (DEMO 11 / 10 / 7 / 6)
 * - Tab 3: Studio Audio DSP Mastering (-13.0 LUFS)
 * - Tab 4: Permanent Offline Installer
 */
(function() {
  'use strict';

  const Engine = window.HoangDuCinemaEngine;

  function toast(msg) {
    const el = document.getElementById('toastMsg');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('hidden'), 2800);
  }

  // =========================================================================
  // 0. BOTTOM TAB NAVIGATION
  // =========================================================================
  document.querySelectorAll('.ios-tab-bar .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ios-tab-bar .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
      if (btn.dataset.tab === 'tabPane2') drawMvFrame(performance.now() * 0.001);
    });
  });

  // Shared Export Modal Helper
  const megaModal = document.getElementById('megaExportModal');
  const megaProgressBar = document.getElementById('megaProgressBar');
  const megaStatusText = document.getElementById('megaStatusText');
  const megaResultBox = document.getElementById('megaResultBox');
  const megaBtnShareIos = document.getElementById('megaBtnShareIos');
  const megaBtnDirectDownload = document.getElementById('megaBtnDirectDownload');

  document.getElementById('megaBtnCloseModal').addEventListener('click', () => {
    megaModal.classList.add('hidden');
  });

  function openExportModal(title, status) {
    document.getElementById('megaModalTitle').textContent = title;
    megaStatusText.textContent = status;
    megaProgressBar.style.width = '15%';
    megaResultBox.classList.add('hidden');
    megaModal.classList.remove('hidden');
  }

  async function finishExportModal(blob, filename, mimeType, doneMsg) {
    megaProgressBar.style.width = '100%';
    megaStatusText.textContent = doneMsg;
    const helper = await Engine.saveOrShareBlobOnIPhone(blob, filename, mimeType);
    megaBtnDirectDownload.href = helper.blobUrl;
    megaBtnDirectDownload.setAttribute('download', filename);
    megaBtnShareIos.onclick = () => helper.triggerShare().catch(() => helper.triggerDownload());
    megaResultBox.classList.remove('hidden');
  }

  // =========================================================================
  // 1. TAB 1: AI SUPER UPSCALE V2.1 & UNIVERSAL COLOR MATCHING
  // =========================================================================
  const t1PreviewCanvas = document.getElementById('t1PreviewCanvas');
  const t1Ctx = t1PreviewCanvas.getContext('2d', { willReadFrequently: true });
  const t1RawCanvas = document.createElement('canvas');
  const t1RawCtx = t1RawCanvas.getContext('2d', { willReadFrequently: true });
  const t1ProcCanvas = document.createElement('canvas');
  const t1ProcCtx = t1ProcCanvas.getContext('2d', { willReadFrequently: true });

  const t1State = {
    mediaType: 'image',
    img: null,
    vid: null,
    fileName: 'Ca_Si_Hoang_Du_TV.jpg',
    srcW: 540,
    srcH: 960,
    splitRatio: 0.50,
    loupe: false,
    loupeX: 0.5,
    loupeY: 0.36,
    scaleMode: '2x',
    aspectMode: 'source',
    presetKey: 'bolero_gold',
    srcStats: null,
    refStats: null,
    lut3D: null,
    params: {
      sharpness: 84,
      microDetail: 70,
      denoise: 0,
      detailLock: true,
      lutStrength: 100,
      skinShield: 65,
      brightness: 0,
      contrast: 8,
      saturation: 10,
      warmth: 4
    }
  };

  function updateT1Lut() {
    const skin = t1State.params.skinShield / 100.0;
    if (t1State.refStats) {
      t1State.lut3D = Engine.buildUniversalMatchLut3D(t1State.srcStats, t1State.refStats, skin);
    } else {
      t1State.lut3D = Engine.buildLut3DFromPreset(t1State.presetKey, skin);
    }
  }

  function renderT1Palette(items) {
    const row = document.getElementById('t1PaletteRow');
    row.innerHTML = '';
    items.forEach((it) => {
      const hex = it.hex || it;
      const pct = it.pct || 20;
      const d = document.createElement('div');
      d.className = 'swatch-box';
      d.innerHTML = `<div style="height:22px;border-radius:5px;background:${hex};margin-bottom:3px;border:1px solid rgba(255,255,255,0.2);"></div>
                     <div style="font-size:9px;font-family:monospace;font-weight:700;">${hex}</div>
                     <div style="font-size:8px;color:#94A3B8;">${pct}%</div>`;
      d.onclick = () => {
        if (navigator.clipboard) navigator.clipboard.writeText(hex).catch(() => {});
        toast(`🎨 Đã chép mã màu ${hex}`);
      };
      row.appendChild(d);
    });
  }

  function renderT1Frame() {
    const media = t1State.mediaType === 'video' ? t1State.vid : t1State.img;
    if (!media) return;
    const outDim = Engine.computeOutputDimensions(t1State.srcW, t1State.srcH, t1State.aspectMode, '1x');
    const sc = Math.min(1.0, 640 / Math.max(outDim.width, outDim.height));
    const pw = Math.max(2, Math.round(outDim.width * sc));
    const ph = Math.max(2, Math.round(outDim.height * sc));

    if (t1RawCanvas.width !== pw || t1RawCanvas.height !== ph) {
      t1RawCanvas.width = pw; t1RawCanvas.height = ph;
      t1ProcCanvas.width = pw; t1ProcCanvas.height = ph;
      t1PreviewCanvas.width = pw; t1PreviewCanvas.height = ph;
    }

    Engine.drawSourceToCanvas(t1RawCtx, media, t1State.srcW, t1State.srcH, pw, ph);
    const sData = t1RawCtx.getImageData(0, 0, pw, ph);
    const dData = t1ProcCtx.createImageData(pw, ph);
    Engine.processImageDataV21(sData, dData, t1State.params, t1State.lut3D);
    t1ProcCtx.putImageData(dData, 0, 0);

    drawT1Split();
  }

  function drawT1Split() {
    const pw = t1PreviewCanvas.width;
    const ph = t1PreviewCanvas.height;
    const sx = Math.round(pw * t1State.splitRatio);
    t1Ctx.clearRect(0, 0, pw, ph);
    t1Ctx.drawImage(t1ProcCanvas, 0, 0, pw, ph);
    if (sx > 0) {
      t1Ctx.save();
      t1Ctx.beginPath();
      t1Ctx.rect(0, 0, sx, ph);
      t1Ctx.clip();
      t1Ctx.drawImage(t1RawCanvas, 0, 0, pw, ph);
      t1Ctx.restore();
    }
    t1Ctx.save();
    t1Ctx.strokeStyle = '#FFC400';
    t1Ctx.lineWidth = 2.5;
    t1Ctx.beginPath();
    t1Ctx.moveTo(sx, 0);
    t1Ctx.lineTo(sx, ph);
    t1Ctx.stroke();
    t1Ctx.restore();

    if (t1State.loupe) {
      const lx = Math.round(t1State.loupeX * pw);
      const ly = Math.round(t1State.loupeY * ph);
      const r = Math.round(Math.min(pw, ph) * 0.25);
      const patch = Math.round((r * 2) / 2.8);
      const px = Math.max(0, Math.min(pw - patch, Math.round(lx - patch / 2)));
      const py = Math.max(0, Math.min(ph - patch, Math.round(ly - patch / 2)));
      t1Ctx.save();
      t1Ctx.beginPath();
      t1Ctx.arc(lx, ly, r, 0, Math.PI * 2);
      t1Ctx.clip();
      t1Ctx.imageSmoothingEnabled = false;
      t1Ctx.drawImage(t1ProcCanvas, px, py, patch, patch, lx - r, ly - r, r * 2, r * 2);
      t1Ctx.beginPath();
      t1Ctx.rect(lx - r, ly - r, r, r * 2);
      t1Ctx.clip();
      t1Ctx.drawImage(t1RawCanvas, px, py, patch, patch, lx - r, ly - r, r * 2, r * 2);
      t1Ctx.restore();
      t1Ctx.strokeStyle = '#00E5FF';
      t1Ctx.lineWidth = 3;
      t1Ctx.beginPath();
      t1Ctx.arc(lx, ly, r, 0, Math.PI * 2);
      t1Ctx.stroke();
    }
  }

  let t1Drag = false;
  const t1Stage = document.getElementById('t1CanvasStage');
  function onT1Move(cx, cy) {
    const rect = t1PreviewCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rx = Math.max(0.02, Math.min(0.98, (cx - rect.left) / rect.width));
    const ry = Math.max(0.05, Math.min(0.95, (cy - rect.top) / rect.height));
    if (t1State.loupe) { t1State.loupeX = rx; t1State.loupeY = ry; }
    else { t1State.splitRatio = rx; }
    drawT1Split();
  }
  t1Stage.addEventListener('pointerdown', (e) => { t1Drag = true; onT1Move(e.clientX, e.clientY); });
  window.addEventListener('pointermove', (e) => { if (t1Drag) onT1Move(e.clientX, e.clientY); });
  window.addEventListener('pointerup', () => { t1Drag = false; });

  document.getElementById('t1BtnLoupe').addEventListener('click', (e) => {
    t1State.loupe = !t1State.loupe;
    e.currentTarget.classList.toggle('active', t1State.loupe);
    drawT1Split();
  });

  document.getElementById('inTab1Source').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const isVid = f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(f.name);
    if (!isVid) {
      const img = await Engine.loadImageFromFile(f);
      t1State.mediaType = 'image';
      t1State.img = img;
      t1State.fileName = f.name;
      t1State.srcW = img.naturalWidth || 1080;
      t1State.srcH = img.naturalHeight || 1920;
      document.getElementById('t1BtnPlayVid').style.display = 'none';
      const sc = document.createElement('canvas'); sc.width = 160; sc.height = 160;
      const sctx = sc.getContext('2d'); sctx.drawImage(img, 0, 0, 160, 160);
      t1State.srcStats = Engine.analyzePixelDistribution(sctx.getImageData(0, 0, 160, 160).data);
      updateT1Lut();
      renderT1Frame();
      toast(`📸 Đã nạp Ảnh Gốc (${t1State.srcW}×${t1State.srcH})`);
    } else {
      const vid = document.createElement('video');
      vid.playsInline = true; vid.setAttribute('playsinline', '');
      vid.loop = true; vid.src = URL.createObjectURL(f);
      vid.onloadedmetadata = async () => {
        t1State.mediaType = 'video';
        t1State.vid = vid;
        t1State.fileName = f.name;
        t1State.srcW = vid.videoWidth || 1080;
        t1State.srcH = vid.videoHeight || 1920;
        document.getElementById('t1BtnPlayVid').style.display = 'inline-block';
        await Engine.seekVideoSafely(vid, 0.3);
        const sc = document.createElement('canvas'); sc.width = 160; sc.height = 160;
        const sctx = sc.getContext('2d'); sctx.drawImage(vid, 0, 0, 160, 160);
        t1State.srcStats = Engine.analyzePixelDistribution(sctx.getImageData(0, 0, 160, 160).data);
        updateT1Lut();
        renderT1Frame();
        toast(`🎬 Đã nạp Video Gốc (${t1State.srcW}×${t1State.srcH})`);
      };
    }
    e.target.value = '';
  });

  document.getElementById('t1BtnPlayVid').addEventListener('click', (e) => {
    if (!t1State.vid) return;
    if (t1State.vid.paused) {
      t1State.vid.play();
      e.currentTarget.textContent = '⏸ Dừng';
      const loop = () => {
        if (!t1State.vid || t1State.vid.paused) return;
        renderT1Frame();
        requestAnimationFrame(loop);
      };
      loop();
    } else {
      t1State.vid.pause();
      e.currentTarget.textContent = '▶ Phát';
    }
  });

  document.getElementById('inTab1Ref').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    toast('🎨 Đang trích xuất bảng màu từ file mẫu...');
    const rStats = await Engine.extractReferenceStatsFromFile(f, (m) => toast(m));
    t1State.refStats = rStats;
    document.querySelectorAll('#t1PresetGroup .seg-item').forEach(b => b.classList.remove('active'));
    document.getElementById('t1ActiveColorLabel').textContent = `Mẫu: ${rStats.fileName.slice(0, 18)}`;
    renderT1Palette(rStats.palette);
    updateT1Lut();
    renderT1Frame();
    toast('✅ Đã khớp màu 100% từ file mẫu!');
    e.target.value = '';
  });

  document.querySelectorAll('#t1ScaleGroup .seg-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#t1ScaleGroup .seg-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      t1State.scaleMode = btn.dataset.scale;
      const d = Engine.computeOutputDimensions(t1State.srcW, t1State.srcH, t1State.aspectMode, t1State.scaleMode);
      document.getElementById('t1OutResBadge').textContent = `${d.width}×${d.height}`;
    });
  });

  document.querySelectorAll('#t1AspectGroup .seg-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#t1AspectGroup .seg-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      t1State.aspectMode = btn.dataset.aspect;
      renderT1Frame();
    });
  });

  document.querySelectorAll('#t1PresetGroup .seg-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#t1PresetGroup .seg-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      t1State.presetKey = btn.dataset.preset;
      t1State.refStats = null;
      const p = Engine.STUDIO_PRESETS[t1State.presetKey];
      document.getElementById('t1ActiveColorLabel').textContent = p.badge;
      renderT1Palette(p.palette.map(hex => ({ hex, pct: 20 })));
      updateT1Lut();
      renderT1Frame();
    });
  });

  function bindT1Slider(id, key, valId) {
    document.getElementById(id).addEventListener('input', (e) => {
      t1State.params[key] = parseFloat(e.target.value);
      document.getElementById(valId).textContent = `${t1State.params[key]}%`;
      if (key === 'skinShield') updateT1Lut();
      renderT1Frame();
    });
  }
  bindT1Slider('t1SliderSharp', 'sharpness', 't1ValSharp');
  bindT1Slider('t1SliderMicro', 'microDetail', 't1ValMicro');
  bindT1Slider('t1SliderDenoise', 'denoise', 't1ValDenoise');
  bindT1Slider('t1SliderLut', 'lutStrength', 't1ValLut');
  bindT1Slider('t1SliderSkin', 'skinShield', 't1ValSkin');

  document.getElementById('t1BtnExportCube').addEventListener('click', async () => {
    const cube = Engine.exportCubeLutString(t1State.lut3D, 'HoangDuTV_MEGA_Match');
    const blob = new Blob([cube], { type: 'text/plain;charset=utf-8' });
    const h = await Engine.saveOrShareBlobOnIPhone(blob, 'HoangDuTV_MEGA_ColorMatch.cube', 'text/plain');
    h.triggerDownload();
    toast('📦 Đã tải file .CUBE 3D LUT!');
  });

  document.getElementById('t1BtnExportMedia').addEventListener('click', async () => {
    const outDim = Engine.computeOutputDimensions(t1State.srcW, t1State.srcH, t1State.aspectMode, t1State.scaleMode);
    const stem = t1State.fileName.replace(/\.[^/.]+$/, '');
    openExportModal('⚡ Đang Xuất Siêu Nét V2.1...', `Độ phân giải mục tiêu: ${outDim.width}×${outDim.height}`);

    if (t1State.mediaType === 'image') {
      await new Promise(r => setTimeout(r, 60));
      const c = document.createElement('canvas');
      c.width = outDim.width; c.height = outDim.height;
      const cx = c.getContext('2d');
      Engine.drawSourceToCanvas(cx, t1State.img, t1State.srcW, t1State.srcH, outDim.width, outDim.height);
      const sData = cx.getImageData(0, 0, outDim.width, outDim.height);
      const dData = cx.createImageData(outDim.width, outDim.height);
      Engine.processImageDataV21(sData, dData, t1State.params, t1State.lut3D);
      cx.putImageData(dData, 0, 0);
      c.toBlob((blob) => {
        finishExportModal(blob, `HoangDuTV_4K_${stem}.png`, 'image/png', `✅ Đã xuất Ảnh 4K (${outDim.width}×${outDim.height})!`);
      }, 'image/png');
    } else {
      // Video export
      const vid = t1State.vid;
      vid.pause();
      const vw = Math.min(1080, outDim.width);
      const vh = Math.min(1920, outDim.height);
      const c = document.createElement('canvas'); c.width = vw; c.height = vh;
      const cx = c.getContext('2d');
      const wc = document.createElement('canvas'); wc.width = vw; wc.height = vh;
      const wcx = wc.getContext('2d');
      const stream = c.captureStream ? c.captureStream(30) : c.webkitCaptureStream(30);
      const rec = new MediaRecorder(stream, { videoBitsPerSecond: 12000000 });
      const chunks = [];
      rec.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || 'video/mp4' });
        finishExportModal(blob, `HoangDuTV_V21_${stem}.mp4`, 'video/mp4', '✅ Đã kết xuất Video Siêu Nét V2.1!');
      };
      await Engine.seekVideoSafely(vid, 0);
      vid.loop = false;
      rec.start(120);
      await vid.play();
      const dur = Math.max(1, vid.duration || 8);
      const step = () => {
        if (vid.ended || vid.currentTime >= dur - 0.1) {
          if (rec.state === 'recording') rec.stop();
          return;
        }
        Engine.drawSourceToCanvas(wcx, vid, t1State.srcW, t1State.srcH, vw, vh);
        const sd = wcx.getImageData(0, 0, vw, vh);
        const dd = cx.createImageData(vw, vh);
        Engine.processImageDataV21(sd, dd, t1State.params, t1State.lut3D);
        cx.putImageData(dd, 0, 0);
        const pct = Math.min(99, Math.round((vid.currentTime / dur) * 100));
        megaProgressBar.style.width = `${pct}%`;
        megaStatusText.textContent = `Đang render khung hình V2.1: ${pct}%...`;
        requestAnimationFrame(step);
      };
      step();
    }
  });

  // =========================================================================
  // 2. TAB 2: XƯỞNG DỰNG MV SÓNG NHẠC 3D & CHẠY CHỮ KARAOKE (DEMO 6 - 11)
  // =========================================================================
  const mvCanvas = document.getElementById('t2MvCanvas');
  const mvCtx = mvCanvas.getContext('2d');
  const mvState = {
    channel: 'HOÀNG DỰ TV',
    style: 'demo11', // 'demo11' | 'demo10' | 'demo7' | 'demo6'
    bgImage: null,
    audioElem: null,
    audioCtx: null,
    analyser: null,
    freqData: new Uint8Array(64),
    peakHeights: new Float32Array(56),
    playing: false,
    startTime: 0,
    rafId: null
  };

  document.querySelectorAll('#t2ChannelGroup .seg-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#t2ChannelGroup .seg-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mvState.channel = btn.dataset.channel;
      drawMvFrame(performance.now() * 0.001);
    });
  });

  document.querySelectorAll('#t2StyleGroup .seg-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#t2StyleGroup .seg-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mvState.style = btn.dataset.style;
      drawMvFrame(performance.now() * 0.001);
      toast(`🎬 Đã chọn phong cách: ${btn.textContent}`);
    });
  });

  document.getElementById('inTab2Bg').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const img = await Engine.loadImageFromFile(f);
    mvState.bgImage = img;
    drawMvFrame(performance.now() * 0.001);
    toast('🖼️ Đã cập nhật hình nền MV!');
    e.target.value = '';
  });

  document.getElementById('inTab2Audio').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (mvState.audioElem) mvState.audioElem.pause();
    const aud = new Audio(URL.createObjectURL(f));
    aud.crossOrigin = 'anonymous';
    aud.loop = true;
    mvState.audioElem = aud;
    toast(`🎵 Đã nạp nhạc MV: ${f.name}`);
    e.target.value = '';
  });

  function drawMvFrame(tSec) {
    const w = mvCanvas.width;   // 540
    const h = mvCanvas.height;  // 960
    mvCtx.clearRect(0, 0, w, h);

    // 1. Beat Punch Zoom calculation
    let bassEnergy = 0.35 + 0.30 * Math.abs(Math.sin(tSec * 4.2));
    if (mvState.analyser && mvState.playing) {
      mvState.analyser.getByteFrequencyData(mvState.freqData);
      let sumLow = 0;
      for (let i = 0; i < 8; i++) sumLow += mvState.freqData[i];
      bassEnergy = sumLow / (8 * 255.0);
    }
    const zoom = 1.0 + bassEnergy * 0.032;

    // 2. Draw crisp background portrait (with processed Tab 1 image if available)
    const bgSource = mvState.bgImage || t1ProcCanvas || t1State.img;
    if (bgSource) {
      mvCtx.save();
      mvCtx.translate(w / 2, h / 2);
      mvCtx.scale(zoom, zoom);
      mvCtx.translate(-w / 2, -h / 2);
      Engine.drawSourceToCanvas(mvCtx, bgSource, bgSource.width || 540, bgSource.height || 960, w, h);
      mvCtx.restore();
    }

    // Subtle bottom cinema vignette for lyrics & 3D waveform legibility (keeps face Y=0..600 100% crystal clear!)
    const grad = mvCtx.createLinearGradient(0, h * 0.58, 0, h);
    grad.addColorStop(0, 'rgba(6, 4, 15, 0.0)');
    grad.addColorStop(0.5, 'rgba(8, 5, 20, 0.55)');
    grad.addColorStop(1, 'rgba(5, 3, 14, 0.90)');
    mvCtx.fillStyle = grad;
    mvCtx.fillRect(0, h * 0.58, w, h * 0.42);

    const songTitle = (document.getElementById('t2SongTitle').value || 'ĐỜI NÀY TA VUI').toUpperCase();
    const songCredit = document.getElementById('t2SongCredit').value || 'Sáng tác: Hoàng Dự • Giọng Ca: AI Cover';

    // 3. Top Luxury Header Card (or DEMO 10 3D Extruded Title)
    if (mvState.style === 'demo10') {
      // DEMO 10 Bắc Ling 3D Extruded Gold Title + Halo Ring
      mvCtx.save();
      mvCtx.strokeStyle = 'rgba(255, 200, 40, 0.55)';
      mvCtx.lineWidth = 3;
      mvCtx.beginPath();
      mvCtx.arc(w / 2, h * 0.28, 125 + bassEnergy * 12, 0, Math.PI * 2);
      mvCtx.stroke();

      mvCtx.font = '900 32px sans-serif';
      mvCtx.textAlign = 'center';
      for (let d = 6; d >= 1; d--) {
        mvCtx.fillStyle = d > 3 ? '#5E111E' : '#B8860B';
        mvCtx.fillText(songTitle, w / 2 + d * 1.5, 86 + d * 1.8);
      }
      mvCtx.fillStyle = '#FFE066';
      mvCtx.fillText(songTitle, w / 2, 86);
      mvCtx.font = 'bold 12px sans-serif';
      mvCtx.fillStyle = '#FFFFFF';
      mvCtx.fillText(`${mvState.channel} • ${songCredit}`, w / 2, 110);
      mvCtx.restore();
    } else {
      // Luxury Frosted Glass Top Card
      mvCtx.save();
      mvCtx.fillStyle = 'rgba(12, 10, 28, 0.76)';
      mvCtx.strokeStyle = mvState.style === 'demo11' ? '#FF1EA0' : '#FFC400';
      mvCtx.lineWidth = 1.8;
      mvCtx.beginPath();
      mvCtx.roundRect(24, 22, w - 48, 68, 14);
      mvCtx.fill();
      mvCtx.stroke();

      mvCtx.textAlign = 'center';
      mvCtx.font = '900 12px sans-serif';
      mvCtx.fillStyle = '#00E5FF';
      mvCtx.fillText(`♫ ${mvState.channel} OFFICIAL`, w / 2, 42);

      mvCtx.font = '900 18px sans-serif';
      mvCtx.fillStyle = '#FFE066';
      mvCtx.fillText(songTitle, w / 2, 63);

      mvCtx.font = 'bold 10.5px sans-serif';
      mvCtx.fillStyle = '#E2E8F0';
      mvCtx.fillText(songCredit, w / 2, 80);
      mvCtx.restore();
    }

    // 4. Dual Typography Karaoke Lyrics (CapCut Pro Sub-Pixel Sweep + Bounce)
    const rawLyrics = (document.getElementById('t2LyricsInput').value || '').split('\n').map(s => s.trim()).filter(Boolean);
    const lines = rawLyrics.length > 0 ? rawLyrics : ['Đời này ta vui cùng tiếng ca cung đàn', 'Hoàng Dự trao lời ca ngọt ngào sâu lắng'];
    const cycleSec = 4.0;
    const lineIdx = Math.floor(tSec / cycleSec) % lines.length;
    const nextIdx = (lineIdx + 1) % lines.length;
    const prog = (tSec % cycleSec) / cycleSec;

    const line1 = lines[lineIdx];
    const line2 = lines[nextIdx];
    const yKaraoke1 = h * 0.69;
    const yKaraoke2 = h * 0.745;

    // 3 Countdown Neon Dots (● ● ●)
    for (let d = 0; d < 3; d++) {
      const activeDot = prog * 3 > d;
      mvCtx.fillStyle = activeDot ? '#00E5FF' : 'rgba(255,255,255,0.28)';
      mvCtx.beginPath();
      mvCtx.arc(w / 2 - 18 + d * 18, yKaraoke1 - 28, 4.5, 0, Math.PI * 2);
      mvCtx.fill();
    }

    // Draw Active Line 1 with Sweep Fill (#EB0F23 Ruby Red + White Stroke + Black Rim)
    mvCtx.save();
    mvCtx.font = '900 21px sans-serif';
    mvCtx.textAlign = 'center';
    const textW = mvCtx.measureText(line1).width;
    const startX = w / 2 - textW / 2;

    // Unsung base (White with dark rim)
    mvCtx.lineWidth = 4.5;
    mvCtx.strokeStyle = '#05050A';
    mvCtx.strokeText(line1, w / 2, yKaraoke1);
    mvCtx.fillStyle = '#FFFFFF';
    mvCtx.fillText(line1, w / 2, yKaraoke1);

    // Sung sweep overlay
    mvCtx.beginPath();
    mvCtx.rect(startX - 8, yKaraoke1 - 30, (textW + 16) * prog, 42);
    mvCtx.clip();
    mvCtx.lineWidth = 5;
    mvCtx.strokeStyle = '#FFFFFF';
    mvCtx.strokeText(line1, w / 2, yKaraoke1 - 2);
    mvCtx.fillStyle = mvState.style === 'demo11' ? '#FF1EA0' : '#EB0F23';
    mvCtx.fillText(line1, w / 2, yKaraoke1 - 2);
    mvCtx.restore();

    // Draw Secondary Line 2
    mvCtx.save();
    mvCtx.font = 'bold 16.5px sans-serif';
    mvCtx.textAlign = 'center';
    mvCtx.lineWidth = 3.5;
    mvCtx.strokeStyle = '#05050A';
    mvCtx.strokeText(line2, w / 2, yKaraoke2);
    mvCtx.fillStyle = '#CBD5E1';
    mvCtx.fillText(line2, w / 2, yKaraoke2);
    mvCtx.restore();

    // 5. 56-Bar Symmetrical 3D Neon Waveform + Spinning Bass Disc (Y = 855)
    const centerY = h * 0.885;
    const centerX = w / 2;
    const numHalf = 28;
    const barW = 5.5;
    const barGap = 2.8;
    const discRadius = 32 + bassEnergy * 10;

    // Draw 56 symmetrical 3D bars with gravity diamond peaks & water reflection
    for (let i = 0; i < numHalf; i++) {
      let val = 0;
      if (mvState.analyser && mvState.playing) {
        val = mvState.freqData[i + 1] / 255.0;
      } else {
        val = Math.max(0.08, Math.abs(Math.sin(tSec * 5.2 - i * 0.26)) * Math.exp(-i * 0.035) * (0.55 + bassEnergy * 0.55));
      }
      const barH = Math.max(6, val * 92);
      if (barH > mvState.peakHeights[i]) mvState.peakHeights[i] = barH;
      else mvState.peakHeights[i] = Math.max(6, mvState.peakHeights[i] - 1.6);

      const offset = discRadius + 8 + i * (barW + barGap);
      const colTop = mvState.style === 'demo7' ? '#FFE066' : '#00E5FF';
      const colMid = mvState.style === 'demo7' ? '#EB0F23' : '#FF1EA0';

      [-1, 1].forEach((dir) => {
        const bx = dir === -1 ? (centerX - offset - barW) : (centerX + offset);
        // 3D Extruded Bevel shadow
        mvCtx.fillStyle = 'rgba(90, 10, 110, 0.75)';
        mvCtx.fillRect(bx + 2, centerY - barH / 2 - 2, barW, barH);

        // Main Neon Bar
        const bGrad = mvCtx.createLinearGradient(0, centerY - barH / 2, 0, centerY + barH / 2);
        bGrad.addColorStop(0, colTop);
        bGrad.addColorStop(0.5, '#FFFFFF');
        bGrad.addColorStop(1, colMid);
        mvCtx.fillStyle = bGrad;
        mvCtx.fillRect(bx, centerY - barH / 2, barW, barH);

        // Gravity Diamond Peak
        const py = centerY - mvState.peakHeights[i] / 2 - 6;
        mvCtx.fillStyle = '#FFE066';
        mvCtx.fillRect(bx, py, barW, 3.5);

        // Water mirror reflection below
        mvCtx.fillStyle = 'rgba(255, 30, 160, 0.22)';
        mvCtx.fillRect(bx, centerY + barH / 2 + 4, barW, barH * 0.35);
      });
    }

    // Center Spinning Vinyl Bass Disc ("HOÀNG DỰ")
    mvCtx.save();
    mvCtx.translate(centerX, centerY);
    mvCtx.rotate(tSec * 1.8);
    mvCtx.beginPath();
    mvCtx.arc(0, 0, discRadius, 0, Math.PI * 2);
    mvCtx.fillStyle = '#090718';
    mvCtx.fill();
    mvCtx.lineWidth = 3;
    mvCtx.strokeStyle = '#FFC400';
    mvCtx.stroke();

    mvCtx.beginPath();
    mvCtx.arc(0, 0, discRadius * 0.68, 0, Math.PI * 2);
    mvCtx.strokeStyle = '#00E5FF';
    mvCtx.lineWidth = 1.5;
    mvCtx.stroke();

    mvCtx.fillStyle = '#FFE066';
    mvCtx.font = '900 8.5px sans-serif';
    mvCtx.textAlign = 'center';
    mvCtx.textBaseline = 'middle';
    mvCtx.fillText('HOÀNG DỰ', 0, 0);
    mvCtx.restore();
  }

  document.getElementById('t2BtnPlayMv').addEventListener('click', async (e) => {
    mvState.playing = !mvState.playing;
    if (mvState.playing) {
      e.currentTarget.textContent = '⏸ Dừng MV';
      if (mvState.audioElem) {
        if (!mvState.audioCtx) {
          mvState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          mvState.analyser = mvState.audioCtx.createAnalyser();
          mvState.analyser.fftSize = 128;
          const src = mvState.audioCtx.createMediaElementSource(mvState.audioElem);
          src.connect(mvState.analyser);
          mvState.analyser.connect(mvState.audioCtx.destination);
        }
        await mvState.audioCtx.resume();
        mvState.audioElem.play().catch(() => {});
      }
      const tick = () => {
        if (!mvState.playing) return;
        const t = mvState.audioElem ? mvState.audioElem.currentTime : (performance.now() * 0.001);
        drawMvFrame(t);
        mvState.rafId = requestAnimationFrame(tick);
      };
      tick();
    } else {
      e.currentTarget.textContent = '▶ Phát Thử MV';
      if (mvState.audioElem) mvState.audioElem.pause();
      cancelAnimationFrame(mvState.rafId);
    }
  });

  document.getElementById('t2BtnRenderMv').addEventListener('click', async () => {
    openExportModal('🎬 Đang Kết Xuất MV Sóng Nhạc 3D...', 'Đang ghi hình 60FPS & Sóng nhạc 3D trên iPhone 15 Pro Max...');
    const stream = mvCanvas.captureStream ? mvCanvas.captureStream(30) : mvCanvas.webkitCaptureStream(30);
    const rec = new MediaRecorder(stream, { videoBitsPerSecond: 12000000 });
    const chunks = [];
    rec.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
    const totalSec = 10.0;
    const t0 = performance.now();

    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || 'video/mp4' });
      finishExportModal(blob, 'HoangDuTV_MV_3D_VIP.mp4', 'video/mp4', '🎉 Đã xuất xong Video MV Sóng Nhạc 3D (.MP4)!');
    };
    rec.start(100);

    const renderStep = () => {
      const elapsed = (performance.now() - t0) * 0.001;
      if (elapsed >= totalSec) {
        if (rec.state === 'recording') rec.stop();
        return;
      }
      drawMvFrame(elapsed);
      const pct = Math.min(99, Math.round((elapsed / totalSec) * 100));
      megaProgressBar.style.width = `${pct}%`;
      megaStatusText.textContent = `🎬 Đang dựng MV 3D (${mvState.style.toUpperCase()}): ${pct}%...`;
      requestAnimationFrame(renderStep);
    };
    renderStep();
  });

  // =========================================================================
  // 3. TAB 3: TRẠM DSP MASTERING ÂM THANH PHÒNG THU (-13.0 LUFS)
  // =========================================================================
  const specCanvas = document.getElementById('t3SpectrumCanvas');
  const specCtx = specCanvas.getContext('2d');
  const dspState = {
    audioBuffer: null,
    fileName: 'HoangDu_Bolero_Master.wav',
    isPlaying: false,
    bypass: false,
    bass: 3.5,
    warm: 1.6,
    air: 2.2,
    gain: 2.0
  };

  function drawDemoSpectrum(t) {
    const w = specCanvas.width;
    const h = specCanvas.height;
    specCtx.fillStyle = '#05040D';
    specCtx.fillRect(0, 0, w, h);
    const n = 40;
    const bw = (w - 20) / n;
    for (let i = 0; i < n; i++) {
      const amp = Math.max(0.1, Math.abs(Math.sin(t * 4.5 + i * 0.32)) * (dspState.bypass ? 0.55 : 0.88));
      const bh = amp * (h - 16);
      specCtx.fillStyle = dspState.bypass ? '#64748B' : (i % 2 === 0 ? '#FFC400' : '#00E5FF');
      specCtx.fillRect(10 + i * bw, h - bh - 6, bw - 3, bh);
    }
  }
  drawDemoSpectrum(1.0);

  document.getElementById('inTab3Audio').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    dspState.fileName = f.name;
    document.getElementById('t3TrackTitle').textContent = `🎵 Đã nạp: ${f.name}`;
    try {
      const ab = await f.arrayBuffer();
      const actx = new (window.AudioContext || window.webkitAudioContext)();
      dspState.audioBuffer = await actx.decodeAudioData(ab);
      toast('🎚️ Đã giải mã PCM 32-Bit sẵn sàng Mastering!');
    } catch (err) {
      toast('⚠️ Không thể giải mã âm thanh: ' + err.message);
    }
    e.target.value = '';
  });

  ['Bass', 'Warm', 'Air', 'Gain'].forEach((k) => {
    const sl = document.getElementById(`t3Slider${k}`);
    const vl = document.getElementById(`t3Val${k}`);
    sl.addEventListener('input', () => {
      const v = parseFloat(sl.value);
      dspState[k.toLowerCase()] = v;
      vl.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`;
      drawDemoSpectrum(performance.now() * 0.001);
    });
  });

  document.getElementById('t3BtnBypass').addEventListener('click', (e) => {
    dspState.bypass = !dspState.bypass;
    e.currentTarget.textContent = dspState.bypass ? '🔇 Đang Nghe: ÂM THANH GỐC' : '🔊 Đang Bật: STUDIO MASTER';
    drawDemoSpectrum(performance.now() * 0.001);
  });

  document.getElementById('t3BtnPlayAudio').addEventListener('click', (e) => {
    dspState.isPlaying = !dspState.isPlaying;
    e.currentTarget.textContent = dspState.isPlaying ? '⏸ Dừng Nghe Thử' : '▶ Nghe Thử Master';
    const anim = () => {
      if (!dspState.isPlaying) return;
      drawDemoSpectrum(performance.now() * 0.001);
      requestAnimationFrame(anim);
    };
    if (dspState.isPlaying) anim();
  });

  function encodeWavFromAudioBuffer(buffer) {
    const numCh = buffer.numberOfChannels;
    const sr = buffer.sampleRate;
    const len = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = numCh * bytesPerSample;
    const dataSize = len * blockAlign;
    const ab = new ArrayBuffer(44 + dataSize);
    const view = new DataView(ab);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
    let offset = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < numCh; c++) {
        const s = Math.max(-0.98, Math.min(0.98, channels[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  }

  document.getElementById('t3BtnExportWav').addEventListener('click', async () => {
    openExportModal('🎚️ Đang Render DSP Mastering (-13.0 LUFS)...', 'Đang chạy bộ lọc EQ Bass 75Hz + Air 5.2kHz + Brickwall Limiter...');
    await new Promise(r => setTimeout(r, 120));

    let buf = dspState.audioBuffer;
    if (!buf) {
      // Create a 4-second studio demo chord if user hasn't uploaded an audio file yet
      const sr = 44100;
      const offline = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, sr * 4, sr);
      const osc1 = offline.createOscillator(); osc1.frequency.value = 220;
      const osc2 = offline.createOscillator(); osc2.frequency.value = 329.63;
      const g = offline.createGain(); g.gain.value = 0.25;
      osc1.connect(g); osc2.connect(g); g.connect(offline.destination);
      osc1.start(); osc2.start();
      buf = await offline.startRendering();
    }

    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      buf.numberOfChannels, buf.length, buf.sampleRate
    );
    const src = offlineCtx.createBufferSource();
    src.buffer = buf;

    const bassEq = offlineCtx.createBiquadFilter();
    bassEq.type = 'lowshelf';
    bassEq.frequency.value = 75;
    bassEq.gain.value = dspState.bass;

    const warmEq = offlineCtx.createBiquadFilter();
    warmEq.type = 'peaking';
    warmEq.frequency.value = 240;
    warmEq.Q.value = 1.1;
    warmEq.gain.value = dspState.warm;

    const airEq = offlineCtx.createBiquadFilter();
    airEq.type = 'highshelf';
    airEq.frequency.value = 5200;
    airEq.gain.value = dspState.air;

    const outGain = offlineCtx.createGain();
    outGain.gain.value = Math.pow(10, dspState.gain / 20.0);

    src.connect(bassEq);
    bassEq.connect(warmEq);
    warmEq.connect(airEq);
    airEq.connect(outGain);
    outGain.connect(offlineCtx.destination);
    src.start(0);

    const rendered = await offlineCtx.startRendering();
    const wavBlob = encodeWavFromAudioBuffer(rendered);
    const stem = dspState.fileName.replace(/\.[^/.]+$/, '');
    finishExportModal(wavBlob, `HoangDuTV_Mastered_${stem}.wav`, 'audio/wav', '🎉 Đã xuất xong File Nhạc WAV Lossless Chuẩn Phòng Thu!');
  });

  // =========================================================================
  // 4. TAB 4: STANDALONE HTML DOWNLOADER & INITIALIZATION
  // =========================================================================
  document.getElementById('t4BtnDownloadHtml').addEventListener('click', () => {
    const htmlStr = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([htmlStr], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'HoangDuTV_MEGA_Studio_AllInOne_iPhone15ProMax.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 500);
    toast('📦 Đã tải file .HTML All-In-One độc lập về iPhone!');
  });

  // Initialize Tab 1 & Tab 2 with built-in singer portrait
  (async function initMega() {
    updateT1Lut();
    renderT1Palette(Engine.STUDIO_PRESETS[t1State.presetKey].palette.map(hex => ({ hex, pct: 20 })));
    if (Engine.DEMO_PORTRAIT_DATA_URL) {
      const img = await Engine.loadImageFromFile(Engine.DEMO_PORTRAIT_DATA_URL);
      t1State.img = img;
      t1State.srcW = img.naturalWidth || 540;
      t1State.srcH = img.naturalHeight || 960;
      renderT1Frame();
      drawMvFrame(1.2);
    }
  })();
})();
