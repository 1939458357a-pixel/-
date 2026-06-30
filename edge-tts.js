/**
 * 轻量 Edge TTS 实现 —— 直接连接微软语音合成服务
 * 完全免费，无需 API Key，支持 20+ 种高质量中文语音
 * 中文推荐 voice：zh-CN-XiaoxiaoNeural（晓晓，女声，最自然）
 */
const ETT_TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const ETT_WSS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const ETT_VOICE_URL = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list';

/* ---- 工具函数 ---- */
async function _ettSha256(msg) {
  const buf = new TextEncoder().encode(msg);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
async function _ettGenGec() {
  const sec = Math.floor(Date.now() / 1000) + 11644473600;
  const tick = Math.floor(sec / 300) * 300;
  return _ettSha256(`${tick * 10000000}${ETT_TRUSTED_TOKEN}`);
}
function _ettUUID() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').toUpperCase();
  // fallback
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  }).toUpperCase();
}

/* ---- WebSocket URL ---- */
async function _ettBuildURL() {
  const gec = await _ettGenGec();
  return `${ETT_WSS_BASE}?TrustedClientToken=${ETT_TRUSTED_TOKEN}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=${_ettUUID()}`;
}

/* ---- SSML & Command ---- */
function _ettSSML(text, voice, pitch, rate, volume) {
  return `X-RequestId:${_ettUUID()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}Z\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>\r\n\t<voice name='${voice}'>\r\n\t\t<prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>\r\n\t\t\t${text}\r\n\t\t</prosody>\r\n\t</voice>\r\n</speak>`;
}
function _ettCommand(fmtTag) {
  return `X-Timestamp:${new Date()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":true},"outputFormat":"${fmtTag}"}}}}\r\n`;
}

/* ---- 获取可用语音列表 ---- */
async function edgeTTSGetVoices() {
  try {
    const res = await fetch(`${ETT_VOICE_URL}?trustedclienttoken=${ETT_TRUSTED_TOKEN}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const data = await res.json();
    return data.filter(v => v.Locale.startsWith('zh'));
  } catch (e) {
    console.error('获取语音列表失败:', e);
    return [];
  }
}

/* ---- 语音合成核心：返回音频 Blob ---- */
async function edgeTTSSynthesize(text, opts = {}) {
  const voice = opts.voice || 'zh-CN-XiaoxiaoNeural';
  const rate = opts.rate || '+0%';
  const pitch = opts.pitch || '+0Hz';
  const volume = opts.volume || '+0%';
  const fileType = 'audio-24khz-48kbitrate-mono-mp3';

  const url = await _ettBuildURL();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    let audioBuf = new Uint8Array();

    ws.addEventListener('error', e => { ws.close(); reject(e); });
    ws.addEventListener('close', () => {
      if (audioBuf.length === 0) { reject(new Error('未收到音频数据')); return; }
      resolve(new Blob([audioBuf], { type: 'audio/mpeg' }));
    });
    ws.addEventListener('open', () => {
      ws.send(_ettCommand(fileType));
      ws.send(_ettSSML(text, voice, rate, pitch, volume));
    });
    ws.addEventListener('message', ev => {
      if (ev.data instanceof ArrayBuffer) {
        const buf = new Uint8Array(ev.data);
        if (buf.length >= 2) {
          const headerLen = ((buf[0] << 8) | buf[1]) + 2;
          const payload = buf.subarray(headerLen);
          const merged = new Uint8Array(audioBuf.length + payload.length);
          merged.set(audioBuf);
          merged.set(payload, audioBuf.length);
          audioBuf = merged;
        }
      } else if (typeof ev.data === 'string' && ev.data.includes('turn.end')) {
        ws.close();
      }
    });
  });
}

/* ---- 全局播放器管理 ---- */
window._edgeAudio = null;
window._edgeVoices = [];

async function edgeTTSInit() {
  window._edgeVoices = await edgeTTSGetVoices();
  console.log('Edge TTS 初始化完成，可用中文语音:', window._edgeVoices.length);
  return window._edgeVoices;
}

async function edgeSpeak(text, opts = {}) {
  if (!window._edgeVoices.length) await edgeTTSInit();
  // 停止之前的播放
  if (window._edgeAudio) { window._edgeAudio.pause(); window._edgeAudio = null; }
  const blob = await edgeTTSSynthesize(text, opts);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  window._edgeAudio = audio;
  audio.play();
  audio.onended = () => { URL.revokeObjectURL(url); window._edgeAudio = null; };
  audio.onerror = () => { URL.revokeObjectURL(url); window._edgeAudio = null; };
  return audio;
}

function edgeStop() {
  if (window._edgeAudio) { window._edgeAudio.pause(); window._edgeAudio = null; }
}

/* 暴露到全局 */
window.edgeTTS = { init: edgeTTSInit, speak: edgeSpeak, stop: edgeStop, getVoices: edgeTTSGetVoices };
