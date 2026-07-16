import { VirtualRoom, PresetLamp } from "./types";

export const VIRTUAL_ROOMS: VirtualRoom[] = [
  {
    id: "room_7",
    name: "极简风・夜 (Minimalist Night)",
    style: "夜幕下的极致留白与极简美学。错落的暗影与纯粹的几何体块相遇，完美承载极简落地灯雕塑般的艺术光影。",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "极简风・夜 (Minimalist Night)",
      layout: "纯净留白的夜间起居空间，大面积柔和阴影，线条利落纯粹",
      furniture: ["极简落地单人椅", "圆柱形清水混凝土边几", "纯色羊毛地毯"],
      colors: ["哑光白", "微水泥灰", "玄武黑"],
      recommendation: "极为纯粹的微光测试场。适合将造型极度纤细的线型或几何体块落地灯置于墙角或单椅旁，利用墙面漫反射创造雕塑般的高级艺术感。",
      lightSuggestion: "强烈建议选择 3000K-3500K 暖白光或温和中性光，在维持空间高冷与空灵韵味的同时，注入一抹恰到好处的理性温度。"
    }
  },
  {
    id: "room_1",
    name: "现代简约・夜 (Modern Night)",
    style: "夜幕下的极简空间，线条利落，光影沉淀。暗淡的背景完美衬托局部照明，凸显极致的现代空间美学。",
    imageUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "现代简约・夜 (Modern Night)",
      layout: "开放式极简夜间客厅，暗调高级灰底座，利落线条",
      furniture: ["极简黑色/深灰沙发", "黑色岩板茶几", "暗藏式防眩射灯", "微水泥地板"],
      colors: ["炭黑", "深灰", "琥珀金"],
      recommendation: "建议将几何感强的线条落地灯摆放在沙发一角，用明暗切割空间，光束直射或折射于墙面，彰显现代摩登质感。",
      lightSuggestion: "推荐使用 3500K - 4000K 暖白光或中性光，在夜色中既维持干练利落，又平添一抹理性温度。"
    }
  },
  {
    id: "room_2",
    name: "北欧风・夜 (Nordic Night)",
    style: "温暖而松弛的北欧冬夜。室外寒夜漫漫，室内原木与布艺在柔和微光下散发着极度温暖治愈的居家拥抱感。",
    imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "北欧风・夜 (Nordic Night)",
      layout: "温馨治愈的北欧木质卧室兼起居角，具有极佳包裹感",
      furniture: ["原木矮床与桌几", "粗针针织毛毯", "浅麦色棉麻织物", "治愈感小盆栽"],
      colors: ["原木色", "米白", "暖灰", "松石绿"],
      recommendation: "把暖光落地灯安放在矮几或单人沙发旁。经典的百褶、帆布或白瓷落地灯最契合其慵懒随意的北欧漫步气息。",
      lightSuggestion: "首选 2700K 暖黄光，这是深夜驱散寒意、注入家庭温馨的最佳光源色温。"
    }
  },
  {
    id: "room_3",
    name: "新中式・暮 (Zen Chinese Night)",
    style: "暮色中的东方雅室。暖琥珀微光与沉稳的胡桃木交融，古雅的对称比例和沉静的留白，共同谱写幽静禅意。",
    imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "新中式・暮 (Zen Chinese Night)",
      layout: "清雅空灵的静夜雅室，胡桃木色家具与宣纸/屏风光影辉映",
      furniture: ["极简中式案几", "棉麻坐垫矮榻", "写意泼墨背景屏风", "青竹插花罐"],
      colors: ["深胡桃色", "水墨灰", "杏仁黄", "熟栗色"],
      recommendation: "可选择竹木架、宣纸灯罩的落地灯饰，置于案几侧方或古画之侧，利用材质的二次透光烘托东方山水的静谧韵味。",
      lightSuggestion: "推荐 2700K 暖光，最能唤醒木质深沉的纹理和材质，营造温良谦恭的东方禅境。"
    }
  },
  {
    id: "room_4",
    name: "奶油风・夜 (Creamy Night)",
    style: "夜深时的软糯法式一角。奶油色的石膏线与弧形羊羔绒沙发，在柔暖的暗影中酝酿出极致醇厚的治愈美感。",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "奶油风・夜 (Creamy Night)",
      layout: "温馨浪漫的奶茶色深夜起居角，墙面带有精致微水泥或石膏浮雕纹理",
      furniture: ["奶白色毛绒沙发", "圆弧线条边几", "高蓬松度毛毛地毯", "精巧小陶瓶"],
      colors: ["燕麦奶色", "暖米黄", "太妃糖棕"],
      recommendation: "选择云朵、荷叶边或圆润气泡造型的温和落地灯，摆在羊羔绒沙发一侧，温柔得像一碗热牛奶在深夜微温。",
      lightSuggestion: "首推 2700K 暖黄灯光，不仅让墙板线条呈现柔美的渐变阴影，更是给整个空间洒满梦幻滤镜。"
    }
  },
  {
    id: "room_5",
    name: "侘寂风・夜 (Wabi-sabi Night)",
    style: "暗夜无声，寂静回归。斑驳的微水泥墙面、沉重的陶罐枯枝，在月色与一抹落地灯的残光下诠释时光雕琢的永恒美。",
    imageUrl: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "侘寂风・夜 (Wabi-sabi Night)",
      layout: "极简孤寂的静夜角落，斑驳粗粝的陶罐与孤傲枯木立于黑暗中",
      furniture: ["风化粗陶单人椅", "粗糙抹灰微水泥墙", "无规则造型枯枝", "亚麻蒲团"],
      colors: ["岩石灰", "枯草色", "炭焦黑"],
      recommendation: "极力推荐将一盏和纸灯笼或陶土底座的低矮落地灯搁置在蒲团或陶罐旁，以孤灯残影的漫反射微光局部擦亮不完美的残缺之美。",
      lightSuggestion: "推荐极暖昏暗的 2200K - 2500K 烛光色温，让阴影在粗糙墙上拉长，把寂静质朴的修辞发挥到极致。"
    }
  }
];

