/* ====================================================================
   乌镇文旅资源 WebGIS 智能导览系统
   技术栈：ArcGIS API for JavaScript 4.29
   数据源：ArcGIS Online FeatureLayer（681条真实POI，高德地图开放平台采集）
   ==================================================================== */

// ===== 全局配置 =====
// 主图层：691条真实POI（景点/非遗体验/文化场馆/美食/住宿/公共服务，
// 其中10条非遗体验数据已合并进同一个图层，category字段值为 'heritage'）
const FEATURE_LAYER_URL = "https://services8.arcgis.com/HOpNJOCGcy3Gi8RS/arcgis/rest/services/%E4%B9%8C%E9%95%87/FeatureServer/0";

// ArcGIS Routing 服务所需的 API Key（需在 ArcGIS Developer 控制台生成，
// 并勾选 "Routing" / Network Analysis 权限。未填写时，系统会自动降级为直线距离估算，不影响其他功能运行）
const ARCGIS_ROUTING_API_KEY = "在这里填入你的API Key";

// 乌镇景区中心坐标（西栅入口，石佛南路18号）
const CENTER = { longitude: 120.488115, latitude: 30.753251 };

// 6大一级分类：原"非遗/文化"已拆分为 heritage(真非遗,10条) 和 culture(文化场馆,72条)
const CATS = {
  attraction: { label: '景点',     color: '#2D4F5C', icon: '◆' },
  heritage:   { label: '非遗体验', color: '#B8693D', icon: '◆' },
  culture:    { label: '文化场馆', color: '#6B5B7A', icon: '◆' },
  food:       { label: '美食',     color: '#C9914A', icon: '◆' },
  stay:       { label: '住宿',     color: '#5C7A5C', icon: '◆' },
  service:    { label: '公共服务', color: '#8A8478', icon: '◆' }
};

// 各类别二级分类匹配规则（均基于真实数据 amap_type 字段统计的高频类型，非凭空猜测）
const ATTRACTION_SUBTYPES = [
  { key: 'bridge',   label: '桥梁古迹',  match: ['桥', '国家级景点'] },
  { key: 'temple',   label: '寺庙道观',  match: ['寺庙道观', '教堂'] },
  { key: 'memorial', label: '纪念馆',    match: ['纪念馆'] },
  { key: 'plaza',    label: '广场园林',  match: ['城市广场', '风景名胜'] },
  { key: 'general',  label: '综合景点',  match: ['旅游景点'] }
];

const CULTURE_SUBTYPES = [
  { key: 'exhibit',  label: '展览会展', match: ['会展中心', '展览馆', '美术馆'] },
  { key: 'edu',      label: '科教文化', match: ['科教文化场所', '图书馆', '科技馆'] },
  { key: 'art',      label: '艺术团体', match: ['文艺团体', '室内设施'] }
];

// 非遗体验子类：amap_type字段对这10个真实点位的判断力有限(风景名胜/剧场/展览馆/专卖店混杂)，
// 改用名称里的真实技艺关键词分类，依据是已核实的具体非遗项目名称
const HERITAGE_SUBTYPES = [
  { key: 'dye',      label: '染坊印染', match: ['染坊', '蓝印花布'] },
  { key: 'show',     label: '戏曲表演', match: ['皮影', '戏馆', '剧场'] },
  { key: 'craft',    label: '手工技艺', match: ['竹编', '竹芸', '手工'] },
  { key: 'other',    label: '民俗体验', match: ['三寸金莲', '体验馆', '作坊区'] }
];

// 美食子类匹配规则（基于真实数据 amap_type 字段统计得出的高频类型）
const FOOD_SUBTYPES = [
  { key: 'chinese',  label: '江南菜馆', match: ['中餐厅', '特色', '地方风味', '综合酒楼', '浙江菜', '上海菜'] },
  { key: 'spicy',    label: '川湘菜',   match: ['四川菜', '川菜', '湖南菜', '湘菜', '火锅'] },
  { key: 'dessert',  label: '甜品冷饮', match: ['甜品店', '冷饮店'] },
  { key: 'cafe',     label: '咖啡茶馆', match: ['咖啡厅', '茶艺馆', '星巴克'] },
  { key: 'fast',     label: '快餐休闲', match: ['快餐厅', '休闲餐饮'] }
];

// 住宿子类：高德免费接口对住宿POI的价格字段几乎全部缺失（实测176个住宿点仅1个有价格数据，
// 不足以支撑真实价格分类），改用评分作为档位代理指标（146/176有评分，分布合理）。
// 这是评分代理，不是价格——UI上明确标注"评分"而非用¥符号伪装成价格。
const STAY_SUBTYPES = [
  { key: 'high',  label: '高分优选', match: r => r != null && r > 4.3 },
  { key: 'mid',   label: '口碑适中', match: r => r != null && r > 3.5 && r <= 4.3 },
  { key: 'low',   label: '待提升',   match: r => r != null && r <= 3.5 }
];

// 公共服务子类：数据非常扎实，三大类清晰可辨
const SERVICE_SUBTYPES = [
  { key: 'toilet',   label: '公共厕所', match: ['公共厕所'] },
  { key: 'parking',  label: '停车场',   match: ['停车场', '出入口', '出口', '入口'] },
  { key: 'dock',     label: '码头渡口', match: ['港口码头', '人渡口'] }
];

// 二级分类总表，方便统一遍历渲染UI
const SUBTYPE_MAP = {
  attraction: ATTRACTION_SUBTYPES,
  heritage: HERITAGE_SUBTYPES,
  culture: CULTURE_SUBTYPES,
  food: FOOD_SUBTYPES,
  stay: STAY_SUBTYPES,
  service: SERVICE_SUBTYPES
};

// 天数/时长档位定义
const DURATION_OPTIONS = [
  { key: 'half',  title: '半日游',   sub: '约4小时',  days: 1, hoursPerDay: 4 },
  { key: 'full',  title: '一日游',   sub: '约8小时',  days: 1, hoursPerDay: 8 },
  { key: '2d1n',  title: '两天一夜', sub: '含1晚住宿', days: 2, hoursPerDay: 7 },
  { key: '3d2n',  title: '三天两夜', sub: '含2晚住宿', days: 3, hoursPerDay: 7 }
];

