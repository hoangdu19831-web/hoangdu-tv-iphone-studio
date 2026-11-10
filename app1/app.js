/**
 * HOÀNG DỰ TV — AI STUDIO PRO MOBILE (BẢN RIÊNG BIỆT CHO IPHONE 15 PRO MAX)
 * Connects UI controls to HoangDuCinemaEngine V2.1
 */
(function() {
  'use strict';

  const Engine = window.HoangDuCinemaEngine;
  const previewCanvas = document.getElementById('previewCanvas');
  const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
  const histCanvas = document.getElementById('histogramCanvas');
  const canvasStage = document.getElementById('canvasStage');

  // Offscreen work canvases for zero-flicker Split-Wipe & Loupe rendering
  const rawCanvas = document.createElement('canvas');
  const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
  const procCanvas = document.createElement('canvas');
  const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });

  const state = {
    mediaType: 'image', // 'image' | 'video'
    sourceImage: null,
    sourceVideo: null,
    sourceName: 'Chan_Dung_Ca_Si_Hoang_Du_TV.jpg',
    srcW: 540,
    srcH: 960,
    splitRatio: 0.50,
    loupeEnabled: false,
    loupeX: 0.50,
    loupeY: 0.36,
    scaleMode: '2x',
    aspectMode: 'source',
    presetKey: 'bolero_gold',
    customRefStats: null,
    srcStats: null,
    activeLut3D: null,
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
    },
    isVideoPlaying: false,
    rafId: null
  };

  function showToast(msg) {
    const t = document.getElementById('toastBanner');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.add('hidden'), 2800);
  }

  // =========================================================================
  // 1. INITIALIZE DEFAULT DEMO PORTRAIT & LUT
  // =========================================================================
  async function initStudio() {
    rebuildActiveLut();
    renderPaletteSwatches(Engine.STUDIO_PRESETS[state.presetKey].palette.map(hex => ({ hex, pct: 20 })));

    // Set default ref thumb to gold gradient icon
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 80;
    thumbCanvas.height = 80;
    const tctx = thumbCanvas.getContext('2d');
    const g = tctx.createLinearGradient(0, 0, 80, 80);
    g.addColorStop(0, '#0D1F22');
    g.addColorStop(0.5, '#B07D2B');
    g.addColorStop(1, '#FFF3D1');
    tctx.fillStyle = g;
    tctx.fillRect(0, 0, 80, 80);
    document.getElementById('refThumbImg').src = thumbCanvas.toDataURL();

    if (Engine.DEMO_PORTRAIT_DATA_URL) {
      try {
        const img = await Engine.loadImageFromFile(Engine.DEMO_PORTRAIT_DATA_URL);
        setSourceImage(img, 'Ca_Si_Hoang_Du_TV_Goc.jpg');
      } catch (e) {
        console.warn('Demo portrait load warning:', e);
      }
    }
  }

  function rebuildActiveLut() {
    const skinShield = state.params.skinShield / 100.0;
    if (state.customRefStats) {
      state.activeLut3D = Engine.buildUniversalMatchLut3D(state.srcStats, state.customRefStats, skinShield);
    } else {
      state.activeLut3D = Engine.buildLut3DFromPreset(state.presetKey, skinShield);
    }
  }

  function renderPaletteSwatches(paletteItems) {
    const container = document.getElementById('paletteContainer');
    if (!container) return;
    container.innerHTML = '';
    paletteItems.forEach((item) => {
      const hex = item.hex || item;
      const pct = item.pct || 20;
      const div = document.createElement('div');
      div.className = 'swatch-item';
      div.innerHTML = `
        <div class="swatch-color" style="background:${hex};"></div>
        <div class="swatch-hex">${hex}</div>
        <div style="font-size:8.5px;color:#94A3B8;">${pct}%</div>
      `;
      div.onclick = () => {
        if (navigator.clipboard) navigator.clipboard.writeText(hex).catch(() => {});
        showToast(`🎨 Đã sao chép mã màu ${hex}`);
      };
      container.appendChild(div);
    });
  }

  // =========================================================================
  // 2. LOAD SOURCE PHOTO OR VIDEO ON IPHONE 15 PRO MAX
  // =========================================================================
  function setSourceImage(img, filename) {
    if (state.sourceVideo) {
      state.sourceVideo.pause();
      state.isVideoPlaying = false;
    }
    document.getElementById('videoTransportBar').classList.add('hidden');
    state.mediaType = 'image';
    state.sourceImage = img;
    state.sourceName = filename || 'Anh_Hoang_Du_TV.jpg';
    state.srcW = img.naturalWidth || img.width || 1080;
    state.srcH = img.naturalHeight || img.height || 1920;

    // Sample source stats for accurate Universal Color Matching
    const sc = document.createElement('canvas');
    sc.width = 180;
    sc.height = 180;
    const sctx = sc.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(img, 0, 0, 180, 180);
    state.srcStats = Engine.analyzePixelDistribution(sctx.getImageData(0, 0, 180, 180).data);

    if (state.customRefStats) rebuildActiveLut();
    updateResolutionBadges();
    processPreviewFrame();
  }

  function setSourceVideo(file) {
    if (state.sourceVideo) {
      state.sourceVideo.pause();
      URL.revokeObjectURL(state.sourceVideo.src);
    }
    const vid = document.createElement('video');
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.muted = false;
    vid.loop = true;
    vid.preload = 'auto';
    vid.src = URL.createObjectURL(file);

    vid.onloadedmetadata = async () => {
      state.mediaType = 'video';
      state.sourceVideo = vid;
      state.sourceName = file.name || 'Video_Hoang_Du_TV.mp4';
      state.srcW = vid.videoWidth || 1080;
      state.srcH = vid.videoHeight || 1920;

      document.getElementById('videoTransportBar').classList.remove('hidden');
      const scrubber = document.getElementById('videoScrubber');
      scrubber.max = Math.max(0.1, vid.duration || 10);
      scrubber.value = 0;

      await Engine.seekVideoSafely(vid, Math.min(0.5, (vid.duration || 1) * 0.1));

      // Analyze source video color stats
      const sc = document.createElement('canvas');
      sc.width = 180;
      sc.height = 180;
      const sctx = sc.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(vid, 0, 0, 180, 180);
      state.srcStats = Engine.analyzePixelDistribution(sctx.getImageData(0, 0, 180, 180).data);

      if (state.customRefStats) rebuildActiveLut();
      updateResolutionBadges();
      processPreviewFrame();
      showToast(`🎬 Đã nạp Video (${state.srcW}×${state.srcH})! Bấm Phát để xem trực tiếp.`);
    };
  }

  function updateResolutionBadges() {
    const outDim = Engine.computeOutputDimensions(state.srcW, state.srcH, state.aspectMode, state.scaleMode);
    const kind = state.mediaType === 'video' ? '🎬 Video' : '📸 Ảnh';
    document.getElementById('mediaInfoTag').textContent =
      `${kind}: ${state.srcW}×${state.srcH} ➜ ${outDim.width}×${outDim.height}`;
    document.getElementById('targetResBadge').textContent =
      `Đầu ra: ${outDim.width}×${outDim.height}`;
  }

  // =========================================================================
  // 3. REAL-TIME PREVIEW RENDERER (V2.1 ACUTANCE + SPLIT-WIPE + 3x LOUPE)
  // =========================================================================
  function processPreviewFrame() {
    const mediaElem = state.mediaType === 'video' ? state.sourceVideo : state.sourceImage;
    if (!mediaElem) return;

    // Preview canvas dimensions (capped at 720px long side for 60fps smooth touch responsiveness)
    const outDim = Engine.computeOutputDimensions(state.srcW, state.srcH, state.aspectMode, '1x');
    const maxPrev = 680;
    const scale = Math.min(1.0, maxPrev / Math.max(outDim.width, outDim.height));
    const pw = Math.max(2, Math.round(outDim.width * scale));
    const ph = Math.max(2, Math.round(outDim.height * scale));

    if (rawCanvas.width !== pw || rawCanvas.height !== ph) {
      rawCanvas.width = pw;
      rawCanvas.height = ph;
      procCanvas.width = pw;
      procCanvas.height = ph;
      previewCanvas.width = pw;
      previewCanvas.height = ph;
    }

    // Draw original source frame
    Engine.drawSourceToCanvas(rawCtx, mediaElem, state.srcW, state.srcH, pw, ph);
    const srcImgData = rawCtx.getImageData(0, 0, pw, ph);
    const dstImgData = procCtx.createImageData(pw, ph);

    // Run V2.1 Ultra-Sharp + 3D LUT Color Match Engine
    Engine.processImageDataV21(srcImgData, dstImgData, state.params, state.activeLut3D);
    procCtx.putImageData(dstImgData, 0, 0);

    // Render Split-Wipe Comparison + 3x Zoom Loupe
    renderSplitAndLoupe();

    // Update live RGB Parade & Luma Histogram
    Engine.renderRgbHistogram(histCanvas, dstImgData);
  }

  function renderSplitAndLoupe() {
    const pw = previewCanvas.width;
    const ph = previewCanvas.height;
    if (!pw || !ph) return;

    const splitX = Math.round(pw * state.splitRatio);

    // Left of splitX: BEFORE (Original)
    previewCtx.clearRect(0, 0, pw, ph);
    previewCtx.drawImage(procCanvas, 0, 0, pw, ph);

    if (splitX > 0) {
      previewCtx.save();
      previewCtx.beginPath();
      previewCtx.rect(0, 0, splitX, ph);
      previewCtx.clip();
      previewCtx.drawImage(rawCanvas, 0, 0, pw, ph);
      previewCtx.restore();
    }

    // Draw luxury gold split line + handle
    previewCtx.save();
    previewCtx.strokeStyle = '#FFC400';
    previewCtx.lineWidth = 2.5;
    previewCtx.beginPath();
    previewCtx.moveTo(splitX, 0);
    previewCtx.lineTo(splitX, ph);
    previewCtx.stroke();

    // Center handle circle
    const hy = Math.round(ph * 0.5);
    previewCtx.fillStyle = '#080C16';
    previewCtx.beginPath();
    previewCtx.arc(splitX, hy, 16, 0, Math.PI * 2);
    previewCtx.fill();
    previewCtx.strokeStyle = '#00E5FF';
    previewCtx.lineWidth = 2.5;
    previewCtx.stroke();

    previewCtx.fillStyle = '#FFE066';
    previewCtx.font = 'bold 12px sans-serif';
    previewCtx.textAlign = 'center';
    previewCtx.textBaseline = 'middle';
    previewCtx.fillText('↔', splitX, hy);
    previewCtx.restore();

    // Optional 3x Optical Zoom Loupe (Split inside the Loupe too: Left = Original, Right = V2.1 4K!)
    if (state.loupeEnabled) {
      const lx = Math.round(state.loupeX * pw);
      const ly = Math.round(state.loupeY * ph);
      const radius = Math.round(Math.min(pw, ph) * 0.26);
      const zoom = 2.8;
      const srcPatchW = Math.round((radius * 2) / zoom);
      const srcPatchH = srcPatchW;
      const sx = Math.max(0, Math.min(pw - srcPatchW, Math.round(lx - srcPatchW / 2)));
      const sy = Math.max(0, Math.min(ph - srcPatchH, Math.round(ly - srcPatchH / 2)));

      previewCtx.save();
      previewCtx.beginPath();
      previewCtx.arc(lx, ly, radius, 0, Math.PI * 2);
      previewCtx.clip();

      // Left half of loupe = Original, Right half of loupe = V2.1 Sharpened
      previewCtx.imageSmoothingEnabled = false; // Show crisp pixel detail inside loupe!
      previewCtx.drawImage(procCanvas, sx, sy, srcPatchW, srcPatchH, lx - radius, ly - radius, radius * 2, radius * 2);

      previewCtx.beginPath();
      previewCtx.rect(lx - radius, ly - radius, radius, radius * 2);
      previewCtx.clip();
      previewCtx.drawImage(rawCanvas, sx, sy, srcPatchW, srcPatchH, lx - radius, ly - radius, radius * 2, radius * 2);
      previewCtx.restore();

      // Loupe border & divider
      previewCtx.save();
      previewCtx.strokeStyle = '#00E5FF';
      previewCtx.lineWidth = 3;
      previewCtx.beginPath();
      previewCtx.arc(lx, ly, radius, 0, Math.PI * 2);
      previewCtx.stroke();

      previewCtx.strokeStyle = '#FFC400';
      previewCtx.lineWidth = 1.5;
      previewCtx.beginPath();
      previewCtx.moveTo(lx, ly - radius);
      previewCtx.lineTo(lx, ly + radius);
      previewCtx.stroke();

      previewCtx.fillStyle = 'rgba(6, 9, 17, 0.85)';
      previewCtx.fillRect(lx - 58, ly + radius - 22, 116, 18);
      previewCtx.fillStyle = '#FFE066';
      previewCtx.font = 'bold 10px sans-serif';
      previewCtx.textAlign = 'center';
      previewCtx.fillText('GỐC | NÉT V2.1 (3×)', lx, ly + radius - 10);
      previewCtx.restore();
    }
  }

  // =========================================================================
  // 4. TOUCH & POINTER INTERACTION ON VIEWPORT
  // =========================================================================
  let isDraggingViewport = false;
  function handleViewportPointer(clientX, clientY) {
    const rect = previewCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
    const relY = Math.max(0.05, Math.min(0.95, (clientY - rect.top) / rect.height));
    if (state.loupeEnabled) {
      state.loupeX = relX;
      state.loupeY = relY;
    } else {
      state.splitRatio = relX;
    }
    renderSplitAndLoupe();
  }

  canvasStage.addEventListener('pointerdown', (e) => {
    isDraggingViewport = true;
    handleViewportPointer(e.clientX, e.clientY);
  });
  window.addEventListener('pointermove', (e) => {
    if (!isDraggingViewport) return;
    handleViewportPointer(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', () => {
    isDraggingViewport = false;
  });

  document.getElementById('btnToggleLoupe').addEventListener('click', (e) => {
    state.loupeEnabled = !state.loupeEnabled;
    e.currentTarget.classList.toggle('active', state.loupeEnabled);
    renderSplitAndLoupe();
    showToast(state.loupeEnabled ? '🔍 Đã bật Kính Lúp Soi Nét 3× (Chạm lên mặt ca sĩ để soi!)' : 'Đã tắt Kính Lúp 3×');
  });

  document.getElementById('btnResetSplit').addEventListener('click', () => {
    state.splitRatio = 0.50;
    renderSplitAndLoupe();
  });

  // =========================================================================
  // 5. FILE INPUT HANDLERS (SOURCE & REFERENCE PHOTO/VIDEO)
  // =========================================================================
  document.getElementById('inputSourceFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file.name);
    if (isVideo) {
      setSourceVideo(file);
    } else {
      try {
        const img = await Engine.loadImageFromFile(file);
        setSourceImage(img, file.name);
        showToast(`📸 Đã nạp Ảnh Gốc (${img.naturalWidth}×${img.naturalHeight})`);
      } catch (err) {
        showToast('⚠️ Không thể đọc file ảnh này: ' + err.message);
      }
    }
    e.target.value = '';
  });

  document.getElementById('inputRefFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      showToast('🎨 Đang phân tích bảng màu & ánh sáng từ file mẫu...');
      const refStats = await Engine.extractReferenceStatsFromFile(file, (msg) => showToast(msg));
      state.customRefStats = refStats;

      // Clear active preset highlight since we are using custom Reference Match
      document.querySelectorAll('#presetGrid .preset-btn').forEach(b => b.classList.remove('active'));

      document.getElementById('refThumbImg').src = refStats.thumbUrl;
      const kindLabel = refStats.sourceType === 'video' ? '🎬 Video Mẫu' : '📸 Ảnh Mẫu';
      document.getElementById('refNameText').textContent = `${kindLabel}: ${refStats.fileName}`;
      document.getElementById('refStatsText').textContent =
        `Độ sáng: ${refStats.metrics.brightness >= 0 ? '+' : ''}${refStats.metrics.brightness} • Tương phản: ${refStats.metrics.contrast >= 0 ? '+' : ''}${refStats.metrics.contrast} • Độ ấm: ${refStats.metrics.warmth >= 0 ? '+' : ''}${refStats.metrics.warmth}`;

      renderPaletteSwatches(refStats.palette);
      rebuildActiveLut();
      processPreviewFrame();
      showToast('✅ Đã khớp 100% phong cách màu từ file mẫu!');
    } catch (err) {
      showToast('⚠️ Lỗi phân tích file mẫu: ' + err.message);
    }
    e.target.value = '';
  });

  // =========================================================================
  // 6. UI CONTROLS & SLIDERS BINDING
  // =========================================================================
  document.querySelectorAll('#scaleModeGroup .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#scaleModeGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.scaleMode = btn.dataset.scale;
      updateResolutionBadges();
      showToast(`⚡ Đã chọn chế độ nâng cấp: ${btn.textContent}`);
    });
  });

  document.querySelectorAll('#aspectModeGroup .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#aspectModeGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.aspectMode = btn.dataset.aspect;
      updateResolutionBadges();
      processPreviewFrame();
    });
  });

  document.querySelectorAll('#presetGrid .preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#presetGrid .preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.presetKey = btn.dataset.preset;
      state.customRefStats = null;

      const p = Engine.STUDIO_PRESETS[state.presetKey];
      document.getElementById('refNameText').textContent = `Đang dùng: ${p.name}`;
      document.getElementById('refStatsText').textContent = `Preset chuẩn màu điện ảnh Hoàng Dự Studio`;
      renderPaletteSwatches(p.palette.map(hex => ({ hex, pct: 20 })));

      rebuildActiveLut();
      processPreviewFrame();
    });
  });

  function bindSlider(id, paramKey, valId, formatter) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      state.params[paramKey] = parseFloat(el.value);
      if (valId) {
        document.getElementById(valId).textContent = formatter ? formatter(state.params[paramKey]) : `${state.params[paramKey]}%`;
      }
      if (paramKey === 'skinShield') rebuildActiveLut();
      processPreviewFrame();
    });
  }

  bindSlider('sliderSharpness', 'sharpness', 'valSharpness', v => `${v}%`);
  bindSlider('sliderMicroDetail', 'microDetail', 'valMicroDetail', v => `${v}%`);
  bindSlider('sliderDenoise', 'denoise', 'valDenoise', v => v === 0 ? '0% (Giữ Nét 100%)' : `${v}%`);
  bindSlider('sliderLutStrength', 'lutStrength', 'valLutStrength', v => `${v}%`);
  bindSlider('sliderSkinShield', 'skinShield', 'valSkinShield', v => `${v}%`);

  ['sliderBrightness', 'sliderContrast'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      state.params.brightness = parseFloat(document.getElementById('sliderBrightness').value);
      state.params.contrast = parseFloat(document.getElementById('sliderContrast').value);
      const b = state.params.brightness >= 0 ? `+${state.params.brightness}` : state.params.brightness;
      const c = state.params.contrast >= 0 ? `+${state.params.contrast}` : state.params.contrast;
      document.getElementById('valBrightContrast').textContent = `${b} / ${c}`;
      processPreviewFrame();
    });
  });

  ['sliderSaturation', 'sliderWarmth'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      state.params.saturation = parseFloat(document.getElementById('sliderSaturation').value);
      state.params.warmth = parseFloat(document.getElementById('sliderWarmth').value);
      const s = state.params.saturation >= 0 ? `+${state.params.saturation}` : state.params.saturation;
      const w = state.params.warmth >= 0 ? `+${state.params.warmth}` : state.params.warmth;
      document.getElementById('valSatWarm').textContent = `${s} / ${w}`;
      processPreviewFrame();
    });
  });

  document.getElementById('chkDetailLock').addEventListener('change', (e) => {
    state.params.detailLock = e.target.checked;
    processPreviewFrame();
  });

  // Video transport controls
  const btnPlayPauseVid = document.getElementById('btnPlayPauseVid');
  const videoScrubber = document.getElementById('videoScrubber');
  const videoTimeText = document.getElementById('videoTimeText');

  function formatSec(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  btnPlayPauseVid.addEventListener('click', () => {
    if (!state.sourceVideo) return;
    if (state.sourceVideo.paused) {
      state.sourceVideo.play();
      state.isVideoPlaying = true;
      btnPlayPauseVid.textContent = '⏸ Dừng';
      const loop = () => {
        if (!state.isVideoPlaying || !state.sourceVideo || state.sourceVideo.paused) return;
        videoScrubber.value = state.sourceVideo.currentTime;
        videoTimeText.textContent = `${formatSec(state.sourceVideo.currentTime)} / ${formatSec(state.sourceVideo.duration)}`;
        processPreviewFrame();
        state.rafId = requestAnimationFrame(loop);
      };
      loop();
    } else {
      state.sourceVideo.pause();
      state.isVideoPlaying = false;
      btnPlayPauseVid.textContent = '▶ Phát';
      cancelAnimationFrame(state.rafId);
    }
  });

  videoScrubber.addEventListener('input', async () => {
    if (!state.sourceVideo) return;
    state.sourceVideo.pause();
    state.isVideoPlaying = false;
    btnPlayPauseVid.textContent = '▶ Phát';
    await Engine.seekVideoSafely(state.sourceVideo, parseFloat(videoScrubber.value));
    videoTimeText.textContent = `${formatSec(state.sourceVideo.currentTime)} / ${formatSec(state.sourceVideo.duration)}`;
    processPreviewFrame();
  });

  // =========================================================================
  // 7. EXPORT .CUBE 3D LUT & ON-DEVICE 4K PHOTO / MP4 VIDEO EXPORT
  // =========================================================================
  document.getElementById('btnExportCubeLut').addEventListener('click', async () => {
    const cubeStr = Engine.exportCubeLutString(state.activeLut3D, 'HoangDuTV_Universal_Match');
    const blob = new Blob([cubeStr], { type: 'text/plain;charset=utf-8' });
    const stem = state.sourceName.replace(/\.[^/.]+$/, '');
    const helper = await Engine.saveOrShareBlobOnIPhone(blob, `HoangDuTV_ColorMatch_${stem}.cube`, 'text/plain');
    helper.triggerDownload();
    showToast('📦 Đã xuất file 3D LUT (.CUBE 33×33×33)!');
  });

  const exportModal = document.getElementById('exportModal');
  const exportProgressBar = document.getElementById('exportProgressBar');
  const exportStatusText = document.getElementById('exportStatusText');
  const exportResultSection = document.getElementById('exportResultSection');
  const btnIosNativeShare = document.getElementById('btnIosNativeShare');
  const btnIosDirectDownload = document.getElementById('btnIosDirectDownload');

  document.getElementById('btnCloseExportModal').addEventListener('click', () => {
    exportModal.classList.add('hidden');
  });

  document.getElementById('btnStartExport').addEventListener('click', async () => {
    exportModal.classList.remove('hidden');
    exportResultSection.classList.add('hidden');
    exportProgressBar.style.width = '12%';
    const stem = state.sourceName.replace(/\.[^/.]+$/, '');
    const outDim = Engine.computeOutputDimensions(state.srcW, state.srcH, state.aspectMode, state.scaleMode);

    if (state.mediaType === 'image') {
      // 4K / Super-HD Photo Export
      exportStatusText.textContent = `Đang nâng cấp quang học V2.1 lên ${outDim.width}×${outDim.height}...`;
      await new Promise(r => setTimeout(r, 60));

      const expCanvas = document.createElement('canvas');
      expCanvas.width = outDim.width;
      expCanvas.height = outDim.height;
      const expCtx = expCanvas.getContext('2d', { willReadFrequently: true });

      Engine.drawSourceToCanvas(expCtx, state.sourceImage, state.srcW, state.srcH, outDim.width, outDim.height);
      exportProgressBar.style.width = '48%';
      await new Promise(r => setTimeout(r, 40));

      const srcData = expCtx.getImageData(0, 0, outDim.width, outDim.height);
      const dstData = expCtx.createImageData(outDim.width, outDim.height);
      Engine.processImageDataV21(srcData, dstData, state.params, state.activeLut3D);
      expCtx.putImageData(dstData, 0, 0);

      exportProgressBar.style.width = '88%';
      exportStatusText.textContent = 'Đang đóng gói ảnh PNG/JPEG chất lượng cao...';

      expCanvas.toBlob(async (blob) => {
        exportProgressBar.style.width = '100%';
        exportStatusText.textContent = '✅ Hoàn tất 100%!';
        const outName = `HoangDuTV_4K_V21_${stem}.png`;
        const saveHelper = await Engine.saveOrShareBlobOnIPhone(blob, outName, 'image/png');

        document.getElementById('exportDoneTitle').textContent = '🎉 ẢNH 4K V2.1 ĐÃ SẴN SÀNG!';
        document.getElementById('exportDoneMeta').textContent =
          `${outName} • ${outDim.width}×${outDim.height} • ${(blob.size / (1024 * 1024)).toFixed(2)} MB`;

        btnIosDirectDownload.href = saveHelper.blobUrl;
        btnIosDirectDownload.setAttribute('download', outName);
        btnIosNativeShare.onclick = () => saveHelper.triggerShare().catch(() => saveHelper.triggerDownload());
        exportResultSection.classList.remove('hidden');
      }, 'image/png');
      return;
    }

    // Video Export on iPhone 15 Pro Max (Canvas + V2.1 Per-Frame Shader + MediaRecorder MP4)
    try {
      const vid = state.sourceVideo;
      vid.pause();
      state.isVideoPlaying = false;

      // Cap video export resolution on mobile to 1080p Full HD for smooth real-time hardware encoding
      const maxVidSide = 1920;
      let vw = outDim.width;
      let vh = outDim.height;
      if (Math.max(vw, vh) > maxVidSide) {
        const sc = maxVidSide / Math.max(vw, vh);
        vw = Math.round(vw * sc);
        vh = Math.round(vh * sc);
        vw += vw % 2;
        vh += vh % 2;
      }

      const expCanvas = document.createElement('canvas');
      expCanvas.width = vw;
      expCanvas.height = vh;
      const expCtx = expCanvas.getContext('2d', { willReadFrequently: true });

      const workCanvas = document.createElement('canvas');
      workCanvas.width = vw;
      workCanvas.height = vh;
      const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });

      const stream = expCanvas.captureStream ? expCanvas.captureStream(30) : expCanvas.webkitCaptureStream(30);

      // Capture original audio track if available
      try {
        const vStream = vid.captureStream ? vid.captureStream() : (vid.mozCaptureStream ? vid.mozCaptureStream() : null);
        if (vStream && vStream.getAudioTracks().length > 0) {
          stream.addTrack(vStream.getAudioTracks()[0]);
        }
      } catch (ae) {}

      const mimeCandidates = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm'
      ];
      let chosenMime = '';
      for (const m of mimeCandidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
          chosenMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime, videoBitsPerSecond: 14000000 } : {});
      const chunks = [];
      recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };

      const totalDur = Math.max(1.0, vid.duration || 10.0);
      vid.loop = false;
      await Engine.seekVideoSafely(vid, 0);

      recorder.onstop = async () => {
        vid.loop = true;
        const finalMime = recorder.mimeType || chosenMime || 'video/mp4';
        const ext = finalMime.includes('webm') ? 'webm' : 'mp4';
        const blob = new Blob(chunks, { type: finalMime });
        const outName = `HoangDuTV_V21_${stem}.${ext}`;
        const saveHelper = await Engine.saveOrShareBlobOnIPhone(blob, outName, finalMime);

        exportProgressBar.style.width = '100%';
        exportStatusText.textContent = '✅ Đã kết xuất Video thành công!';
        document.getElementById('exportDoneTitle').textContent = '🎬 VIDEO SIÊU NÉT V2.1 ĐÃ SẴN SÀNG!';
        document.getElementById('exportDoneMeta').textContent =
          `${outName} • ${vw}×${vh} • ${(blob.size / (1024 * 1024)).toFixed(2)} MB`;

        btnIosDirectDownload.href = saveHelper.blobUrl;
        btnIosDirectDownload.setAttribute('download', outName);
        btnIosNativeShare.onclick = () => saveHelper.triggerShare().catch(() => saveHelper.triggerDownload());
        exportResultSection.classList.remove('hidden');
      };

      recorder.start(120);
      await vid.play();

      const renderLoop = () => {
        if (vid.ended || vid.currentTime >= totalDur - 0.08) {
          if (recorder.state === 'recording') recorder.stop();
          return;
        }
        Engine.drawSourceToCanvas(workCtx, vid, state.srcW, state.srcH, vw, vh);
        const sData = workCtx.getImageData(0, 0, vw, vh);
        const dData = expCtx.createImageData(vw, vh);
        Engine.processImageDataV21(sData, dData, state.params, state.activeLut3D);
        expCtx.putImageData(dData, 0, 0);

        const pct = Math.min(99, Math.round((vid.currentTime / totalDur) * 100));
        exportProgressBar.style.width = `${pct}%`;
        exportStatusText.textContent = `🎬 Đang nâng cấp & khớp màu từng khung hình: ${pct}%...`;
        requestAnimationFrame(renderLoop);
      };
      renderLoop();
    } catch (err) {
      exportStatusText.textContent = '⚠️ Lỗi xuất video: ' + err.message;
    }
  });

  // Install Modal
  const installModal = document.getElementById('installModal');
  document.getElementById('btnOpenInstallModal').addEventListener('click', () => installModal.classList.remove('hidden'));
  document.getElementById('btnCloseInstallModal').addEventListener('click', () => installModal.classList.add('hidden'));

  document.getElementById('btnDownloadStandaloneHtml').addEventListener('click', () => {
    const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'HoangDuTV_AI_Studio_Pro_iPhone15ProMax.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 500);
    showToast('📦 Đã tải file .HTML độc lập lưu vào Tệp (Files) iPhone!');
  });

  initStudio();
})();
