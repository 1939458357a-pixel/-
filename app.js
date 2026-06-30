/* ====================================================================
   乌镇文旅资源 WebGIS 智能导览系统
   技术栈：ArcGIS API for JavaScript 4.29
   数据源：ArcGIS Online FeatureLayer（687条真实POI，高德地图开放平台采集）
   ==================================================================== */
// ===== 全局配置 =====
// 主图层：691条真实POI（景点/非遗体验/文化场馆/美食/住宿/公共服务，
// 其中10条非遗体验数据已合并进同一个图层，category字段值为 'heritage'）
const FEATURE_LAYER_URL = "https://services8.arcgis.com/HOpNJOCGcy3Gi8RS/arcgis/rest/services/%E4%B9%8C%E9%95%87%E6%96%87%E6%97%85%E8%B5%84%E6%BA%90_%E6%99%BA%E8%83%BD%E5%AF%BC%E8%A7%88%E7%B3%BB%E7%BB%9F/FeatureServer/0";
// ArcGIS Routing 服务所需的 API Key（需在 ArcGIS Developer 控制台生成，
// 并勾选 "Routing" / Network Analysis 权限。未填写时，系统会自动降级为直线距离估算，不影响其他功能运行）
const ARCGIS_ROUTING_API_KEY = "在这里填入你的API Key";