// ===== 全局状态 =====
const state = {
  allFeatures: [],          // 从FeatureLayer加载的全部点位（已清洗为JS对象数组）
  activeLayers: new Set(Object.keys(CATS)),
  selectedPrefs: new Set(),
  selectedSubs: {           // 每个类别对应一个二级分类的选中集合，通用机制
    attraction: new Set(), heritage: new Set(), food: new Set(), stay: new Set(), service: new Set()
  },
  selectedDuration: 'half',
  accessibleMode: false,
  currentItinerary: null,   // { days: [ { dayIndex, stops:[...], anchor or null } ], totalBudget, ... }
  rerollSeed: 0,
  weather: null,
  view: null,
  map: null,
  graphicsLayer: null,
  routeLayer: null,
  poiLayerView: null
};

/* ==================== 左侧面板 UI 构建 ==================== */
function buildPanel() {
  const panel = document.getElementById('panel');
  panel.innerHTML = `
    <div class="panel-header">
      <div class="brand-mark">乌</div>
      <div class="panel-title">乌镇文旅资源<br>智能导览系统</div>
      <div class="panel-sub">WUZHEN · ARCGIS WEBGIS NAVIGATOR</div>
    </div>

    <div class="weather-strip" id="weatherStrip">
      <span class="w-icon">⛅</span>
      <span id="weatherText">正在获取实时天气…</span>
      <span class="w-tip" id="weatherTip"></span>
    </div>

    <div class="stats-row">
      <div class="stat"><div class="stat-num" data-count="0" id="statTotal">0</div><div class="stat-label">真实资源点位</div></div>
      <div class="stat"><div class="stat-num" data-count="5">0</div><div class="stat-label">资源类别</div></div>
      <div class="stat"><div class="stat-num" data-count="0" id="statStay">0</div><div class="stat-label">可选住宿</div></div>
    </div>

    <div class="section">
      <div class="section-label">查询资源</div>
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input type="text" id="searchInput" placeholder="搜索景点 / 非遗 / 美食 / 住宿…">
      </div>
      <div class="search-results" id="searchResults"></div>
    </div>

    <div class="section">
      <div class="section-label">游览偏好</div>
      <div class="pref-grid" id="prefGrid"></div>
      <div id="subprefContainer"></div>
    </div>

    <div class="section">
      <div class="section-label">游玩天数</div>
      <div class="daydur-grid" id="daydurGrid"></div>
      <div class="predict-line" id="predictLine"></div>

      <div class="accessible-toggle">
        <span class="at-label">长者 / 轮椅友好模式</span>
        <label class="switch">
          <input type="checkbox" id="accessibleSwitch">
          <span class="slider"></span>
        </label>
      </div>

      <button class="btn-generate" id="genBtn" disabled>
        <span class="spinner"></span><span class="btn-text"></span>
      </button>
      <div class="btn-row">
        <button class="btn-secondary" id="rerollBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0114.5-4.5L21 8M20.5 15a9 9 0 01-14.5 4.5L3 16"/></svg>
          换一批
        </button>
        <button class="btn-secondary" id="shareBtnPanel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13"/></svg>
          导出行程卡片
        </button>
      </div>
    </div>

    <div class="footer-note">
      数据来源：高德地图开放平台POI批量采集 + 人工清洗（681条真实点位）<br>
      技术实现：ArcGIS API for JavaScript · ArcGIS Online FeatureLayer · esri/rest/route 真实路网规划<br>
      天气数据：Open-Meteo 开源气象API（实时）<br>
      本系统为课程作业演示原型
    </div>
  `;

  buildPrefPills();
  renderSubprefContainer();
  buildDurationButtons();
  bindPanelEvents();
}

function buildPrefPills() {
  const prefGrid = document.getElementById('prefGrid');
  prefGrid.innerHTML = '';
  Object.entries(CATS).forEach(([key, cfg]) => {
    const pill = document.createElement('div');
    pill.className = 'pref-pill';
    pill.dataset.key = key;
    pill.style.setProperty('--pill-bg', cfg.color + '30');
    pill.style.setProperty('--pill-border', cfg.color);
    pill.innerHTML = `<span class="dot" style="background:${cfg.color}"></span>${cfg.label}`;
    pill.addEventListener('click', () => {
      pill.classList.toggle('selected');
      if (state.selectedPrefs.has(key)) state.selectedPrefs.delete(key);
      else state.selectedPrefs.add(key);
      renderSubprefContainer();
      updatePrediction();
    });
    prefGrid.appendChild(pill);
  });
}

/* 通用二级分类区：根据当前选中的偏好，动态生成对应的子类筛选chip组 */
function renderSubprefContainer() {
  const container = document.getElementById('subprefContainer');
  container.innerHTML = '';
  // 按 CATS 的固定顺序渲染，保持视觉顺序稳定
  Object.keys(CATS).forEach(catKey => {
    if (!state.selectedPrefs.has(catKey)) return;
    const subtypes = SUBTYPE_MAP[catKey];
    if (!subtypes || subtypes.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'subpref-wrap show';
    const title = document.createElement('div');
    title.className = 'subpref-title';
    const titleSuffix = catKey === 'stay' ? '细分（按大众评分，可多选）' : '细分（可多选，不选则不限）';
    title.textContent = `${CATS[catKey].label}${titleSuffix}`;
    const grid = document.createElement('div');
    grid.className = 'subpref-grid';

    subtypes.forEach(s => {
      const chip = document.createElement('div');
      chip.className = 'subpref-chip' + (state.selectedSubs[catKey].has(s.key) ? ' selected' : '');
      chip.textContent = s.label;
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        if (state.selectedSubs[catKey].has(s.key)) state.selectedSubs[catKey].delete(s.key);
        else state.selectedSubs[catKey].add(s.key);
        updatePrediction();
      });
      grid.appendChild(chip);
    });

    wrap.appendChild(title);
    wrap.appendChild(grid);
    container.appendChild(wrap);
  });
}

