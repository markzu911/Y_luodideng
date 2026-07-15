import { VirtualRoom, PresetLamp } from "./types";

export const VIRTUAL_ROOMS: VirtualRoom[] = [
  {
    id: "room_1",
    name: "现代简约 (Modern)",
    style: "配色纯净，线条利落，注重功能性与空间感的平衡。通常包含极简布艺沙发与几何感地板。",
    imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "现代简约 (Modern)",
      layout: "开放式极简客厅，空间感充足，线条利落",
      furniture: ["极简布艺沙发", "几何形茶几", "无主灯设计天花", "浅色木纹地板"],
      colors: ["纯净白", "低调灰", "原木色"],
      recommendation: "建议将落地灯摆放在沙发转角处，或者电视墙的角落，通过几何线条的灯具呼应极简风格，同时作为局部阅读或氛围照明。",
      lightSuggestion: "推荐使用 4000K 自然白光，凸显现代简约的利落感和通透感。"
    }
  },
  {
    id: "room_2",
    name: "北欧风 (Nordic)",
    style: "大量使用原木与浅灰色调，强调自然采光，营造通透温润的北欧森林居家感。",
    imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "北欧风 (Nordic)",
      layout: "舒适温润的休息区，大面积自然采光",
      furniture: ["原木边框沙发", "棉麻质感抱枕", "浅灰色地毯", "绿植盆栽"],
      colors: ["橡木原色", "浅灰色", "米白色", "自然绿"],
      recommendation: "建议将落地灯置于沙发旁或靠近绿植的位置，木质或白色烤漆的灯具最能融入北欧氛围，提供舒适的阅读光线。",
      lightSuggestion: "推荐 3000K 暖白光，增强北欧风格中温馨、自然的居家包裹感。"
    }
  },
  {
    id: "room_3",
    name: "新中式 (New Chinese)",
    style: "传统元素与现代审美的结合，沉稳的实木框架与留白造景，在考究的细节中展现东方雅致的生活品味。",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "新中式 (New Chinese)",
      layout: "端庄雅致的会客空间，注重对称与留白",
      furniture: ["新中式实木圈椅", "大理石与木材结合茶几", "山水意境屏风", "棉麻坐垫"],
      colors: ["胡桃木色", "米黄色", "水墨灰", "暗红色点缀"],
      recommendation: "建议落地灯放置在单人座椅或罗汉床后侧，可选择带有宣纸、蚕丝或木质元素的灯具，利用柔和透光性烘托东方禅意。",
      lightSuggestion: "推荐使用 2700K - 3000K 暖光，完美渲染实木的温润色泽与留白造景的雅致。"
    }
  },
  {
    id: "room_4",
    name: "奶油风 (Creamy)",
    style: "米色调法式线条背景，搭配经典的奶白色 Togo 毛绒沙发与波浪落地灯，鱼骨拼地板交织出极致治愈的法式简约美学。",
    imageUrl: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "奶油风 (Creamy)",
      layout: "温馨治愈的起居室，法式石膏线背景搭配鱼骨拼地板",
      furniture: ["奶白色毛绒沙发", "法式石膏线墙板", "软糯羊羔绒地毯", "弧线形边几"],
      colors: ["奶油白", "暖沙色", "微醺粉", "浅木色"],
      recommendation: "建议选用造型圆润、波浪形或毛绒材质的落地灯，放置在沙发左侧或角落，与空间的治愈感和弧线元素完美融合。",
      lightSuggestion: "强烈建议 2700K 暖色温，能够最大化烘托奶油风独有的温柔软糯质感，营造出极度放松的氛围。"
    }
  },
  {
    id: "room_5",
    name: "侘寂风 (Wabi-sabi)",
    style: "微水泥质感墙面，原始风格的原木长桌，点缀枯木枝桠，在留白中感悟自然的静谧与禅意。",
    imageUrl: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "侘寂风 (Wabi-sabi)",
      layout: "极简而充满侘寂禅意的静谧空间，注重材质原始质感",
      furniture: ["微水泥墙面", "风化质感原木长桌", "亚麻质感布艺", "枯木陶罐造景"],
      colors: ["微水泥灰", "做旧原木色", "米灰色", "大地色系"],
      recommendation: "和纸灯笼或陶土底座的落地灯是绝佳选择，建议直接置于低矮的坐垫旁或角落，以漫反射光晕点亮局部的粗粝纹理。",
      lightSuggestion: "推荐极暖的 2200K - 2700K 烛光色温，昏暗而温暖的光线更能带出侘寂风独有的时间沉淀感与静谧美。"
    }
  },
  {
    id: "room_6",
    name: "轻奢风 (Light Luxury)",
    style: "精致的大理石与金属线条交相辉映，高饱和度的绒面靠背椅，打造摩登优雅的现代都市豪宅质感。",
    imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "轻奢风 (Light Luxury)",
      layout: "摩登都市豪宅感客厅，注重材质对比与精致细节",
      furniture: ["高饱和度丝绒沙发", "大理石金属拼接茶几", "黄铜线条墙面装饰", "水晶玻璃摆件"],
      colors: ["大理石白", "香槟金", "祖母绿/宝石蓝", "高级黑"],
      recommendation: "可选择带有黄铜、大理石或水晶元素的纤细落地灯，放置在丝绒沙发旁作为金属质感的呼应点亮空间，提升整体奢华度。",
      lightSuggestion: "建议选择 3500K - 4000K 中性光，既能让金属光泽熠熠生辉，又不会使大理石的冷感显得过分冰凉，取得完美平衡。"
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