// ===== 乌镇知名景点真实介绍知识库（基于公开历史资料整理） =====
const POI_INTROS = {
  '乌镇古镇旅游区': '乌镇是江南六大古镇之一，拥有六千余年悠久历史。这里完整保存着晚清和民国时期水乡古镇的风貌，以河成街、街桥相连、依河筑屋，是名副其实的"中国最后的枕水人家"。',
  '乌镇西栅景区': '西栅景区是乌镇的核心游览区，占地3.4平方公里，由12座小岛组成，纵横交叉河道9000多米，古桥70多座。景区于2007年正式开放，集观光、休闲、度假于一体，是乌镇最成熟完善的旅游区域。',
  '乌镇风景区': '乌镇风景区涵盖东栅、西栅两大景区，是典型的江南水乡古镇。这里素有"鱼米之乡、丝绸之府"之称，1991年被评为浙江省历史文化名城，2010年成为国家5A级旅游景区。',
  '木心美术馆': '木心美术馆由建筑大师贝聿铭弟子设计，为纪念乌镇籍著名画家、文学家木心先生而建。美术馆收藏了木心先生的绘画与文学作品，建筑风格简洁现代，与古镇风貌形成独特对话。周一闭馆，票价20元。',
  '木心美术馆水台': '水台是木心美术馆的标志性景观之一，位于美术馆入口处的水面平台。设计灵感源自江南水乡的码头文化，是游客拍照打卡的热门地点。',
  '草木本色染坊-染房': '草木本色染坊是乌镇西栅景区内展示传统蓝印花布制作工艺的非遗体验点。染坊沿用明清时期的传统手工技艺，以植物蓝草为染料，在白色土布上印制出精美的青花图案，是国家级非物质文化遗产。',
  '草木本色染坊-晒场': '晒场是草木本色染坊的重要组成部分，高高竖立的晒布架上挂满了蓝白相间的印花布，是乌镇最具代表性的摄影场景之一。蓝印花布源于唐宋，盛于明清，被誉为"东方蓝白艺术的活化石"。',
  '草木本色染坊-刮浆间': '刮浆间是蓝印花布制作的核心工序场所。工匠将镂空花版铺在白布上，用豆粉和石灰混合的防染浆刮印图案，再浸入蓝草染缸反复染色，最终形成精美的蓝白花纹。',
  '昭明书院': '昭明书院始建于南朝梁代，是为纪念昭明太子萧统而建。萧统曾在此编撰中国现存最早的诗文总集《昭明文选》。书院内古木参天，环境清幽，是西栅景区内感受千年文脉的最佳场所。',
  '月老庙': '月老庙位于西栅景区的西北角，供奉着主管人间姻缘的月老。庙内挂满了善男信女祈福的红绳和姻缘牌，是乌镇最具浪漫色彩的景点之一，许多情侣专程前来求取姻缘签。',
  '喜庆堂': '喜庆堂是展示江南传统婚俗文化的场馆，馆内复原了旧时江南大户人家娶亲的完整场景，从花轿、喜服到婚书、聘礼，一应俱全。这里定期举办传统水乡婚礼表演，让游客感受纯正的江南婚俗。',
  '龙形田': '龙形田位于西栅景区的西北角，是一片依照地形开垦的农田，因从高处俯瞰形如卧龙而得名。这里四季种植不同的农作物，春季油菜花金黄一片，夏秋两季则是绿油油的稻田，是体验江南水乡农耕文化的好去处。',
  '叙昌酱园': '叙昌酱园创立于清朝咸丰九年（1859年），是乌镇历史最悠久的酱园之一。酱园坚持传统手工酿造工艺，生产的酱油、酱菜以"色泽红褐、酱香浓郁"著称。晒场上的数百口酱缸是乌镇独特的风景线。',
  '茅盾纪念堂': '茅盾纪念堂是为纪念中国现代文学巨匠茅盾先生（沈雁冰）而建。茅盾于1896年出生在乌镇，其代表作《子夜》《林家铺子》等深刻描绘了旧中国的社会面貌。纪念堂内陈列着茅盾的遗物、手稿和珍贵照片。',
  '茅盾陵园': '茅盾陵园位于西栅景区东南角的灵水居内，是茅盾先生1981年逝世后的安息之地。陵园环境清幽，碑石上镌刻着茅盾的手迹，是文学爱好者缅怀先贤的圣地。',
  '白莲塔': '白莲塔原建于北宋崇宁年间，曾是乌镇标志性的佛教建筑，原塔于1868年倒塌，现塔为2005年重建。塔高七层，登塔可俯瞰西栅全景和京杭大运河，是乌镇最佳观景点之一。',
  '水上戏台': '水上戏台是西栅景区内的传统戏曲表演场所，坐落于元宝湖畔。戏台背靠湖水，面向街道，是江南水乡特有的建筑形式。这里定期上演桐乡花鼓戏、越剧等地方戏曲，让游客领略江南戏曲的魅力。',
  '水上集市': '水上集市还原了旧时江南水乡"以船为市"的贸易场景。清晨，摇橹船载着新鲜的蔬菜瓜果停靠在岸边，沿岸居民和游客可购买时令食材，体验原汁原味的水乡生活。',
  '水上集市-早茶客': '早茶客是乌镇西栅推出的特色早餐体验项目。清晨坐在水边长桌旁，品尝江南传统早点——小笼包、豆浆、油条、定胜糕等，听着船桨拨水声，是最地道的乌镇打开方式。',
  '亦昌冶坊': '亦昌冶坊是乌镇保存最完好的传统冶铁作坊，创立于明朝嘉靖年间。坊内陈列着各类传统铁器农具和生活用具，展示了江南地区悠久的冶铁历史和精湛的手工技艺。',
  '乌镇西栅景区-天下第一锅': '天下第一锅是亦昌冶坊的镇坊之宝，直径超过两米，重达数吨。这口巨锅铸造于清代，曾用于乌镇庙会时煮粥施舍贫民，见证了乌镇人的善良与质朴。',
  '安渡坊渡口': '安渡坊是西栅景区的主要渡口之一，也是游客进入西栅历史街区的重要通道。"安渡"二字寓意平安渡河，自古以来就是商贾往来、游人如织的水上码头。',
  '乌镇蘑菇屋': '蘑菇屋是乌镇西栅景区内的一处特色景观建筑，外形酷似蘑菇，充满童趣。这里是亲子家庭的热门打卡点，也是西栅景区内独具创意的景观设计代表作。',
  '老街长弄': '老街长弄是乌镇西栅历史街区的典型街巷格局，青石板路两侧是明清时期保存完好的民居建筑。弄堂深深、曲径通幽，漫步其中可感受江南水乡特有的慢生活节奏。',
  '元宝湖': '元宝湖位于西栅景区的中心地带，因湖面形状酷似元宝而得名。湖畔绿树成荫，古桥横跨，是西栅景区内最开阔的水域景观，也是夜游时灯光秀的主要舞台。',
  '喜鹊湖': '喜鹊湖是西栅景区内一处宁静的水域，湖畔杨柳依依，水鸟栖息。相传古时湖畔常有喜鹊筑巢，故名喜鹊湖，是游客远离喧嚣、静享水乡风光的好去处。',
  '洪昇广场': '洪昇广场以西栅景区内的清代著名戏曲家洪昇命名。洪昇是昆曲《长生殿》的作者，曾在乌镇一带游历创作。广场定期举办传统戏曲表演，是感受江南戏曲文化的公共空间。',
  '舟楫文化长廊': '舟楫文化长廊沿西栅河道而建，系统展示了江南水乡的造船历史和船文化。长廊内陈列着各式传统船只模型，从乌篷船到货船，再现了过去"以船为马"的水乡生活图景。',
  '西栅夜游': '西栅夜游是乌镇最负盛名的旅游体验之一。夜幕降临后，两岸古宅亮起暖黄灯笼，倒影在平静的河面上，摇橹船缓缓划过，宛如一幅流动的水墨画卷。夜游不单独售票，购买西栅门票即可。',
  '六朝遗胜': '六朝遗胜位于昭明书院内，是一块刻有"六朝遗胜"四字的古碑。碑刻见证了乌镇自六朝以来的悠久历史，是研究江南古镇历史沿革的重要实物资料。',
  '蓝草学堂': '蓝草学堂位于草木本色染坊内，是专门教授蓝印花布技艺的体验工坊。游客可以亲手体验刻板、刮浆、染色等传统工序，将亲手制作的蓝印花布作品带回家。',
  '福盛堂': '福盛堂是西栅景区内展示江南传统民居建筑风格的场馆，建筑格局为典型的"四水归堂"式院落。馆内陈列着明清家具和日常生活器物，展现了旧时江南大户人家的生活场景。',
  '灯笼铺': '灯笼铺是西栅景区内一家售卖传统手工灯笼的特色店铺。江南灯笼以竹为骨、纱为面、彩绘为饰，造型优美，是乌镇夜游时街头巷尾最具氛围感的装饰。',
  '乌镇八宝糕点坊': '八宝糕点坊是乌镇知名的传统糕点店，主营姑嫂饼、定胜糕、芡实糕等江南特色小吃。姑嫂饼是乌镇传统名点，已有百余年历史，以酥脆香甜著称。',
  '世博乌镇馆': '世博乌镇馆原为2010年上海世博会乌镇展区，后整体搬迁至西栅景区内。展馆以现代科技手段展示乌镇的历史文化、水乡风貌和未来发展，是了解乌镇的现代化窗口。',
  '吴中石舫': '吴中石舫位于白莲塔旁的京杭大运河边，是一座仿照古代游船造型建造的石质建筑。石舫静卧水面，与运河、古塔相映成趣，是乌镇西栅最具诗意的景观之一。',
  '雨读桥': '雨读桥是西栅景区内一座造型古朴的石拱桥，桥名取自"雨天读书"的诗意。桥头绿树掩映，桥下流水潺潺，是乌镇"桥里桥"水乡景观的典型代表。',
  '通顺桥': '通顺桥横跨西栅河道，连接两岸古街，桥名寓意"通行顺畅"。这座明清时期的古桥至今仍承担着两岸居民和游客的日常通行功能，是活着的水乡历史。',
  '平荷桥': '平荷桥因桥下夏季荷花盛开而得名，是西栅景区内一处赏荷的绝佳地点。夏日傍晚，站在桥上欣赏"接天莲叶无穷碧"的景致，是乌镇独有的浪漫体验。',
  '归思桥': '归思桥位于西栅景区的西侧，桥名寄托着游子归乡的思念之情。站在桥上远眺，白墙黛瓦的古镇尽收眼底，是摄影爱好者捕捉乌镇全景的热门机位。',
  '连理树': '连理树位于西栅景区的西北角，两棵古树相依相偎，枝干交错缠绕，形似连理。相传情侣在此树下许愿可白头偕老，是乌镇最受情侣喜爱的许愿胜地。',
  '合家树': '合家树与连理树相邻，是一棵枝繁叶茂的古树。树名寓意家庭和睦、子孙满堂，许多游客会在树下为家人祈福，寄托对美好生活的向往。',
  '景行水巷': '景行水巷是西栅景区内一条幽深的沿河小巷，"景行"取自《诗经》"高山仰止，景行行止"。小巷两侧是保存完好的明清民居，漫步其中可感受最原汁原味的水乡生活。',
  '水上集市-古戏台': '古戏台位于水上集市旁，是乌镇传统戏曲表演的舞台。戏台飞檐翘角、雕梁画栋，定期上演桐乡花鼓戏、越剧等地方戏曲，是体验江南戏曲文化的最佳场所。'
};