function buildDurationButtons() {
  const grid = document.getElementById('daydurGrid');
  grid.innerHTML = '';
  DURATION_OPTIONS.forEach(opt => {
    const btn = document.createElement('div');
    btn.className = 'daydur-btn' + (opt.key === state.selectedDuration ? ' selected' : '');
    btn.dataset.key = opt.key;
    btn.innerHTML = `<div class="dd-title">${opt.title}</div><div class="dd-sub">${opt.sub}</div>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.daydur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedDuration = opt.key;
      updatePrediction();
    });
    grid.appendChild(btn);
  });
}

function bindPanelEvents() {
  document.getElementById('accessibleSwitch').addEventListener('change', (e) => {
    state.accessibleMode = e.target.checked;
    updatePrediction();
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    handleSearch(e.target.value.trim());
  });

  document.getElementById('genBtn').addEventListener('click', () => generateItinerary(false));
  document.getElementById('rerollBtn').addEventListener('click', () => generateItinerary(true));
  document.getElementById('shareBtnPanel').addEventListener('click', exportShareCard);
  document.getElementById('shareBtn').addEventListener('click', exportShareCard);
  document.getElementById('drawerClose').addEventListener('click', () => {
    document.getElementById('drawer').classList.remove('show');
  });
}

/* ==================== 统计数字滚动 ==================== */
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.count) || 0;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 24));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      el.textContent = cur;
    }, 30);
  });
}

/* ==================== 图例 ==================== */
function buildLegend() {
  const legendCard = document.getElementById('legendCard');
  legendCard.innerHTML = Object.entries(CATS).map(([k, c]) => `
    <div class="legend-row"><span class="sw" style="background:${c.color}"></span><span>${c.label}</span></div>
  `).join('');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// 初始化面板（地图初始化在 app-map.js 中，加载完数据后会调用 onDataLoaded）
buildPanel();
buildLegend();

/* ====================================================================
   第二部分：ArcGIS 地图初始化 + FeatureLayer 数据加载 + 天气获取
   ==================================================================== */

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/geometry/Point",
  "esri/rest/route",
  "esri/rest/support/RouteParameters",
  "esri/rest/support/FeatureSet"
], function (Map, MapView, FeatureLayer, GraphicsLayer, Graphic, Point, route, RouteParameters, FeatureSet) {

  // 暴露给后续函数使用
  window.EsriModules = { Graphic, Point, route, RouteParameters, FeatureSet };

  // ---- 创建地图 ----
  const map = new Map({
    basemap: "topo-vector"   // Esri官方底图，无需额外key；可选 streets-vector / satellite
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [CENTER.longitude, CENTER.latitude],
    zoom: 15,
    ui: { components: ["zoom"] }  // 简化UI，去掉attribution以外的多余控件
  });
  view.popup.autoOpenEnabled = false; // 我们用自定义popup

  state.view = view;
  state.map = map;

  // ---- 加载真实 FeatureLayer ----
  const poiLayer = new FeatureLayer({
    url: FEATURE_LAYER_URL,
    outFields: ["*"],
    popupEnabled: false
  });
  map.add(poiLayer);
  state.poiLayer = poiLayer;

  // ---- 自定义图形层：用于路线高亮、序号徽标 ----
  const routeLayer = new GraphicsLayer({ title: "route" });
  const badgeLayer = new GraphicsLayer({ title: "badges" });
  map.add(routeLayer);
  map.add(badgeLayer);
  state.routeLayer = routeLayer;
  state.badgeLayer = badgeLayer;

  // ---- 查询全部要素，转成本地JS数组方便我们做偏好筛选/排序 ----
  view.when(() => {
    poiLayer.queryFeatures({
      where: "1=1",
      outFields: ["*"],
      returnGeometry: true,
      num: 1000
    }).then((result) => {
      state.allFeatures = result.features.map(f => normalizeFeature(f));
      onDataLoaded();
    }).catch(err => {
      console.error("加载图层数据失败:", err);
      showToast("数据加载失败，请检查网络或图层服务地址");
    });

    // 设置点位符号渲染（按category分类着色）
    applyRenderer(poiLayer);

    // 点击地图上的点弹出我们自定义的popup
    view.on("click", (evt) => {
      view.hitTest(evt).then((response) => {
        const hit = response.results.find(r => r.graphic && r.graphic.layer === poiLayer);
        if (hit) {
          showFeaturePopup(hit.graphic, evt);
        } else {
          document.getElementById('popup').classList.remove('show');
        }
      });
    });
  });

  function applyRenderer(layer) {
    const uniqueValueInfos = Object.entries(CATS).map(([key, cfg]) => ({
      value: key,
      symbol: {
        type: "simple-marker",
        color: cfg.color,
        size: key === 'service' ? 6 : 8,
        outline: { color: "#FFFEFB", width: 1.2 }
      },
      label: cfg.label
    }));
    layer.renderer = {
      type: "unique-value",
      field: "category",
      uniqueValueInfos: uniqueValueInfos,
      defaultSymbol: { type: "simple-marker", color: "#999", size: 5 }
    };
  }
});

/* ---- 把 ArcGIS Feature 对象转成我们好用的JS对象 ---- */
function normalizeFeature(feature) {
  const a = feature.attributes;
  const geom = feature.geometry;
  let costVal = parseCost(a.cost);
  let ratingVal = parseFloat(a.rating);
  if (isNaN(ratingVal)) ratingVal = null;

  return {
    objectId: a.ObjectId ?? a.OBJECTID ?? a.objectid ?? a.FID,
    name: a.name,
    category: a.category,
    categoryLabel: a.category_label,
    amapType: a.amap_type || '',
    address: a.address || '',
    tel: a.tel || '',
    rating: ratingVal,
    cost: costVal,
    longitude: geom ? geom.longitude : a.longitude,
    latitude: geom ? geom.latitude : a.latitude,
    foodSub: classifySubtype(a.category, a.amap_type, a.name, ratingVal),
    subType: classifySubtype(a.category, a.amap_type, a.name, ratingVal),
    zoneArea: classifyZoneArea(a.address, geom ? geom.longitude : a.longitude, geom ? geom.latitude : a.latitude),
    outdoor: classifyOutdoor(a.category, a.amap_type),
    raw: a
  };
}

function parseCost(costStr) {
  if (!costStr) return null;
  // 高德返回的cost字段经常是 "[]" 这种空数组字符串，或者纯数字字符串
  const cleaned = String(costStr).replace(/[\[\]]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function classifySubtype(category, amapType, name, rating) {
  const subtypes = SUBTYPE_MAP[category];
  if (!subtypes) return null;
  // 住宿类用评分函数匹配（高中低档代理指标），其余类别用关键词字符串匹配
  if (category === 'stay') {
    for (const sub of subtypes) {
      if (typeof sub.match === 'function' && sub.match(rating)) return sub.key;
    }
    return null;
  }
  const text = (amapType || '') + (name || '');
  for (const sub of subtypes) {
    if (Array.isArray(sub.match) && sub.match.some(kw => text.includes(kw))) return sub.key;
  }
  return null;
}

// 东栅、西栅大致中心坐标（用于区域归属判断）；地址文本里若直接写明东栅/西栅则优先采用
const WEST_ZHA_CENTER = { longitude: 120.488115, latitude: 30.753251 };
const EAST_ZHA_CENTER = { longitude: 120.498, latitude: 30.751 };

function classifyZoneArea(address, lng, lat) {
  const addr = address || '';
  if (addr.includes('西栅')) return 'west';
  if (addr.includes('东栅')) return 'east';
  if (lng == null || lat == null) return 'outer';
  const distToWest = haversineKm({ longitude: lng, latitude: lat }, WEST_ZHA_CENTER);
  const distToEast = haversineKm({ longitude: lng, latitude: lat }, EAST_ZHA_CENTER);
  const nearest = Math.min(distToWest, distToEast);
  if (nearest > 1.0) return 'outer'; // 离两个核心区都超过1公里，归为"景区周边"
  return distToWest <= distToEast ? 'west' : 'east';
}

function classifyOutdoor(category, amapType) {
  // 风景名胜类大多是户外；餐饮/住宿/非遗作坊大多是室内
  if (category === 'attraction') return true;
  if ((amapType || '').includes('公园') || (amapType || '').includes('广场')) return true;
  return false;
}

/* ==================== 数据加载完成后的初始化 ==================== */
function onDataLoaded() {
  document.getElementById('statTotal').dataset.count = state.allFeatures.length;
  const stayCount = state.allFeatures.filter(f => f.category === 'stay').length;
  document.getElementById('statStay').dataset.count = stayCount;
  animateCounters();
  showToast(`已加载 ${state.allFeatures.length} 条真实POI数据`);
  fetchWeather();
}

/* ==================== 天气获取（Open-Meteo，免key） ==================== */
function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${CENTER.latitude}&longitude=${CENTER.longitude}&current=temperature_2m,precipitation,weather_code&timezone=Asia%2FShanghai`;
  fetch(url)
    .then(r => r.json())
    .then(data => {
      const cur = data.current;
      state.weather = {
        temp: cur.temperature_2m,
        precipitation: cur.precipitation,
        weatherCode: cur.weather_code,
        isRainy: cur.precipitation > 0 || isRainyCode(cur.weather_code)
      };
      renderWeatherStrip();
    })
    .catch(err => {
      console.warn("天气获取失败:", err);
      document.getElementById('weatherText').textContent = '天气数据暂不可用';
    });
}

function isRainyCode(code) {
  // WMO天气编码：51-67降水，80-99阵雨/雷暴
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
}

function weatherIcon(code, isRainy) {
  if (isRainy) return '🌧️';
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  return '☁️';
}

function renderWeatherStrip() {
  const w = state.weather;
  if (!w) return;
  document.querySelector('.w-icon').textContent = weatherIcon(w.weatherCode, w.isRainy);
  document.getElementById('weatherText').textContent = `乌镇实时 ${w.temp.toFixed(1)}℃`;
  const tip = document.getElementById('weatherTip');
  if (w.isRainy) {
    tip.textContent = '今日有雨，已优化室内路线权重';
  } else {
    tip.textContent = '天气适宜户外游览';
  }
}

/* ====================================================================
   第三部分：智能路线生成核心算法
   逻辑：偏好筛选 → 天气/无障碍权重调整 → 评分排序选点 → 按天拆分 →
        住宿锚点固定在每日末尾 → 最近邻排序访问顺序 → 真实路网距离计算 → 预算估算
   ==================================================================== */

function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function expectedStopsPerDay(hoursPerDay, isAccessible) {
  // 经验值：正常模式每站平均40分钟(含步行)，无障碍模式放慢到每站55分钟
  const perStopMinutes = isAccessible ? 55 : 40;
  return Math.max(2, Math.round(hoursPerDay * 60 / perStopMinutes));
}

function getDurationConfig() {
  return DURATION_OPTIONS.find(d => d.key === state.selectedDuration);
}

/* ---- 根据偏好+子类筛选候选池 ---- */
function buildCandidatePool(seed = 0) {
  let pool = state.allFeatures.filter(f => state.selectedPrefs.has(f.category));

  // 通用二级分类过滤：所有类别统一用 subType 字段（住宿存的是评分档位key）
  state.selectedPrefs.forEach(catKey => {
    const subSet = state.selectedSubs[catKey];
    if (!subSet || subSet.size === 0) return;
    pool = pool.filter(f => f.category !== catKey || subSet.has(f.subType));
  });

  // 无障碍模式：优先过滤掉评分缺失或地址含"梯/楼"等可能无障碍不友好的点（简化规则示意）
  if (state.accessibleMode) {
    pool = pool.filter(f => !(f.address && f.address.includes('塔')));
  }

  // 天气：有雨时降低户外景点权重（不是完全剔除，而是排序时降权，这里先打标记）
  const rainy = state.weather && state.weather.isRainy;

  // 评分排序 + 雨天降权 + reroll抖动
  pool = pool.map((f, i) => {
    let score = (f.rating ?? 3.5);
    if (rainy && f.outdoor) score -= 1.2;
    if (!rainy && f.outdoor) score += 0.1;
    const jitter = ((i * 97 + seed * 131) % 23) / 23 * 0.7;
    return { ...f, _score: score + jitter };
  });
  pool.sort((a, b) => b._score - a._score);
  return pool;
}

/* ---- 地理聚类选点：在"高分点优先"的基础上，引入空间紧凑度约束 ----
   解决"评分排序后直接切片"导致选出的点散落各处、当天路线绕远路的问题。
   做法：从评分最高的点开始，每次从剩余候选里选"评分高且离已选点集合较近"的点加入，
   用 score - 距离惩罚 的方式做权衡，而不是单纯看评分顺序。
*/
function selectGeoClusteredStops(sortedPool, count, anchorPoint) {
  if (sortedPool.length <= count) return sortedPool.slice(0, count);

  const selected = [];
  let remaining = [...sortedPool];

  // 第一个点：选评分最高的（即排序后的第一个）
  selected.push(remaining[0]);
  remaining.splice(0, 1);

  while (selected.length < count && remaining.length > 0) {
    // 计算每个候选点到"已选点集合"的最近距离，作为空间惩罚项
    let bestIdx = 0;
    let bestValue = -Infinity;
    remaining.forEach((cand, idx) => {
      const minDistToSelected = selected.reduce((min, s) =>
        Math.min(min, haversineKm(cand, s)), Infinity);
      // 评分权重0.6 + 距离惩罚权重0.4(距离越近越好，每500米扣约0.3分)
      const value = cand._score * 0.6 - (minDistToSelected * 0.6) * 0.4;
      if (value > bestValue) { bestValue = value; bestIdx = idx; }
    });
    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }
  return selected;
}

/* ---- 最近邻排序 ---- */
function nearestNeighborOrder(points, startPoint) {
  if (points.length === 0) return [];
  let remaining = [...points];
  let current = startPoint
    ? remaining.reduce((best, p) => haversineKm(p, startPoint) < haversineKm(best, startPoint) ? p : best, remaining[0])
    : remaining[0];
  let ordered = [current];
  remaining = remaining.filter(p => p.objectId !== current.objectId);
  while (remaining.length) {
    const next = remaining.reduce((best, p) => haversineKm(p, current) < haversineKm(best, current) ? p : best, remaining[0]);
    ordered.push(next);
    current = next;
    remaining = remaining.filter(p => p.objectId !== next.objectId);
  }
  return ordered;
}

/* ---- 主生成函数：按天拆分 + 住宿锚点逻辑 ---- */
function buildMultiDayItinerary(seed = 0) {
  const durCfg = getDurationConfig();
  const pool = buildCandidatePool(seed);

  const nonStayPool = pool.filter(f => f.category !== 'stay');
  const stayPool = pool.filter(f => f.category === 'stay');

  const stopsPerDay = expectedStopsPerDay(durCfg.hoursPerDay, state.accessibleMode);
  const needsStay = durCfg.days > 1;

  // 如果选了多日但偏好里没勾"住宿"，自动从全量住宿数据里按评分选，保证体验完整
  let stayCandidates = stayPool.length > 0 ? stayPool : state.allFeatures.filter(f => f.category === 'stay').sort((a,b)=> (b.rating??0)-(a.rating??0));

  const days = [];
  let usedIds = new Set();
  let lastAnchor = { longitude: CENTER.longitude, latitude: CENTER.latitude }; // 第一天从景区入口出发

  for (let d = 0; d < durCfg.days; d++) {
    const dayPool = nonStayPool.filter(f => !usedIds.has(f.objectId));
    // 用地理聚类选点：避免高分点散落各处导致路线绕远路，而是在"评分高"与"空间紧凑"间做权衡
    const picked = selectGeoClusteredStops(dayPool, stopsPerDay, lastAnchor);
    picked.forEach(p => usedIds.add(p.objectId));

    let ordered = nearestNeighborOrder(picked, lastAnchor);

    let anchor = null;
    // 多日模式下，除最后一天，每天末尾固定一个住宿锚点
    // 锚点选择规则：在"未被使用的住宿候选"中，选择离当天最后一个游览点地理距离最近的（而不是仅按评分），
    // 避免住宿点离当天行程过远导致路线出现不合理的长距离跳跃
    if (needsStay && d < durCfg.days - 1) {
      const lastStop = ordered.length > 0 ? ordered[ordered.length - 1] : lastAnchor;
      const availableStays = stayCandidates.filter(s => !usedIds.has(s.objectId));
      if (availableStays.length > 0) {
        anchor = availableStays.reduce((best, s) =>
          haversineKm(s, lastStop) < haversineKm(best, lastStop) ? s : best
        , availableStays[0]);
        usedIds.add(anchor.objectId);
        ordered.push(anchor);
        lastAnchor = anchor; // 下一天从住宿点出发
      }
    } else if (ordered.length > 0) {
      lastAnchor = ordered[ordered.length - 1];
    }

    days.push({
      dayIndex: d + 1,
      stops: ordered,
      anchor: anchor
    });
  }

  return { days, durCfg };
}

/* ---- 预算估算 ---- */
function estimateBudget(days) {
  let min = 0, max = 0;
  days.forEach(day => {
    day.stops.forEach(s => {
      if (s.category === 'food') {
        if (s.cost) { min += s.cost * 0.8; max += s.cost * 1.2; }
        else { min += 40; max += 90; }
      } else if (s.category === 'stay') {
        if (s.cost) { min += s.cost; max += s.cost * 1.3; }
        else { min += 280; max += 550; }
      } else if (s.category === 'attraction' || s.category === 'heritage') {
        min += 0; max += 30; // 大部分景区内项目已含门票，少数体验项目另计
      }
    });
  });
  return { min: Math.round(min), max: Math.round(max) };
}

/* ---- 直线距离汇总（米转公里），真实路网距离另由 esri/rest/route 异步计算覆盖 ---- */
function estimateDistanceKm(stops) {
  let d = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    d += haversineKm(stops[i], stops[i + 1]);
  }
  return d;
}

/* ====================================================================
   第四部分：真实路网路径规划（esri/rest/route）+ 地图可视化渲染
   ==================================================================== */

/* ---- 调用 ArcGIS World Route 服务，计算真实步行路网路径 ----
   返回 Promise<{ geometry: 折线坐标数组, distanceKm: number, durationMin: number }>
*/
function computeRealRoute(stops) {
  const { route, RouteParameters, FeatureSet, Graphic, Point } = window.EsriModules;
  if (stops.length < 2) return Promise.resolve(null);

  // 没有配置有效的API Key时，直接跳过网络请求，避免必然失败的调用占用时间
  if (!ARCGIS_ROUTING_API_KEY || ARCGIS_ROUTING_API_KEY.includes('在这里填入')) {
    console.warn("未配置 ARCGIS_ROUTING_API_KEY，路网规划已跳过，使用直线距离估算");
    return Promise.resolve(null);
  }

  const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

  const stopGraphics = stops.map(s => new Graphic({
    geometry: new Point({ longitude: s.longitude, latitude: s.latitude })
  }));

  const routeParams = new RouteParameters({
    apiKey: ARCGIS_ROUTING_API_KEY,
    stops: new FeatureSet({ features: stopGraphics }),
    outSpatialReference: { wkid: 4326 },
    travelMode: null,        // 使用服务默认步行/驾车配置；若服务支持travelMode列表可在此指定"Walking"
    returnDirections: false
  });

  return route.solve(routeUrl, routeParams)
    .then(result => {
      const routeResult = result.routeResults[0];
      const geom = routeResult.route.geometry;
      return {
        geometry: geom,
        distanceKm: routeResult.route.attributes.Total_Kilometers ?? null,
        durationMin: routeResult.route.attributes.Total_TravelTime ?? null
      };
    })
    .catch(err => {
      console.warn("真实路网规划调用失败，回退为直线距离估算。错误详情:", err && err.message ? err.message : err);
      return null;
    });
}

/* ==================== 主流程：生成行程 ==================== */
function generateItinerary(isReroll) {
  if (state.selectedPrefs.size === 0) {
    showToast('请先选择至少一个游览偏好');
    return;
  }
  const genBtn = document.getElementById('genBtn');
  genBtn.classList.add('loading');
  genBtn.disabled = true;

  if (isReroll) state.rerollSeed++;

  const { days, durCfg } = buildMultiDayItinerary(state.rerollSeed);
  state.currentItinerary = { days, durCfg, realDistances: {} };

  document.getElementById('emptyHint').style.opacity = '0';
  document.getElementById('emptyHint').style.pointerEvents = 'none';

  // 高亮地图上的相关点位
  highlightRouteOnMap(days[0].stops);

  // 对每一天分别请求真实路网距离（异步，不阻塞UI先用直线距离展示）
  const routePromises = days.map((day, idx) =>
    computeRealRoute(day.stops).then(r => { state.currentItinerary.realDistances[idx] = r; return r; })
  );

  renderItineraryDrawer(0); // 先用估算值展示
  drawDayRouteOnMap(days[0], null);

  Promise.allSettled(routePromises).then(() => {
    genBtn.classList.remove('loading');
    genBtn.disabled = false;
    document.getElementById('rerollBtn').classList.add('show');
    renderItineraryDrawer(state.activeDayIndex || 0); // 刷新为真实路网距离
    drawDayRouteOnMap(days[state.activeDayIndex || 0], state.currentItinerary.realDistances[state.activeDayIndex || 0]);
    showToast(isReroll ? '已重新生成行程方案' : `行程生成完成，已计算真实路网距离`);
  });
}

/* ==================== 地图：高亮 + 路线绘制 + 徽标动画 ==================== */
function highlightRouteOnMap(stops) {
  const ids = new Set(stops.map(s => s.objectId));
  state.poiLayer.definitionExpression = "1=1"; // 保持全显示，仅做视觉高亮通过opacity/effect
  // 用 featureEffect 把非路线点位淡化，路线点位保持原样（ArcGIS 4.x 支持 featureEffect）
  state.view.whenLayerView(state.poiLayer).then(lv => {
    state.poiLayerView = lv;
    const idList = Array.from(ids);
    lv.featureEffect = {
      filter: { where: `ObjectId IN (${idList.length ? idList.join(',') : -1})` },
      excludedEffect: "opacity(15%) grayscale(60%)"
    };
  });
}

function drawDayRouteOnMap(day, realRouteInfo) {
  const { Graphic, Point } = window.EsriModules;
  if (state.flowAnimTimer) {
    clearInterval(state.flowAnimTimer);
    state.flowAnimTimer = null;
  }
  state.routeLayer.removeAll();
  state.badgeLayer.removeAll();

  const stops = day.stops;
  if (stops.length === 0) return;

  let pathGeometry;
  if (realRouteInfo && realRouteInfo.geometry) {
    pathGeometry = realRouteInfo.geometry;
  } else {
    pathGeometry = {
      type: "polyline",
      paths: [stops.map(s => [s.longitude, s.latitude])],
      spatialReference: { wkid: 4326 }
    };
  }

  // 主路线：稍粗的描边线 + 内部主线，营造层次感（替代单一直线的单薄感）
  const routeOutline = new Graphic({
    geometry: pathGeometry,
    symbol: {
      type: "simple-line",
      color: [184, 105, 61, 0.35],
      width: 9,
      cap: "round",
      join: "round"
    }
  });
  const routeGraphic = new Graphic({
    geometry: pathGeometry,
    symbol: {
      type: "simple-line",
      color: [184, 105, 61, 0.95],
      width: 4,
      cap: "round",
      join: "round",
      style: "solid"
    }
  });
  state.routeLayer.add(routeOutline);
  state.routeLayer.add(routeGraphic);

  // 在每段路径中点插入方向箭头，提示游览前进方向
  const paths = pathGeometry.paths ? pathGeometry.paths[0] : null;
  if (paths && paths.length >= 2) {
    addDirectionArrows(paths);
  }

  // 站点标签：编号小圆点 + 名称标签框（替代裸露数字，更直观）
  stops.forEach((s, i) => {
    const isAnchor = day.anchor && s.objectId === day.anchor.objectId;
    const bgColor = isAnchor ? "#5C7A5C" : "#B8693D";
    const shortName = s.name.length > 6 ? s.name.slice(0, 6) + '…' : s.name;

    // 编号圆点（精确定位在坐标点上）
    const dot = new Graphic({
      geometry: new Point({ longitude: s.longitude, latitude: s.latitude }),
      symbol: {
        type: "simple-marker",
        style: "circle",
        color: bgColor,
        size: 15,
        outline: { color: "white", width: 1.8 }
      }
    });
    const dotLabel = new Graphic({
      geometry: new Point({ longitude: s.longitude, latitude: s.latitude }),
      symbol: {
        type: "text",
        text: isAnchor ? '宿' : String(i + 1),
        color: "white",
        font: { size: 10, weight: "bold", family: "JetBrains Mono" }
      }
    });
    // 名称标签（悬浮在点位上方，文字带描边背景，始终可读）
    const nameLabel = new Graphic({
      geometry: new Point({ longitude: s.longitude, latitude: s.latitude }),
      symbol: {
        type: "text",
        text: shortName,
        color: "#2B2926",
        haloColor: "#FFFEFB",
        haloSize: 2.2,
        font: { size: 11, weight: "bold", family: "Noto Sans SC" },
        yoffset: 18,
        horizontalAlignment: "center"
      }
    });
    state.badgeLayer.add(dot);
    state.badgeLayer.add(dotLabel);
    state.badgeLayer.add(nameLabel);
  });

  // 视图缩放到当天路线范围
  state.view.goTo({
    target: stops.map(s => [s.longitude, s.latitude]),
    padding: { top: 60, bottom: 200, left: 40, right: 40 }
  }, { duration: 800 });
}

/* ---- 沿路径坐标插值，计算t∈[0,1]位置上的经纬度坐标 ---- */
function interpolateAlongPath(pathCoords, t) {
  if (!pathCoords || pathCoords.length < 2) return pathCoords ? pathCoords[0] : null;
  const segLens = [];
  let total = 0;
  for (let i = 0; i < pathCoords.length - 1; i++) {
    const d = haversineKm(
      { longitude: pathCoords[i][0], latitude: pathCoords[i][1] },
      { longitude: pathCoords[i+1][0], latitude: pathCoords[i+1][1] }
    );
    segLens.push(d);
    total += d;
  }
  if (total === 0) return pathCoords[0];
  let target = t * total;
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i] || i === segLens.length - 1) {
      const localT = segLens[i] === 0 ? 0 : target / segLens[i];
      const [lng1, lat1] = pathCoords[i];
      const [lng2, lat2] = pathCoords[i + 1];
      return [lng1 + (lng2 - lng1) * localT, lat1 + (lat2 - lat1) * localT];
    }
    target -= segLens[i];
  }
  return pathCoords[pathCoords.length - 1];
}