export const PRESET_LAMPS: PresetLamp[] = [
  {
    id: "lamp_1",
    name: "经典包豪斯大理石抛物钓鱼灯",
    style: "极简现代 / 包豪斯",
    // A clean lamp cutout look using an illustrative background or dynamic rendering, we can use a stylized shape or standard icon/image
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=500&q=80",
    analysis: {
      style: "经典包豪斯拱形钓鱼落地灯",
      materials: ["高标拉丝不锈钢灯臂", "天然卡拉拉白大理石底座", "抛光电镀金属球形灯罩"],
      color: "不锈钢银",
      lightType: "抛物线大半径下射式局部照明",
      lightWarmth: "建议使用 3000K - 3500K 暖白光",
      cozyIndex: 8,
      placementTip: "由于钓鱼灯抛物线灯臂跨度较大，底座应置于沙发背后或角落，使金属灯罩优雅垂挂在茶几或沙发阅读区正上方，高度控制在1.6米左右最舒适。"
    }
  },
  {
    id: "lamp_2",
    name: "日式野口勇和纸褶皱灯笼灯",
    style: "自然和风 / 侘寂",
    imageUrl: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=500&q=80",
    analysis: {
      style: "侘寂日式和纸艺术落地灯",
      materials: ["手工宣纸 褶皱灯罩", "哑光碳素钢三叉支架", "竹节编制内骨架"],
      color: "暖白色和纸 + 黑色细支架",
      lightType: "360°全向漫反射朦胧光晕",
      lightWarmth: "强烈推荐 2200K - 2700K 烛光暖黄光",
      cozyIndex: 10,
      placementTip: "这款灯是氛围感神器，适合靠墙摆放在较低矮的坐垫或榻榻米旁边。由于光线极其柔和不刺眼，也可以直接摆在视线焦点处作为温暖的发光艺术装置。"
    }
  },
  {
    id: "lamp_3",
    name: "北欧极简黄铜重力平衡立柱灯",
    style: "北欧极简 / 现代轻奢",
    imageUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=500&q=80",
    analysis: {
      style: "北欧后现代几何极简灯",
      materials: ["拉丝电镀黄铜立柱", "手工吹制乳白色玻璃球罩", "实心黄铜防倒重力底座"],
      color: "高贵黄铜金 + 乳白色玻璃",
      lightType: "乳白玻璃防眩光温和散光",
      lightWarmth: "推荐 3000K 暖光",
      cozyIndex: 9,
      placementTip: "纤细垂直的金色灯柱非常节省占地空间，是小户型或转角首选。非常适合夹在沙发与墙壁窄缝中，或者单独摆放在过道或走廊尽头作为引路夜灯。"
    }
  },
  {
    id: "lamp_4",
    name: "美式复古三头哑光工业射灯",
    style: "美式工业 / 复古",
    imageUrl: "https://images.unsplash.com/photo-1534349762230-e09ec482c05b?auto=format&fit=crop&w=500&q=80",
    analysis: {
      style: "美式工业复古多头轨道灯",
      materials: ["重工业哑光黑碳钢主体", "复古铜质调节旋钮", "网格防爆金属网"],
      color: "哑光磨砂黑",
      lightType: "多角度独立旋转强光射灯",
      lightWarmth: "推荐 2700K 暖黄灯丝光",
      cozyIndex: 7,
      placementTip: "这款灯具的三个射灯头均可 360° 旋转，建议其中一个射灯头照射墙上装饰画，一个向下提供沙发区阅读光，最后一个向上照亮天花板，营造极富层次的工业洗墙光影。"
    }
  }
];