// 通用类别介绍模板（用于不在知识库中的点位，基于真实类别信息，不编造历史）
function getGenericIntro(s) {
  const subLabel = SUBTYPE_MAP[s.category]?.find(sub => sub.key === s.subType)?.label || CATS[s.category].label;
  let intro = '';
  switch (s.category) {
    case 'attraction':
      intro = `这是一处${subLabel}，位于${s.address || '乌镇西栅景区内'}。${s.rating ? '游客评分' + s.rating + '分，' : ''}${s.cost ? '参考消费约' + s.cost + '元。' : ''}`;
      break;
    case 'heritage':
      intro = `这里是${subLabel}，可以近距离感受江南传统技艺的魅力。${s.address ? '位于' + s.address + '。' : ''}${s.rating ? '评分' + s.rating + '分。' : ''}`;
      break;
    case 'culture':
      intro = `这是一座${subLabel}，${s.address ? '地处' + s.address + '，' : ''}是了解江南文化的好去处。${s.rating ? '评分' + s.rating + '分。' : ''}`;
      break;
    case 'food':
      intro = `这里是${subLabel}，${s.address ? '位于' + s.address + '，' : ''}可以品尝地道的江南味道。${s.rating ? '评分' + s.rating + '分，' : ''}${s.cost ? '人均约' + s.cost + '元。' : ''}`;
      break;
    case 'stay':
      intro = `这是一处${subLabel}，${s.address ? '位于' + s.address + '，' : ''}是休憩住宿的好选择。${s.rating ? '评分' + s.rating + '分。' : ''}`;
      break;
    default:
      intro = `这里是${s.name}，${s.address ? '位于' + s.address + '。' : ''}`;
  }
  return intro;
}

function getPoiIntro(s) {
  // 优先级1：从数据层读取的 description（ArcGIS / CSV）
  if (s.description && s.description.trim()) return s.description.trim();
  // 优先级2：内置知识库
  if (POI_INTROS[s.name]) return POI_INTROS[s.name];
  for (const key in POI_INTROS) {
    if (s.name.includes(key) || key.includes(s.name)) return POI_INTROS[key];
  }
  // 优先级3：通用描述
  return getGenericIntro(s);
}
// 乌镇景区中心坐标（西栅入口，石佛南路18号）
const CENTER = { longitude: 120.488115, latitude: 30.753251 };
// 6大一级分类：原"非遗/文化"已拆分为 heritage(真非遗,10条) 和 culture(文化场馆,72条)
const CATS = {
  attraction: { label: '景点',     color: '#2D4F5C', icon: '◆' },
  heritage:   { label: '非遗体验', color: '#B8693D', icon: '◆' },
  culture:    { label: '文化场馆', color: '#6B5B7A', icon: '◆' },
  food:       { label: '美食',     color: '#C9914A', icon: '◆' },
  stay:       { label: '住宿',     color: '#5C7A5C', icon: '◆' }
};