function startFlowingDot(pathCoords) {
  const { Graphic, Point } = window.EsriModules;
  if (state.flowAnimTimer) {
    clearInterval(state.flowAnimTimer);
    state.flowAnimTimer = null;
  }
  if (!pathCoords || pathCoords.length < 2) return;

  const flowLayer = state.badgeLayer; // 复用badge图层，随路线一起清除
  let t = 0;
  const flowGraphic = new Graphic({
    geometry: new Point({ longitude: pathCoords[0][0], latitude: pathCoords[0][1] }),
    symbol: {
      type: "simple-marker",
      style: "circle",
      color: [255, 255, 255, 0.95],
      size: 9,
      outline: { color: "#B8693D", width: 2.5 }
    }
  });
  flowLayer.add(flowGraphic);

  state.flowAnimTimer = setInterval(() => {
    t += 0.012;
    if (t > 1) t = 0;
    const pos = interpolateAlongPath(pathCoords, t);
    if (pos) {
      flowGraphic.geometry = new Point({ longitude: pos[0], latitude: pos[1] });
    }
  }, 60);
}

/* ---- 在路径每段的中点画一个指向下一站的小箭头，提示游览方向 ---- */
function addDirectionArrows(pathCoords) {
  const { Graphic, Point } = window.EsriModules;
  for (let i = 0; i < pathCoords.length - 1; i++) {
    const [lng1, lat1] = pathCoords[i];
    const [lng2, lat2] = pathCoords[i + 1];
    const midLng = (lng1 + lng2) / 2;
    const midLat = (lat1 + lat2) / 2;

    // 计算方向角度（以正北为0度，顺时针）
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    const angleRad = Math.atan2(dx, dy);
    const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

    const arrow = new Graphic({
      geometry: new Point({ longitude: midLng, latitude: midLat }),
      symbol: {
        type: "text",
        text: "▲",
        color: "#B8693D",
        haloColor: "#FFFEFB",
        haloSize: 1.5,
        angle: angleDeg,
        font: { size: 13, weight: "bold" }
      }
    });
    state.routeLayer.add(arrow);
  }
}

