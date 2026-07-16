import { VirtualRoom, PresetLamp } from "./types";
import newChineseLivingRoom from "./assets/images/new_chinese_living_room_1784189443927.jpg";

export const VIRTUAL_ROOMS: VirtualRoom[] = [
  {
    id: "room_7",
    name: "极简风・夜 (Minimalist Night)",
    style: "极致高级感极简卧室。以深灰、玄武黑与纯白为基调，搭配悬吊几何线型灯饰与低矮悬浮矮床，超大落地窗将森林绿意引入室内，呈现静谧纯粹的暗黑极简主义。",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "暗黑奢雅极简卧室 (Luxury Minimalist Dark Bedroom)",
      layout: "极其奢雅静谧的深灰色极简卧室。床头背景为整面无缝哑光碳黑护墙板，一侧配有垂悬的几何线型吊灯，右侧通透的落地玻璃窗连接开阔的自然景观",
      furniture: [
        "低矮悬浮式深炭灰极简真皮双人床 (Low-profile floating dark charcoal leather bed)",
        "高饱满纯白羽绒枕与哑光高密灰度床品 (Sleek white bedding with charcoal grey duvet)",
        "悬浮式哑光黑色实木抽屉床头柜 (Floating matte black wood bedside nightstand)",
        "极简暗灰色短毛圈绒低饱和地毯 (Dark charcoal textured low-pile carpet)",
        "现代圆形矮墩皮革踏步椅 (Low circular dark grey leather pouffe ottoman)",
        "无主灯隐藏式线性磁吸轨道射灯 (Minimalist recessed magnetic linear downlights)"
      ],
      colors: [
        "玄武碳黑 (Matte charcoal black)",
        "微水泥极简灰 (Microcement gray)",
        "极净哑白 (Crisp pristine white)",
        "森林冷绿 (Cool forest green)"
      ],
      recommendation: "推荐选择黑色哑光或精致拉丝金属等线条极度利落的落地灯。非常适合放置于悬浮床头柜旁、或者大面积落地窗前，利用纤细的直线轮廓与背景的超大玻璃或黑灰墙壁产生极致的形式张力。",
      lightSuggestion: "强烈建议选择 3000K-3500K 暖白光或温和中性光。隐藏在床背或天花板凹槽内的线性洗墙光和落地灯的漫反射光交相辉映，能在漆黑深邃中营造出极具高级感和理性温度的雕塑光影。"
    }
  },
  {
    id: "room_1",
    name: "温馨田园风 (Cozy Pastoral)",
    style: "充满自然气息与复古温情的田园空间。红砖壁炉、原木色做旧橱柜与碎花布艺交织，大量鲜活绿植与温暖阳光倾泻而下，仿佛置身于南法乡间的悠然午后。",
    imageUrl: "https://images.unsplash.com/photo-1518136247453-74e7b5265980?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1518136247453-74e7b5265980?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1518136247453-74e7b5265980?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1518136247453-74e7b5265980?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "法式复古田园起居室 (Vintage French Pastoral Living Room)",
      layout: "沐浴在温暖阳光下的田园风客厅，背景是复古红砖壁炉与经典做旧原木拱形展示柜，四周被繁茂的绿植包围，充满浪漫与松弛感",
      furniture: [
        "经典法式米白色复古布艺沙发 (Classic French cream fabric sofa)",
        "浪漫碎花布艺单人沙发椅与靠枕 (Romantic floral armchair and throw pillows)",
        "复古做旧原木茶几与拱形餐边柜 (Vintage distressed wood coffee table and arched cabinets)",
        "经典红砖砌筑壁炉 (Classic red brick fireplace)",
        "大量室内绿植、龟背竹与常春藤垂吊植物 (Lush indoor plants and hanging ivy)",
        "手工编织藤蔓花篮与复古陶瓷摆件 (Woven rattan baskets and vintage ceramic decors)"
      ],
      colors: [
        "暖木黄 (Warm aged wood)",
        "复古红砖色 (Vintage brick red)",
        "田园草绿 (Pastoral lush green)",
        "碎花柔粉与米白 (Floral soft pink and cream)"
      ],
      recommendation: "极力推荐搭配带有黄铜复古灯杆、或者带有精致百褶布艺灯罩的落地灯，放置在碎花单椅旁或满是绿植的窗边。复古的造型能完美融入原木与红砖的温情氛围。",
      lightSuggestion: "推荐使用 2700K-3000K 暖光，不仅能让原木家具和藤编材质在光影下更显质感，还能为田园空间的满屋绿意披上一层柔和浪漫的滤镜。"
    }
  },
  {
    id: "room_2",
    name: "北欧风・夜 (Nordic Night)",
    style: "温馨治愈的原木北欧风卧室。柔和的燕麦色与沙色墙面，搭配自然质感的白橡木床架与棉麻织物，点缀以极简植物挂画与一抹治愈的清新绿植，烘托出纯粹、松弛且充满自然呼吸感的居家拥抱感。",
    imageUrl: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "原木温润北欧卧室 (Warm Wood Nordic Bedroom)",
      layout: "温馨松弛的暖沙色北欧卧室，床头背景墙为温馨舒适的哑光浅沙色，搭配橡木家具与质感天然的棉麻窗帘，通透温柔",
      furniture: [
        "简约白橡木/白蜡木温润实木双人床架 (Simple white oak warm solid wood bed frame)",
        "高品质蓬松纯白羽绒被与浅沙色/燕麦色棉麻枕头 (Fluffy pure white duvet with sand and oatmeal linen pillows)",
        "粗针织咖色/燕麦色流苏盖毯与搭巾 (Chunky knit coffee-colored and oatmeal throw blanket)",
        "温润原木抽屉床头柜 (Cozy natural oak drawers bedside nightstand)",
        "极简橡木复古画框植物/羽毛艺术挂画 (Minimalist oak framed botanical and feather sketch art prints)",
        "高垂感半透光米黄色棉麻落地纱窗帘 (Flowing translucent beige cotton linen curtains)",
        "角落里的琴叶榕或龟背竹等清新绿植盆栽 (Potted lush green fiddle-leaf fig or monstera plant)",
        "浅灰米色大面积圈绒羊毛地毯 (Soft textured light beige wool area rug)"
      ],
      colors: [
        "温润橡木色 (Natural light oak wood)",
        "燕麦奶米色 (Oatmeal cream beige)",
        "纯净白 (Pristine soft white)",
        "鼠尾草绿/橄榄绿 (Sage and olive green accents)"
      ],
      recommendation: "建议将带有乳白色百褶灯罩、帆布褶皱或极简磨砂白瓷的木质/白橡木落地灯，安放在原木床头柜旁、或者浅色休闲单椅一侧。温暖自然的灯光能与木质纹理完美共鸣。",
      lightSuggestion: "强烈推荐 2700K 暖黄漫射光，这是让原木材质在深夜彻底苏醒、驱散疲惫并为整个空间注入极度家庭温馨感的最佳色温。"
    }
  },
  {
    id: "room_3",
    name: "新中式・雅 (Warm Oriental Zen)",
    style: "新中式",
    imageUrl: newChineseLivingRoom,
    imageUrlFar: newChineseLivingRoom,
    imageUrlMid: newChineseLivingRoom,
    imageUrlClose: newChineseLivingRoom,
    analysis: {
      style: "新中式",
      layout: "温馨高雅的新中式客厅。温暖的原木地板与墙面木饰面交相辉映，精美镂空木格栅与梅花挂画点缀其中，在优雅天花板暗藏灯带的烘托下，营造出极致温馨与沉静的现代东方美学。",
      furniture: [
        "中式古典低矮实木罗汉床/贵妃榻 (Low-profile solid-wood daybed)",
        "高弹舒适米白色榻面与圆柱靠枕 (Plush cream mattress and clean bolster cushions)",
        "简约中式实木茶几与休闲藤编高背椅 (Minimalist wood coffee table & rattan armchairs)",
        "多层通透镂空木格栅屏风柜 (Hollow wood lattice screen cabinet)",
        "传统手绘写意红梅花轴挂画 (Scroll painting of blooming red plum blossoms)",
        "古朴陶制插花瓶与典雅盆栽绿植 (Rustic pottery vase and potted green plants)"
      ],
      colors: [
        "温润原木黄 (Natural warm oak wood)",
        "典雅胡桃褐 (Deep premium walnut)",
        "宣纸暖米白 (Oatmeal cream white)",
        "写意红梅色 (Blooming plum blossom red)"
      ],
      recommendation: "极力推荐搭配古典黄铜色、宣纸材质或带天然藤编元素的东方禅意落地灯。适合放置在实木榻侧后方或藤编休闲椅旁，与木质格栅和梅花挂画共同勾勒出古朴优雅的氛围感画卷。",
      lightSuggestion: "强烈建议选择 2700K-3000K 暖黄光。温润柔和的光晕能够完美唤醒原木家具的天然木纹质感，同时与天花板的暗藏暖光带交织互补，渲染出空灵而极具温度的东方居家禅境。"
    }
  },
  {
    id: "room_4",
    name: "奶油风・夜 (Creamy Night)",
    style: "温馨治愈的奶油风卧室兼休闲角。经典的波浪形软包双人床、清新绿意条纹床品，与蓬松云朵般的单人沙发完美融合，大面积落地窗带来开阔的都市视野。",
    imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "温馨治愈奶油风卧室 (Cozy Creamy Bedroom)",
      layout: "温馨开阔的暖米色奶油风卧室，右侧为全景落地窗与米白色垂感窗帘，左侧融合精致慵懒的休闲角",
      furniture: [
        "波浪形白色软包高靠背床头双人床 (Scalloped headboard cream bed)",
        "浅绿色与白色细条纹纯棉床品 (Sage green and cream striped bedding)",
        "云朵般的奶白色多层褶皱单人沙发 (Cloud-like fluffy white single sofa)",
        "黑色复古三层抽屉床头柜 (Classic black 3-drawer nightstand)",
        "波卡圆点南瓜造型抱枕与榻榻米地毯 (Polka dot pumpkin floor pillow and cozy cream patterned rug)",
        "简约绿植挂画与复古画框 (Minimalist botanical leaf wall art)"
      ],
      colors: [
        "燕麦奶白 (Warm oatmeal cream)",
        "鼠尾草绿 (Sage/olive green)",
        "珍珠白 (Soft pearl white)",
        "复古炭黑 (Matte charcoal black)"
      ],
      recommendation: "建议将简约温和的金属落地灯放置于单人沙发与双人床之间。极简的双头或三头散射落地灯不仅能提供温馨的阅读光，更能作为空间焦点的优雅艺术装置。",
      lightSuggestion: "推荐使用 2700K-3000K 暖黄漫射光，完美烘托燕麦色与鼠尾草绿的温润质感，在夜晚渲染出极度松弛治愈的梦幻滤镜。"
    }
  },
  {
    id: "room_5",
    name: "侘寂风 (Wabi-Sabi)",
    style: "质朴宁静的微水泥侘寂空间。天然粗粝的陶罐枯枝、做旧的实木茶几与大面积温暖的微水泥色调相互交织，搭配极简亚麻沙发，在光影斑驳中诠释时光雕琢的质朴与极简美学。",
    imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80",
    imageUrlFar: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80",
    imageUrlMid: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80",
    imageUrlClose: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80",
    analysis: {
      style: "微水泥质朴侘寂起居室 (Wabi-Sabi Living Room)",
      layout: "自然空灵的侘寂风开放式客厅。墙面与地面统一采用温暖的米灰色微水泥，通过拱门与吧台形成空间层次，光线透过落地窗洒在亚麻布艺和原木上，营造出极致的质朴与宁静感",
      furniture: [
        "极简米灰色亚麻布艺落地沙发 (Minimalist beige linen floor sofa)",
        "做旧不规则天然实木墩/茶几 (Weathered natural wood stump coffee table)",
        "粗陶手工大号落地花瓶与干枯树枝 (Large rustic pottery floor vase with dry branches)",
        "悬垂的藤编/竹编手工吊灯 (Handwoven rattan/bamboo pendant lights)",
        "微水泥材质的一体化吧台与厨房 (Integrated microcement kitchen island and cabinets)",
        "黑色哑光金属吧台椅 (Matte black metal bar stools)"
      ],
      colors: [
        "暖沙色/微水泥灰 (Warm sand and microcement grey)",
        "天然风化木色 (Weathered natural wood)",
        "陶土棕 (Terracotta brown)",
        "哑光黑点缀 (Matte black accents)"
      ],
      recommendation: "极力推荐将一盏和纸灯笼、带有藤编元素的灯具或陶土底座的低矮落地灯搁置在亚麻沙发旁或粗陶花瓶侧边。粗粝的自然材质能完美融入空间，利用漫反射微光放大质朴的美感。",
      lightSuggestion: "推荐使用极暖的 2700K 暖光。温暖柔和的光晕能在粗糙的微水泥墙面和天然木纹上拉长阴影，把侘寂美学中安静质朴的修辞发挥到极致。"
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