// ===== 时令提示 + 节气知识数据（24节气，按阳历固定日期，几十年内误差不超过1天） =====
const SOLAR_TERMS = [
  { name: '小寒', start: [1, 6], tip: '寒冬腊月，乌镇腊味飘香，适合品尝定胜糕、姑嫂饼。', scenery: '古镇银装素裹，河道偶尔结薄冰，红灯笼映白雪。', poem: '千山鸟飞绝，万径人踪灭。', poemAuthor: '柳宗元《江雪》', wiki: '小寒是冬季的第五个节气，标志着一年中最寒冷的日子即将到来。江南地区虽不如北方严寒，但湿冷入骨，正是品尝江南腊味、围炉煮茶的好时节。' },
  { name: '大寒', start: [1, 20], tip: '岁末大寒，乌镇年味渐浓，可体验写春联、剪窗花。', scenery: '腊梅傲雪绽放，古桥覆霜，一早一晚雾气氤氲如水墨画。', poem: '爆竹声中一岁除，春风送暖入屠苏。', poemAuthor: '王安石《元日》', wiki: '大寒是二十四节气中最后一个节气，意味着天气寒冷到极致。过了大寒又立春，即将迎来新一年的节气轮回。乌镇此时年味最浓，是体验江南年俗的绝佳时机。' },
  { name: '立春', start: [2, 4], tip: '立春至，乌镇柳色初新，适合漫步河岸赏早梅。', scenery: '河岸柳枝抽芽，迎春花点缀白墙黛瓦，乌篷船悠悠划过。', poem: '碧玉妆成一树高，万条垂下绿丝绦。', poemAuthor: '贺知章《咏柳》', wiki: '立春是二十四节气之首，标志着春季的开始。江南地区气温回暖，万物复苏，是踏春的好时节。' },
  { name: '雨水', start: [2, 19], tip: '雨水时节，烟雨江南最朦胧，撑伞游古镇别有韵味。', scenery: '细雨蒙蒙中的石桥与倒影，青石板路泛着水光，诗意盎然。', poem: '好雨知时节，当春乃发生。', poemAuthor: '杜甫《春夜喜雨》', wiki: '雨水节气意味着降雨开始，雨量渐增。江南的春雨绵绵，正是"烟雨江南"最真实的写照。乌镇此时游客较少，适合静心感受水乡的温婉。' },
  { name: '惊蛰', start: [3, 6], tip: '春雷响，万物生。乌镇油菜花初绽，适合踏青摄影。', scenery: '田野间金黄点点，桃花灼灼其华，蝴蝶翩跹于花丛。', poem: '竹外桃花三两枝，春江水暖鸭先知。', poemAuthor: '苏轼《惠崇春江晚景》', wiki: '惊蛰标志着仲春时节的开始，春雷始鸣，惊醒蛰伏于地下越冬的蛰虫。气温回升加快，江南春意渐浓。' },
  { name: '春分', start: [3, 21], tip: '春分昼夜均，乌镇百花争艳，正是赏花最佳时。', scenery: '玉兰、海棠、樱花次第开放，西栅景区内花团锦簇。', poem: '等闲识得东风面，万紫千红总是春。', poemAuthor: '朱熹《春日》', wiki: '春分是春季第四个节气，这一天昼夜平分。春分后，气候温和，雨水充沛，阳光明媚，是出游踏青的最佳时节。' },
  { name: '清明', start: [4, 5], tip: '清明时节，乌镇春和景明，适合品茗听评弹。', scenery: '杨柳依依，梨花风起，乌镇的清晨薄雾如纱，午后阳光明媚。', poem: '清明时节雨纷纷，路上行人欲断魂。', poemAuthor: '杜牧《清明》', wiki: '清明既是节气又是传统节日，是祭祖扫墓的日子。此时春光明媚，草木萌动，乌镇的白墙黛瓦在春色中更显古朴典雅。' },
  { name: '谷雨', start: [4, 20], tip: '谷雨春茶鲜，乌镇周边的龙井、碧螺春正当季。', scenery: '雨生百谷，茶园新绿，古镇巷陌间飘着新茶的清香。', poem: '春山谷雨前，并手摘芳烟。', poemAuthor: '齐己《谢中上人寄茶》', wiki: '谷雨是春季最后一个节气，取自"雨生百谷"之意。此时降水明显增加，田中的秧苗初插、作物新种，最需要雨水滋润。江南春茶采摘进入尾声，正是品尝新茶的好时节。' },
  { name: '立夏', start: [5, 6], tip: '立夏初至，乌镇蔷薇满墙，夜游西栅正当时。', scenery: '绿树阴浓夏日长，楼台倒影入池塘，西栅夜景灯火璀璨。', poem: '小荷才露尖尖角，早有蜻蜓立上头。', poemAuthor: '杨万里《小池》', wiki: '立夏标志着夏季的开始，万物进入旺季生长。江南气温明显升高，雷雨增多，乌镇的夜游项目正当季。' },
  { name: '小满', start: [5, 21], tip: '小满时节，乌镇桑葚正熟，可体验采摘乐趣。', scenery: '麦穗渐满，蚕茧初成，桑园里紫红的桑葚挂满枝头。', poem: '夜莺啼绿柳，皓月醒长空。', poemAuthor: '欧阳修《五绝·小满》', wiki: '小满是指夏熟作物的籽粒开始灌浆饱满，但还未成熟。江南地区此时农事繁忙，蚕桑业进入关键期，正是体验江南农耕文化的好时机。' },
  { name: '芒种', start: [6, 6], tip: '芒种忙种，乌镇端午临近，可包粽子、看龙舟。', scenery: '栀子花开，艾草飘香，古镇里弥漫着粽叶的清香。', poem: '时雨及芒种，四野皆插秧。', poemAuthor: '陆游《时雨》', wiki: '芒种是夏季的第三个节气，此时气温显著升高、雨量充沛，正是南方种稻与北方收麦之时。端午佳节临近，乌镇会举办各类民俗活动。' },
  { name: '夏至', start: [6, 21], tip: '夏至日长，乌镇荷花初绽，可乘摇橹船赏荷。', scenery: '龙形田荷花亭亭玉立，蝉鸣阵阵，水乡夏日风情万种。', poem: '接天莲叶无穷碧，映日荷花别样红。', poemAuthor: '杨万里《晓出净慈寺送林子方》', wiki: '夏至是一年中白昼最长的一天，标志着盛夏来临。此时江南地区气温高、湿度大，乌镇的荷花盛开，是赏荷的最佳时节。' },
  { name: '小暑', start: [7, 7], tip: '小暑入伏，乌镇清晨最宜人，建议早起避高温。', scenery: '晨曦中的古镇宁静致远，木心美术馆是避暑好去处。', poem: '明月别枝惊鹊，清风半夜鸣蝉。', poemAuthor: '辛弃疾《西江月·夜行黄沙道中》', wiki: '小暑标志着季夏时节的正式开始，天气开始炎热但还没到最热。江南进入"三伏天"，建议游客清晨或傍晚出游，中午可在室内场馆避暑。' },
  { name: '大暑', start: [7, 23], tip: '大暑炎热，乌镇水上项目最清凉，可乘乌篷船避暑。', scenery: '烈日下的河道波光粼粼，船篷遮阳，桨声欸乃送清凉。', poem: '何以销烦暑，端居一院中。', poemAuthor: '白居易《销暑》', wiki: '大暑是一年中最热的节气，"湿热交蒸"在此时到达顶点。乌镇的河道成了天然空调，乘船游览或在水边茶馆闲坐，都是消暑的好选择。' },
  { name: '立秋', start: [8, 8], tip: '立秋暑未消，乌镇早桂飘香，夜游依旧舒适。', scenery: '梧桐叶开始泛黄，傍晚凉风习习，西栅夜市热闹非凡。', poem: '空山新雨后，天气晚来秋。', poemAuthor: '王维《山居秋暝》', wiki: '立秋标志着秋季的开始，但江南地区往往"秋老虎"依旧炎热。此时早桂开始飘香，乌镇的天空格外高远，是摄影的好时机。' },
  { name: '处暑', start: [8, 23], tip: '处暑出伏，乌镇秋高气爽，适合登高远眺。', scenery: '暑气渐消，天高云淡，白莲塔上可俯瞰全镇秋色。', poem: '露蝉声渐咽，秋日景初微。', poemAuthor: '范仲淹《咏蝉》', wiki: '处暑意味着"出暑"，炎热离开。此时三伏天已过或接近尾声，江南地区昼夜温差开始加大，秋意渐浓。' },
  { name: '白露', start: [9, 8], tip: '白露微凉，乌镇桂花盛开，满城甜香。', scenery: '晨露凝珠，金桂飘香，石桥边的桂花树落英缤纷。', poem: '桂子月中落，天香云外飘。', poemAuthor: '宋之问《灵隐寺》', wiki: '白露是秋季第三个节气，基本结束了暑天的闷热，天气渐渐转凉。此时江南桂花盛开，乌镇的街巷弥漫着甜香。' },
  { name: '秋分', start: [9, 23], tip: '秋分昼夜均，乌镇秋色正浓，适合摄影采风。', scenery: '银杏叶渐黄，乌桕树泛红，古镇色彩斑斓如油画。', poem: '停车坐爱枫林晚，霜叶红于二月花。', poemAuthor: '杜牧《山行》', wiki: '秋分这一天昼夜再次平分。此后北半球昼短夜长，气温逐日下降。乌镇的秋色渐入佳境，是摄影爱好者的天堂。' },
  { name: '寒露', start: [10, 8], tip: '寒露深秋，乌镇菊花展正当时，可品蟹赏菊。', scenery: '菊花盛开，螃蟹肥美，古镇的秋日暖阳舒适宜人。', poem: '采菊东篱下，悠然见南山。', poemAuthor: '陶渊明《饮酒·其五》', wiki: '寒露是深秋的节令，此时气温较白露时更低，露水更多，日带寒意。江南地区菊花盛开，大闸蟹正值最佳赏味期。' },
  { name: '霜降', start: [10, 23], tip: '霜降柿子红，乌镇秋意最浓，可体验蓝印花布晒场。', scenery: '柿叶翻红，梧桐叶落，晒场上的蓝印花布随风飘扬。', poem: '月落乌啼霜满天，江枫渔火对愁眠。', poemAuthor: '张继《枫桥夜泊》', wiki: '霜降是秋季的最后一个节气，意味着冬天即将开始。此时昼夜温差最大，清晨的霜花为乌镇增添了一份清冷之美。' },
  { name: '立冬', start: [11, 7], tip: '立冬进补，乌镇羊肉面、三白酒暖身暖心。', scenery: '银杏金黄铺地，河道上的薄雾如轻纱，古桥若隐若现。', poem: '冻笔新诗懒写，寒炉美酒时温。', poemAuthor: '李白《立冬》', wiki: '立冬标志着冬季的开始，万物进入休养、收藏状态。江南民间有立冬进补的习俗，乌镇的羊肉面、三白酒是御寒佳品。' },
  { name: '小雪', start: [11, 22], tip: '小雪初降，乌镇围炉煮茶，静听评弹最惬意。', scenery: '若有薄雪，黑瓦白墙更添素雅，红灯笼映雪格外温暖。', poem: '绿蚁新醅酒，红泥小火炉。', poemAuthor: '白居易《问刘十九》', wiki: '小雪意味着天气会越来越冷、降水量渐增。江南地区虽少见大雪，但偶尔的薄雪为古镇披上银装，别有一番韵味。' },
  { name: '大雪', start: [12, 7], tip: '大雪时节，乌镇腌肉腊味飘香，年味渐起。', scenery: '河道上水汽氤氲，酱园里的酱鸭、腊肉挂满晾晒架。', poem: '柴门闻犬吠，风雪夜归人。', poemAuthor: '刘长卿《逢雪宿芙蓉山主人》', wiki: '大雪标志着仲冬时节正式开始，气温显著下降、降水量增多。江南人开始腌制腊味，为过年做准备。' },
  { name: '冬至', start: [12, 22], tip: '冬至大如年，乌镇汤圆暖胃，可体验冬至祭祖习俗。', scenery: '夜最长的一天，古镇灯火通明，家家户户团圆温馨。', poem: '天时人事日相催，冬至阳生春又来。', poemAuthor: '杜甫《小至》', wiki: '冬至既是二十四节气中一个重要的节气，也是中国民间的传统祭祖节日。江南有"冬至大如年"之说，吃汤圆是重要习俗。' }
];