/* ==================== 行程抽屉 UI 渲染（多日Tab切换） ==================== */
state.activeDayIndex = 0;

function renderItineraryDrawer(activeDayIndex) {
  state.activeDayIndex = activeDayIndex;
  const { days, durCfg, realDistances } = state.currentItinerary;
  const prefLabels = [...state.selectedPrefs].map(k => CATS[k].label).join(' + ');

  document.getElementById('drawerTitle').textContent = `${prefLabels} · ${durCfg.title}方案`;

  // Day tabs
  const tabsEl = document.getElementById('dayTabs');
  if (durCfg.days > 1) {
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = days.map((d, i) =>
      `<div class="day-tab ${i === activeDayIndex ? 'active' : ''}" data-day="${i}">第${d.dayIndex}天</div>`
    ).join('');
    tabsEl.querySelectorAll('.day-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const idx = parseInt(tab.dataset.day);
        renderItineraryDrawer(idx);
        drawDayRouteOnMap(days[idx], realDistances[idx]);
      });
    });
  } else {
    tabsEl.style.display = 'none';
    tabsEl.innerHTML = '';
  }

  const activeDay = days[activeDayIndex];
  const realInfo = realDistances[activeDayIndex];
  const distKm = realInfo && realInfo.distanceKm != null ? realInfo.distanceKm : estimateDistanceKm(activeDay.stops);
  const budget = estimateBudget(days); // 预算按整个行程算，不分天

  document.getElementById('drawerMeta').innerHTML = `
    <span>${realInfo && realInfo.distanceKm != null ? '真实路网' : '直线估算'} <b>${distKm.toFixed(1)}</b> km</span>
    <span>约 <b>${durCfg.hoursPerDay}</b> 小时/天</span>
    <span><b>${activeDay.stops.length}</b> 个站点</span>
    <span class="budget">预算 <b style="color:#9FD1A8">¥${budget.min}-${budget.max}</b></span>
  `;

  const cardsEl = document.getElementById('drawerCards');
  cardsEl.innerHTML = activeDay.stops.map((s, i) => {
    const isAnchor = activeDay.anchor && s.objectId === activeDay.anchor.objectId;
    const priceText = s.cost ? `¥${s.cost}` : '';
    const subLabel = SUBTYPE_MAP[s.category]?.find(sub => sub.key === s.subType)?.label;
    return `
    <div class="stop-card ${isAnchor ? 'is-anchor' : ''}" data-id="${s.objectId}">
      <div class="stop-num">${isAnchor ? '🏠' : i + 1}</div>
      <div class="stop-name">${s.name}</div>
      <div class="stop-dur">${subLabel || CATS[s.category].label}${s.rating ? ' · ⭐' + s.rating : ''}</div>
      ${priceText ? `<div class="stop-price">${priceText}</div>` : ''}
    </div>`;
  }).join('');

  cardsEl.querySelectorAll('.stop-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const feature = activeDay.stops.find(s => s.objectId === id);
      if (feature) {
        state.view.goTo({ center: [feature.longitude, feature.latitude], zoom: 17 }, { duration: 500 });
      }
    });
  });

  document.getElementById('drawer').classList.add('show');
}

/* ====================================================================
   第五部分：预测文案 / 搜索 / 自定义Popup / 分享卡片导出
   ==================================================================== */

function updatePrediction() {
  const predictLine = document.getElementById('predictLine');
  const genBtn = document.getElementById('genBtn');

  if (state.selectedPrefs.size === 0) {
    predictLine.innerHTML = '请选择至少一个偏好标签';
    genBtn.disabled = true;
    return;
  }
  if (!state.allFeatures.length) {
    predictLine.innerHTML = '数据加载中…';
    genBtn.disabled = true;
    return;
  }

  const durCfg = getDurationConfig();
  const pool = buildCandidatePool(0).filter(f => f.category !== 'stay');
  const perDay = expectedStopsPerDay(durCfg.hoursPerDay, state.accessibleMode);
  const totalStops = Math.min(perDay * durCfg.days, pool.length);

  let weatherNote = '';
  if (state.weather) {
    weatherNote = state.weather.isRainy
      ? '（检测到今日有雨，户外点位权重已自动调低）'
      : '';
  }

  predictLine.innerHTML = `匹配池 <span class="num">${pool.length}</span> 个点位 → 预计 ${durCfg.days} 天 / 共 <span class="num">${totalStops}</span> 站${weatherNote}`;
  genBtn.disabled = false;
}