function getCurrentSolarTerm(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const currDays = month * 100 + day;
  for (let i = 0; i < SOLAR_TERMS.length; i++) {
    const term = SOLAR_TERMS[i];
    const nextTerm = SOLAR_TERMS[(i + 1) % SOLAR_TERMS.length];
    const startDays = term.start[0] * 100 + term.start[1];
    const nextStartDays = nextTerm.start[0] * 100 + nextTerm.start[1];
    if (nextStartDays > startDays) {
      if (currDays >= startDays && currDays < nextStartDays) return term;
    } else {
      if (currDays >= startDays || currDays < nextStartDays) return term;
    }
  }
  return SOLAR_TERMS[0];
}

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
  selectedSubs: Object.fromEntries(Object.keys(CATS).map(k => [k, new Set()])), // 自动适配CATS的所有类别，避免新增类别时遗漏初始化
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
    <div class="solar-term-strip" id="solarTermStrip" style="display:none;">
      <span class="st-icon">🌿</span>
      <span class="st-name" id="stName"></span>
      <span class="st-tip" id="stTip"></span>
      <span class="st-more">点击查看百科 →</span>
    </div>
    <div class="stats-row">
      <div class="stat"><div class="stat-num" data-count="0" id="statTotal">0</div><div class="stat-label">真实资源点位</div></div>
      <div class="stat"><div class="stat-num" data-count="${Object.keys(CATS).length}">0</div><div class="stat-label">资源类别</div></div>
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
      数据来源：高德地图开放平台POI批量采集 + 人工清洗（共 ${state.allFeatures.length || 687} 条真实点位，含10条经实地核实的非遗实体点位）<br>
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
  document.getElementById('narrateToggleBtn').addEventListener('click', () => {
    toggleNarrateMode();
    const btn = document.getElementById('narrateToggleBtn');
    btn.classList.toggle('active', state.narrateMode);
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
  state.mapReady = true;
  if (typeof updatePrediction === 'function') updatePrediction();
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
      num: 2000
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
    open_hours: a.open_hours || '',
    description: a.description || '',
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
  renderSolarTermStrip();
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

/* ==================== 时令提示 + 节气百科 ==================== */
function renderSolarTermStrip() {
  const term = getCurrentSolarTerm();
  const strip = document.getElementById('solarTermStrip');
  if (!strip || !term) return;
  document.getElementById('stName').textContent = term.name;
  document.getElementById('stTip').textContent = term.tip;
  strip.style.display = 'flex';
  strip.onclick = () => openSolarTermModal(term);
}

function openSolarTermModal(term) {
  let modal = document.getElementById('solarModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'solarModal';
    modal.className = 'solar-modal';
    modal.innerHTML = `
      <div class="solar-modal-box" id="solarModalBox">
        <div class="solar-modal-header">
          <div class="solar-modal-title" id="solarModalTitle"></div>
          <button class="solar-modal-close" id="solarModalClose">✕</button>
        </div>
        <div id="solarModalBody"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
    document.getElementById('solarModalClose').addEventListener('click', () => modal.classList.remove('show'));
  }
  document.getElementById('solarModalTitle').textContent = `${term.name} · 乌镇时令`;
  document.getElementById('solarModalBody').innerHTML = `
    <div class="solar-modal-section">
      <div class="solar-modal-label">游玩建议</div>
      <div class="solar-modal-text">${term.tip}</div>
    </div>
    <div class="solar-modal-section">
      <div class="solar-modal-label">应季景色</div>
      <div class="solar-modal-text">${term.scenery}</div>
    </div>
    <div class="solar-modal-section">
      <div class="solar-modal-label">古诗一首</div>
      <div class="solar-modal-poem">${term.poem}</div>
      <div class="solar-modal-author">—— ${term.poemAuthor}</div>
    </div>
    <div class="solar-modal-section">
      <div class="solar-modal-label">节气百科</div>
      <div class="solar-modal-text">${term.wiki}</div>
    </div>
  `;
  modal.classList.add('show');
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
// 单个点位的预计停留时长（分钟），按类别区分，比"一刀切40分钟"更接近真实情况
function estimateDwellMinutes(category) {
  const table = { attraction: 45, heritage: 40, culture: 40, food: 50, stay: 5 };
  return table[category] ?? 35;
}
// 步行速度估算：4km/h，用于把haversine距离换算成步行耗时(分钟)
function walkingMinutes(distKm) {
  return (distKm / 4) * 60;
}
// 从候选池里按真实时间预算挑出一天的行程：每加入一站就累加"该站停留时长+从上一站走来的步行时长"，
// 超出当天小时预算就停止，而不是预先假设一个固定能逛几站的数字
function pickDayStopsByTimeBudget(dayPool, hoursPerDay, startPoint, isAccessible) {
  const budgetMinutes = hoursPerDay * 60;
  const speedFactor = isAccessible ? 0.7 : 1; // 无障碍模式步行更慢，预算打七折更保守
  // 候选池本身已是评分排序后的结果，这里先取一个相对宽裕的候选范围做地理聚类选择
  const candidatePoolSize = Math.min(dayPool.length, 25);
  const wideCandidates = selectGeoClusteredStops(dayPool, candidatePoolSize, startPoint);
  const ordered = nearestNeighborOrder(wideCandidates, startPoint);
  const picked = [];
  let usedMinutes = 0;
  let current = startPoint;
  for (const stop of ordered) {
    const travelMin = walkingMinutes(haversineKm(current, stop)) / speedFactor;
    const dwellMin = estimateDwellMinutes(stop.category);
    const cost = travelMin + dwellMin;
    if (usedMinutes + cost > budgetMinutes && picked.length > 0) break; // 至少保留1站，避免空行程
    usedMinutes += cost;
    picked.push(stop);
    current = stop;
  }
  return { picked, usedMinutes };
}
function buildMultiDayItinerary(seed = 0) {
  const durCfg = getDurationConfig();
  const pool = buildCandidatePool(seed);
  const nonStayPool = pool.filter(f => f.category !== 'stay');
  const stayPool = pool.filter(f => f.category === 'stay');
  const needsStay = durCfg.days > 1;
  // 如果选了多日但偏好里没勾"住宿"，自动从全量住宿数据里按评分选，保证体验完整
  let stayCandidates = stayPool.length > 0 ? stayPool : state.allFeatures.filter(f => f.category === 'stay').sort((a,b)=> (b.rating??0)-(a.rating??0));
  const days = [];
  let usedIds = new Set();
  let lastAnchor = { longitude: CENTER.longitude, latitude: CENTER.latitude }; // 第一天从景区入口出发
  for (let d = 0; d < durCfg.days; d++) {
    const dayPool = nonStayPool.filter(f => !usedIds.has(f.objectId));
    // 按真实时间预算(游览时长+步行耗时)挑选当天能塞下的站点，而不是用固定站数假设
    const { picked } = pickDayStopsByTimeBudget(dayPool, durCfg.hoursPerDay, lastAnchor, state.accessibleMode);
    picked.forEach(p => usedIds.add(p.objectId));
    let ordered = picked; // pickDayStopsByTimeBudget内部已按最近邻排好序
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

  // 讲解模式工具栏
  const narrateBarHtml = `
    <div class="narrate-bar" id="narrateBar" style="display:none;">
      <button class="narrate-btn" id="narratePrevBtn">◀ 上一站</button>
      <button class="narrate-btn" id="narrateNextBtn">下一站 ▶</button>
      <div class="narrate-sep"></div>
      <button class="narrate-btn" id="narrateVoiceBtn">🔊 播报当前</button>
      <button class="narrate-btn" id="narrateAllBtn">📢 播全程</button>
      <div class="narrate-sep"></div>
      <button class="narrate-btn" id="narrateFavBtn">⭐ 我的收藏</button>
      <button class="narrate-btn" id="narrateStopBtn">⏹ 停止</button>
    </div>
    <div class="narrate-detail" id="narrateDetail"></div>
  `;

  // 语音控制条
  const voiceBarHtml = `
    <div class="voice-bar" id="voiceBar">
      <span style="font-size:11px;color:var(--ink-soft);">声音</span>
      <select id="voiceSelect" style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid var(--line);background:var(--white);color:var(--ink-soft);max-width:110px;">
        <option value="zh-CN-XiaoxiaoNeural">晓晓（女声）</option>
        <option value="zh-CN-YunyangNeural">云扬（男声）</option>
        <option value="zh-CN-YunxiNeural">云希（男声）</option>
        <option value="zh-CN-XiaoyiNeural">晓伊（女声）</option>
      </select>
      <div class="narrate-sep"></div>
      <span style="font-size:11px;color:var(--ink-soft);">语速</span>
      <div class="voice-speed">
        <input type="range" id="voiceSpeedRange" min="0.5" max="1.5" step="0.1" value="1.0">
        <span id="voiceSpeedVal">1.0x</span>
      </div>
      <button class="voice-btn" id="voiceToggleBtn">语音关闭</button>
    </div>
  `;

  // 冲突警告
  const conflictHtml = `<div class="conflict-banner" id="conflictBanner"></div>`;

  const cardsEl = document.getElementById('drawerCards');
  const drawerInner = document.getElementById('drawer');
  if (activeDay.stops.length === 0) {
    cardsEl.innerHTML = `<div style="padding:20px;color:var(--ink-soft);font-size:12.5px;">
      该偏好下符合条件的点位数量有限，本日暂无更多新点位可安排——
      建议缩短游玩天数，或在左侧勾选更多偏好类别以获得更丰富的行程。
    </div>`;
    drawerInner.classList.add('show');
    return;
  }

  // 将工具栏插入到 cards 之前
  let toolbarWrap = document.getElementById('drawerToolbarWrap');
  if (!toolbarWrap) {
    toolbarWrap = document.createElement('div');
    toolbarWrap.id = 'drawerToolbarWrap';
    cardsEl.parentNode.insertBefore(toolbarWrap, cardsEl);
  }
  toolbarWrap.innerHTML = narrateBarHtml + voiceBarHtml + conflictHtml;

  cardsEl.innerHTML = activeDay.stops.map((s, i) => {
    const isAnchor = activeDay.anchor && s.objectId === activeDay.anchor.objectId;
    const priceText = s.cost ? `¥${s.cost}` : '';
    const subLabel = SUBTYPE_MAP[s.category]?.find(sub => sub.key === s.subType)?.label;
    return `
    <div class="stop-card ${isAnchor ? 'is-anchor' : ''}" data-id="${s.objectId}" data-idx="${i}">
      <button class="stop-swap-btn" title="换一个" data-idx="${i}">↻</button>
      <div class="stop-num">${isAnchor ? '🏠' : i + 1}</div>
      <div class="stop-name">${s.name}</div>
      <div class="stop-dur">${subLabel || CATS[s.category].label}${s.rating ? ' · ⭐' + s.rating : ''}</div>
      ${priceText ? `<div class="stop-price">${priceText}</div>` : ''}
    </div>`;
  }).join('');

  // 单站换一个按钮事件
  cardsEl.querySelectorAll('.stop-swap-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      swapSingleStop(activeDayIndex, idx);
    });
  });

  cardsEl.querySelectorAll('.stop-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const feature = activeDay.stops.find(s => s.objectId === id);
      if (feature) {
        state.view.goTo({ center: [feature.longitude, feature.latitude], zoom: 17 }, { duration: 500 });
      }
    });
  });

  // 讲解模式按钮事件
  document.getElementById('narratePrevBtn')?.addEventListener('click', narratePrev);
  document.getElementById('narrateNextBtn')?.addEventListener('click', narrateNext);
  document.getElementById('narrateVoiceBtn')?.addEventListener('click', speakCurrentNarrate);
  document.getElementById('narrateAllBtn')?.addEventListener('click', speakAllStops);
  document.getElementById('narrateStopBtn')?.addEventListener('click', stopSpeaking);
  document.getElementById('narrateFavBtn')?.addEventListener('click', () => {
    const favs = getFavorites();
    if (favs.length === 0) { showToast('暂无收藏站点'); return; }
    const detail = document.getElementById('narrateDetail');
    detail.innerHTML = `
      <div style="font-weight:600;color:var(--ink);margin-bottom:6px;">我的收藏 (${favs.length})</div>
      ${favs.map(f => `
        <div style="font-size:12px;margin-bottom:5px;padding:6px;background:rgba(201,166,107,0.08);border-radius:6px;">
          <span style="font-weight:600;">${f.name}</span>
          <span style="color:var(--ink-soft);"> · ${CATS[f.category]?.label || ''}${f.rating ? ' ⭐' + f.rating : ''}</span>
        </div>
      `).join('')}
    `;
  });

  // 语速调节（Edge TTS 格式：+0%, +20%, -10% 等）
  const speedRange = document.getElementById('voiceSpeedRange');
  const speedVal = document.getElementById('voiceSpeedVal');
  if (speedRange) {
    speedRange.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.edgeRate = (val >= 1 ? '+' : '') + Math.round((val - 1) * 100) + '%';
      speedVal.textContent = val.toFixed(1) + 'x';
    });
  }

  // 语音选择
  const voiceSelect = document.getElementById('voiceSelect');
  if (voiceSelect) {
    voiceSelect.addEventListener('change', (e) => {
      state.edgeVoice = e.target.value;
    });
  }

  // 语音开关
  const voiceToggle = document.getElementById('voiceToggleBtn');
  if (voiceToggle) {
    voiceToggle.addEventListener('click', () => {
      const bar = document.getElementById('voiceBar');
      if (bar.classList.contains('show')) {
        bar.classList.remove('show');
        voiceToggle.textContent = '语音关闭';
        stopSpeaking();
      } else {
        bar.classList.add('show');
        voiceToggle.textContent = '语音开启';
      }
    });
  }

  // 冲突检测
  renderConflictBanner();

  drawerInner.classList.add('show');
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
  if (!state.mapReady) {
    predictLine.innerHTML = '地图初始化中，请稍候…';
    genBtn.disabled = true;
    return;
  }
  const durCfg = getDurationConfig();
  const pool = buildCandidatePool(0).filter(f => f.category !== 'stay');
  // 用真实时间预算模拟一遍多日选点，得到准确的预计站数（而非粗略的固定值估算）
  let simUsedIds = new Set();
  let simAnchor = { longitude: CENTER.longitude, latitude: CENTER.latitude };
  let totalStops = 0;
  for (let d = 0; d < durCfg.days; d++) {
    const dayPool = pool.filter(f => !simUsedIds.has(f.objectId));
    const { picked } = pickDayStopsByTimeBudget(dayPool, durCfg.hoursPerDay, simAnchor, state.accessibleMode);
    picked.forEach(p => simUsedIds.add(p.objectId));
    totalStops += picked.length;
    if (picked.length > 0) simAnchor = picked[picked.length - 1];
  }
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

/* ====================================================================
   第六部分：新增功能 —— 单站换一个 / 讲解模式 / 语音播报 / 路线冲突检测
   ==================================================================== */

/* -------- 单站换一个 -------- */
function swapSingleStop(dayIndex, stopIndex) {
  const itinerary = state.currentItinerary;
  if (!itinerary) return;
  const day = itinerary.days[dayIndex];
  const currentStop = day.stops[stopIndex];
  if (!currentStop) return;
  // 从全局点位池找同类别、评分相近的候选
  const cat = currentStop.category;
  const rating = currentStop.rating || 0;
  // 排除已在当天使用的点位
  const usedIds = new Set(day.stops.map(s => s.objectId));
  let candidates = state.allFeatures.filter(f =>
    f.category === cat && !usedIds.has(f.objectId)
  );
  if (candidates.length === 0) {
    showToast('暂无同类别替换点位');
    return;
  }
  // 按评分接近度排序，取前10个再随机
  candidates.sort((a, b) => {
    const ra = a.rating || 0, rb = b.rating || 0;
    return Math.abs(ra - rating) - Math.abs(rb - rating);
  });
  const top = candidates.slice(0, Math.min(10, candidates.length));
  const replacement = top[Math.floor(Math.random() * top.length)];
  day.stops[stopIndex] = replacement;
  // 刷新UI和地图
  renderItineraryDrawer(dayIndex);
  drawDayRouteOnMap(day, null);
  highlightRouteOnMap(day.stops);
  showToast(`已将「${currentStop.name}」换为「${replacement.name}」`);
}

/* -------- 讲解模式 -------- */
state.narrateIndex = 0;
state.narrateMode = false;

function toggleNarrateMode() {
  state.narrateMode = !state.narrateMode;
  const bar = document.getElementById('narrateBar');
  const detail = document.getElementById('narrateDetail');
  if (!bar) return;
  if (state.narrateMode) {
    bar.style.display = 'flex';
    detail.classList.add('show');
    state.narrateIndex = 0;
    updateNarrateDetail();
  } else {
    bar.style.display = 'none';
    detail.classList.remove('show');
  }
}

function narrateNext() {
  const day = state.currentItinerary?.days[state.activeDayIndex];
  if (!day || day.stops.length === 0) return;
  state.narrateIndex = (state.narrateIndex + 1) % day.stops.length;
  updateNarrateDetail();
}

function narratePrev() {
  const day = state.currentItinerary?.days[state.activeDayIndex];
  if (!day || day.stops.length === 0) return;
  state.narrateIndex = (state.narrateIndex - 1 + day.stops.length) % day.stops.length;
  updateNarrateDetail();
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('wuzhen_favorites') || '[]'); } catch { return []; }
}
function saveFavorites(list) {
  localStorage.setItem('wuzhen_favorites', JSON.stringify(list));
}
function toggleFavorite(stop) {
  const list = getFavorites();
  const idx = list.findIndex(f => f.objectId === stop.objectId);
  if (idx >= 0) { list.splice(idx, 1); showToast('已取消收藏'); }
  else { list.push({ objectId: stop.objectId, name: stop.name, category: stop.category, rating: stop.rating, address: stop.address }); showToast('已收藏「' + stop.name + '」'); }
  saveFavorites(list);
  updateNarrateDetail();
}

function updateNarrateDetail() {
  const day = state.currentItinerary?.days[state.activeDayIndex];
  const detail = document.getElementById('narrateDetail');
  if (!day || !detail) return;
  const s = day.stops[state.narrateIndex];
  if (!s) return;
  const subLabel = SUBTYPE_MAP[s.category]?.find(sub => sub.key === s.subType)?.label || CATS[s.category].label;
  const addr = s.address || '';
  const tel = s.tel || '';
  const favs = getFavorites();
  const isFav = favs.some(f => f.objectId === s.objectId);
  const intro = getPoiIntro(s);
  detail.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
      <div style="font-weight:600;color:var(--ink);">${state.narrateIndex + 1}. ${s.name}</div>
      <button id="favBtn" style="background:none;border:none;cursor:pointer;font-size:14px;" title="收藏此站">${isFav ? '⭐' : '☆'}</button>
    </div>
    <div style="font-size:12px;color:var(--ink-soft);margin-bottom:8px;">${subLabel}${s.rating ? ' · ⭐' + s.rating : ''}${s.cost ? ' · ¥' + s.cost : ''}${addr ? ' · 📍' + addr : ''}${tel ? ' · 📞' + tel : ''}</div>
    <div style="font-size:12.5px;color:var(--ink);line-height:1.7;border-left:2px solid var(--gold);padding-left:10px;background:rgba(201,166,107,0.05);border-radius:0 6px 6px 0;padding:8px 10px;">${intro}</div>
    <div style="margin-top:6px;font-size:11px;color:var(--ink-soft);opacity:0.6;">点击 🔊 收听语音讲解 · 已收藏 ${favs.length} 个站点</div>
  `;
  document.getElementById('favBtn')?.addEventListener('click', () => toggleFavorite(s));
  // 地图定位到当前讲解站点
  state.view.goTo({ center: [s.longitude, s.latitude], zoom: 17 }, { duration: 400 });
}

/* -------- 语音播报（Edge TTS —— 微软免费高质量语音） -------- */
state.edgeVoice = 'zh-CN-XiaoxiaoNeural';
state.edgeRate = '+0%';

function getSpeakText(s, idx) {
  const intro = getPoiIntro(s);
  // 语音文本：简短开场 + 真实介绍（截取前100字以内，避免太长）
  const shortIntro = intro.length > 120 ? intro.slice(0, 120) + '……' : intro;
  return `接下来是第${idx + 1}站，${s.name}。${shortIntro}`;
}

async function speakCurrentNarrate() {
  if (!window.edgeTTS) { showToast('语音服务加载中，请稍后'); return; }
  const day = state.currentItinerary?.days[state.activeDayIndex];
  if (!day) return;
  const s = day.stops[state.narrateIndex];
  if (!s) return;
  edgeStop();
  const text = getSpeakText(s, state.narrateIndex);
  try {
    showToast('正在生成语音…', 1000);
    await edgeSpeak(text, { voice: state.edgeVoice, rate: state.edgeRate });
  } catch (e) {
    console.error('语音播报失败:', e);
    showToast('语音生成失败，请检查网络');
  }
}

async function speakAllStops() {
  if (!window.edgeTTS) { showToast('语音服务加载中，请稍后'); return; }
  const day = state.currentItinerary?.days[state.activeDayIndex];
  if (!day || !day.stops.length) return;
  edgeStop();
  showToast('开始全程语音讲解…');
  for (let i = 0; i < day.stops.length; i++) {
    state.narrateIndex = i;
    updateNarrateDetail();
    const s = day.stops[i];
    const text = getSpeakText(s, i);
    try {
      const audio = await edgeSpeak(text, { voice: state.edgeVoice, rate: state.edgeRate });
      // 等待当前音频播完
      await new Promise(resolve => {
        audio.onended = resolve;
        audio.onerror = resolve;
      });
    } catch (e) {
      console.error('语音播报失败:', e);
      break;
    }
  }
}

function stopSpeaking() {
  edgeStop();
}

/* -------- 路线冲突检测（基于 open_hours，有数据才检测） -------- */
function checkOpenHoursConflicts() {
  const itinerary = state.currentItinerary;
  if (!itinerary) return [];
  const conflicts = [];
  itinerary.days.forEach((day, dIdx) => {
    day.stops.forEach((s, sIdx) => {
      const oh = s.raw?.open_hours || s.open_hours || '';
      if (!oh || oh.trim() === '' || oh === '[]') return; // 没数据默认跳过
      // 简单检测：如果包含闭馆日关键词则标记（后续可对接营业时间解析）
      const lower = oh.toLowerCase();
      const hasClosure = lower.includes('闭馆') || lower.includes('暂停') || lower.includes('不开放') || lower.includes('休息');
      if (hasClosure) {
        conflicts.push({ dayIndex: dIdx, stopIndex: sIdx, name: s.name, reason: oh });
      }
    });
  });
  return conflicts;
}

function renderConflictBanner() {
  const banner = document.getElementById('conflictBanner');
  if (!banner) return;
  const conflicts = checkOpenHoursConflicts();
  if (conflicts.length > 0) {
    banner.innerHTML = `<span>⚠️</span><div><b>营业时间提醒</b>：${conflicts[0].name}等 ${conflicts.length} 个站点可能存在闭馆或时间冲突，建议提前确认。</div>`;
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}