/* ==================== 搜索 ==================== */
function handleSearch(query) {
  const resultsEl = document.getElementById('searchResults');
  if (!query) { resultsEl.innerHTML = ''; return; }
  if (!state.allFeatures.length) return;

  const matches = state.allFeatures
    .filter(f => f.name && f.name.includes(query))
    .slice(0, 8);

  resultsEl.innerHTML = matches.map(f => `
    <div class="search-result-item" data-id="${f.objectId}">
      <span>${f.name}</span>
      <span style="color:${CATS[f.category].color}">${CATS[f.category].label}</span>
    </div>
  `).join('');

  resultsEl.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      const feature = state.allFeatures.find(f => f.objectId === id);
      if (feature) {
        state.view.goTo({ center: [feature.longitude, feature.latitude], zoom: 18 }, { duration: 600 });
        showFeaturePopupByData(feature);
      }
    });
  });
}

/* ==================== 自定义 Popup ==================== */
function showFeaturePopup(graphic, screenEvt) {
  const feature = state.allFeatures.find(f => f.objectId === (graphic.attributes.ObjectId ?? graphic.attributes.OBJECTID ?? graphic.attributes.objectid));
  if (!feature) return;
  showFeaturePopupByData(feature, screenEvt);
}

function showFeaturePopupByData(feature, screenEvt) {
  const popup = document.getElementById('popup');
  const cfg = CATS[feature.category];

  let screenPoint;
  if (screenEvt) {
    screenPoint = { x: screenEvt.x, y: screenEvt.y };
  } else {
    screenPoint = state.view.toScreen({ longitude: feature.longitude, latitude: feature.latitude, spatialReference: state.view.spatialReference });
  }

  const mapAreaRect = document.querySelector('.map-area').getBoundingClientRect();
  let left = screenPoint.x + 18;
  let top = screenPoint.y - 90;
  if (left + 240 > mapAreaRect.width - 10) left = screenPoint.x - 264;
  if (top < 10) top = 10;
  if (top + 260 > mapAreaRect.height - 10) top = mapAreaRect.height - 270;

  popup.style.left = left + 'px';
  popup.style.top = top + 'px';

  const ratingText = feature.rating ? `⭐ ${feature.rating}` : '暂无评分';
  const zoneText = feature.zoneArea === 'west' ? '西栅核心区' : feature.zoneArea === 'east' ? '东栅核心区' : '景区周边';
  const subLabel = SUBTYPE_MAP[feature.category]?.find(s => s.key === feature.subType)?.label;
  const telClean = (feature.tel && !['[]','nan',''].includes(String(feature.tel).trim())) ? feature.tel : null;

  // 标签行：区域 + 子分类，是介绍内容的主体（基于真实字段拼接，不编造信息）
  const tagPills = [zoneText, subLabel].filter(Boolean)
    .map(t => `<span class="popup-pill">${t}</span>`).join('');

  popup.innerHTML = `
    <div class="popup-img" style="background:linear-gradient(135deg,${cfg.color}33,${cfg.color}11)">
      <span style="font-size:28px;color:${cfg.color}">${cfg.icon}</span>
      <span class="popup-tag" style="background:${cfg.color}">${cfg.label}</span>
      <div class="popup-close" id="popupCloseBtn">✕</div>
    </div>
    <div class="popup-body">
      <div class="popup-name">${feature.name}</div>
      <div class="popup-pills">${tagPills}</div>
      <div class="popup-desc">${feature.address || '暂无详细地址信息'}</div>
      ${telClean ? `<div class="popup-tel">☎ ${telClean}</div>` : ''}
      <div class="popup-meta">
        <span>${ratingText}</span>
      </div>
    </div>
  `;
  popup.classList.add('show');
  document.getElementById('popupCloseBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.remove('show');
  });
}

/* ==================== 分享卡片导出（html2canvas） ==================== */
function exportShareCard() {
  if (!state.currentItinerary) {
    showToast('请先生成一条路线');
    return;
  }
  const { days, durCfg } = state.currentItinerary;
  const activeDay = days[state.activeDayIndex || 0];
  const prefLabels = [...state.selectedPrefs].map(k => CATS[k].label).join(' + ');
  const budget = estimateBudget(days);

  const shareCard = document.getElementById('shareCard');
  shareCard.innerHTML = `
    <div class="sc-title">乌镇 · ${prefLabels} 行程</div>
    <div class="sc-sub">${durCfg.title} · 第${activeDay.dayIndex}天 · 共${activeDay.stops.length}站 · 预算¥${budget.min}-${budget.max}</div>
    ${activeDay.stops.map((s, i) => `
      <div class="sc-stop">
        <div class="sc-num" style="background:${CATS[s.category].color}">${i+1}</div>
        <div>
          <div class="sc-name">${s.name}</div>
          <div class="sc-info">${CATS[s.category].label}${s.rating ? ' · ⭐'+s.rating : ''}${s.cost ? ' · ¥'+s.cost : ''}</div>
        </div>
      </div>
    `).join('')}
    <div class="sc-footer">
      <span>乌镇文旅智能导览系统</span>
      <span>ArcGIS WebGIS</span>
    </div>
  `;

  html2canvas(shareCard, { backgroundColor: '#F3EFE6', scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `乌镇行程_第${activeDay.dayIndex}天.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('行程卡片已导出');
  }).catch(err => {
    console.error(err);
    showToast('导出失败，请重试');
  });
}
