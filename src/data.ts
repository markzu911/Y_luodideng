import { VirtualRoom, PresetLamp } from "./types";
import newChineseLivingRoom from "./assets/images/new_chinese_living_room_1784189443927.jpg";
import whiteMinimalistBedroom from "./assets/images/white_minimalist_bedroom_1784191311774.jpg";
import scandinavianCozyLivingRoom from "./assets/images/scandinavian_cozy_living_room_1784191469593.jpg";
import pastoralCozyBedroom from "./assets/images/pastoral_cozy_bedroom_1784191593936.jpg";
import frenchCreamyBedroom from "./assets/images/french_creamy_bedroom_1784191800925.jpg";
import wabiSabiQuietLivingRoom from "./assets/images/wabi_sabi_quiet_living_room_1784192087112.jpg";

export const VIRTUAL_ROOMS: VirtualRoom[] = [
  {
    id: "room_7",
    name: "极简风・雅 (Warm White Minimalism)",
    style: "极简风",
    imageUrl: whiteMinimalistBedroom,
    imageUrlFar: whiteMinimalistBedroom,
    imageUrlMid: whiteMinimalistBedroom,
    imageUrlClose: whiteMinimalistBedroom,
    analysis: {
      style: "极简风",
      layout: "温馨高雅的暖白极简卧室。床头背景为干净纯粹的质感白墙，下层背景板暗藏柔和暖金线性LED逆光灯带，天花板反光暖光带自然倾泻。侧方大面积落地景观窗搭配轻盈透光的白色沙帘，使整个空间明亮、宁静且充满极简诗意。",
      furniture: [
        "现代轻奢低矮悬浮式白橡色皮艺双人床 (Modern low-profile platform bed in warm white oak leather)",
        "纯白饱满羽绒枕、素雅浅卡其色高密被褥与柔软米色针织盖毯 (Pristine white pillows & soft cream beige bedding set)",
        "圆润极简设计的暖白色烤漆实木床头几 (Sleek minimalist round matte white bedside table)",
        "温润通透的白木色木地板 (Light white-washed engineered natural wood flooring)",
        "高弹亲肤的素白羊毛混纺绒面厚地毯 (Plush textured off-white wool blend area rug)",
        "极简无主灯悬挑线性感应发光地台 (Minimalist floating under-bed warm LED footlights)"
      ],
      colors: [
        "极净哑白 (Pristine Soft White)",
        "优雅米色 (Elegant Warm Cream/Oatmeal)",
        "柔和白木色 (Light White-Washed Wood)",
        "微光暖金 (Warm LED Ambient Gold)"
      ],
      recommendation: "极力推荐搭配白色宣纸材质、透光细棉麻或极简哑白色极细铝合金灯身等外形利落的北欧/东方禅意落地灯。适合放置在实木床头几旁或沙帘窗边，以温润的反射光华渲染出纯净高雅的空间温度。",
      lightSuggestion: "强烈建议选择 2700K-3000K 柔和暖白光。漫反射光源能够轻柔点亮高档皮艺床头和针织盖毯的肌理细节，并与床头背板和天花板暗藏的黄光线性灯带完美烘托出温馨纯粹的安宁家居质感。"
    }
  },
  {
    id: "room_1",
    name: "田园风・暖 (Cozy Pastoral)",
    style: "田园风",
    imageUrl: pastoralCozyBedroom,
    imageUrlFar: pastoralCozyBedroom,
    imageUrlMid: pastoralCozyBedroom,
    imageUrlClose: pastoralCozyBedroom,
    analysis: {
      style: "田园风",
      layout: "温馨浪漫的复古田园风卧室。暖调原木地板与浅奶油色墙面相映，背景中高挑精致的白色格纹蕾丝荷叶边窗帘滤过明亮而温和的漫反射自然光，床头两侧对称点缀精致铜制百褶壁灯，搭配大量鲜活的郁金香与实木书桌，渲染出诗意、自然、慵懒惬意的法式乡村风情。",
      furniture: [
        "经典法式温润实木双人床架 (Classic French country solid wood bed frame)",
        "带有精美浅碎花印花的棉麻亲肤床品 (Delicate floral pattern cotton bedding set)",
        "浅粉色与明黄色高弹解压靠包 (Soft pastel pink and yellow accent pillows)",
        "复古做旧的经典质感实木学习书桌 (Vintage distressed solid-wood study desk)",
        "古典白褶灯罩台灯与复古黄铜百褶罩小壁灯 (Vintage pleated wall sconces & table lamp)",
        "大理石/金属底座的极简圆形铁艺床头柜 (Elegant minimalist metal/marble side table)",
        "角落里充满自然生机的郁金香插花与绿植 (Fresh vibrant tulips & potted houseplant)",
        "质朴温暖的粗线手工编织剑麻质感地毯 (Rustic textured handwoven jute area rug)"
      ],
      colors: [
        "暖木黄 (Warm aged wood)",
        "奶油白 (Soft creamy white)",
        "温柔碎花粉/黄色 (Floral soft pink/yellow)",
        "郁金香绿 (Tulip vibrant green)"
      ],
      recommendation: "极力推荐搭配造型典雅、配有黄铜拉丝灯杆或带有精致百褶布艺灯罩的复古美式/法式落地灯。适合放置在实木书桌旁或窗帘侧边，用怀旧造型和暖洋洋的流萤光晕烘托极致的温馨田园美学。",
      lightSuggestion: "推荐选择 2700K 经典暖光。柔和的光晕能够完美呼应墙面铜制壁灯与桌上百褶台灯的温暖视效，同时为娇艳的郁金香花卉和实木家具披上一层梦幻治愈的晚秋光晕。"
    }
  },
  {
    id: "room_2",
    name: "北欧风・暖 (Cozy Nordic)",
    style: "北欧风",
    imageUrl: scandinavianCozyLivingRoom,
    imageUrlFar: scandinavianCozyLivingRoom,
    imageUrlMid: scandinavianCozyLivingRoom,
    imageUrlClose: scandinavianCozyLivingRoom,
    analysis: {
      style: "北欧风",
      layout: "阳光洋溢的温馨北欧客餐厅。浅橡木实木地板与极净柔白色墙面相衬，超大落地玻璃推拉门引入明亮的漫射自然光，搭配轻盈的白色沙帘、舒适的L型米白色布艺沙发、精致绿植和质感挂画，描绘出一幅静谧舒适、温馨松弛的家居图景。",
      furniture: [
        "舒适大气的L型米白色高档面料布艺沙发 (Comfortable L-shaped cream-colored fabric sofa)",
        "清新柔和的鼠尾草绿与暖米色羽绒靠枕 (Sage-green and warm beige throw pillows)",
        "简约而富有肌理质感的米白色粗针织沙发搭巾 (Cozy textured white knitted throw blanket)",
        "经典北欧风实木白橡木长形茶几与电视柜 (Solid light oak wood coffee table & media console)",
        "清新雅致的绿植与角落里高大的木桶盆栽树 (Lush indoor plants & tall potted houseplant)",
        "墙面悬挂的白木框精致植物叶片艺术挂画 (Elegant wood-framed botanical art prints)",
        "厚实高弹的素色燕麦呢圈绒羊毛地毯 (Thick textured off-white wool area rug)"
      ],
      colors: [
        "清新白橡木 (Natural Light Oak Wood)",
        "柔和燕麦白 (Soft Creamy Oatmeal White)",
        "治愈鼠尾草绿 (Healing Sage/Olive Green)",
        "明亮自然光 (Bright Diffused Daylight)"
      ],
      recommendation: "极力推荐搭配木质灯架或配有经典褶皱百褶布艺灯罩的北欧原木落地灯。适合放置于L型沙发转角处或白橡木边几旁，其柔和的温情轮廓能完美烘托木质家具与满屋绿植的自然治愈感。",
      lightSuggestion: "推荐选择 2700K-3000K 暖黄漫射光。这种色温能最大化地唤醒天然白橡木的原木色温，与白沙帘滤过的自然光交融相衬，让整个客厅在每一个清晨与落日下都洋溢着极致的Hygge松弛温暖感。"
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
    name: "奶油风・雅 (Cozy French Creamy)",
    style: "奶油风",
    imageUrl: frenchCreamyBedroom,
    imageUrlFar: frenchCreamyBedroom,
    imageUrlMid: frenchCreamyBedroom,
    imageUrlClose: frenchCreamyBedroom,
    analysis: {
      style: "奶油风",
      layout: "温馨浪漫的法式奶油风卧室。大面积干净柔和的象牙白石膏线条背景墙搭配白色冠线，地面为光洁的高光浅米色瓷砖，映照着温暖柔光。床头两侧对称垂挂精致黄铜玻璃壁灯与吊灯，并配有大容量通顶式白色美式吸塑衣柜，营造出极度轻盈、温柔、棉花糖般治愈的高级雅致感。",
      furniture: [
        "意式轻奢级竖向条纹软包床头米色皮艺双人床 (Luxury cream leather platform bed with vertical channel tufting)",
        "高弹蓬松的纯白羽绒枕、奶茶色/浅桃粉高密织物床品 (Crisp white pillows with milk-tea and peach beige bedding)",
        "手感极其柔软蓬松的浅奶油色针织羊毛搭巾 (Ultra-soft fluffy cream knitted wool throw blanket)",
        "极简双抽屉哑光奶油白高档实木床头柜 (Sleek handleless 2-drawer matte white bedside cabinet)",
        "一侧放置的法式复古拱形黄铜台面镜 (French vintage arched tabletop brass mirror)",
        "经典通顶定制美式吸塑平开门白色大衣柜 (Custom built-in white shaker wardrobe with long brass handles)",
        "玻璃花瓶中插着的灵动新鲜大叶绿植分枝 (Fresh green branches in a minimalist glass vase)",
        "地坪上铺着的蓬松柔软白色小花瓣造型仿皮毛地毯 (Soft fluffy flower-shaped white plush area rug)"
      ],
      colors: [
        "燕麦奶白 (Warm Creamy Ivory)",
        "高雅奶茶/米粉色 (Elegant Milk-Tea & Peach Beige)",
        "质感黄铜金 (Brushed Brass Gold)",
        "清新植物绿 (Vibrant Foliage Green)"
      ],
      recommendation: "极力推荐搭配拉丝黄铜材质灯架、或配有米色褶皱百褶布罩、亦或优雅乳白磨砂玻璃灯罩的法式复古落地灯。放置在衣柜旁或奶油白床头柜一侧，完美共鸣黄铜壁灯，为法式奶油氛围注入流萤暖光。",
      lightSuggestion: "强烈建议选择 2700K-3000K 的极致柔和暖光。温暖的光晕能完美融化象牙白石膏线的立体边界，与床头铜制壁灯与吊灯的暖色星芒辉映，让整间卧室呈现出如棉花糖般轻柔治愈的浪漫居家感。"
    }
  },
  {
    id: "room_5",
    name: "寂宅风 (Wabi-Sabi)",
    style: "侘寂风",
    imageUrl: wabiSabiQuietLivingRoom,
    imageUrlFar: wabiSabiQuietLivingRoom,
    imageUrlMid: wabiSabiQuietLivingRoom,
    imageUrlClose: wabiSabiQuietLivingRoom,
    analysis: {
      style: "侘寂风",
      layout: "空灵宁静的暖调微水泥寂宅风客厅。墙面采用温润质朴的天然沙色陶土微水泥涂料，温润宽幅实木地板自然铺展。右侧一整面超大落地玻璃门引入静谧的绿色林景并滤入朦胧的光影。左侧对称置有温润的胡桃木高书架与极简木几，中间点缀一盏充满科技与复古温情融汇的悬挑发光小火炉，营造出大隐于市的极致宁静感。",
      furniture: [
        "极具包裹感的高档深炭灰色质感布艺落地一字型沙发 (Deep charcoal-gray textured fabric floor sofa)",
        "简约粗犷的矮胖长方形厚实原木实木低矮茶几 (Chunky low-profile rectangular solid dark-wood coffee table)",
        "经典暖米色高密度精纺羊毛扁平质感手工编制地毯 (Premium woven sand-beige wool blend area rug)",
        "极极简造型的米色中空框状悬空仿真动态发光火炉 (Sleek minimalist rectangular hollow-box electronic fireplace)",
        "粗陶质地带自然干枯细树枝的插花艺术陶罐 (Rustic ceramic pottery vase with delicate dried branches)",
        "左侧整面胡桃木实木高立柱开放式置物书架 (Solid dark walnut open vertical columns bookshelf)",
        "前景中露出的暖米色亲肤棉麻触感单人休闲沙发椅 (Cozy off-white single accent lounge armchair)"
      ],
      colors: [
        "侘寂微水泥沙色 (Warm Clay/Sand Beige)",
        "沉稳深炭灰 (Deep Charcoal & Soft Black)",
        "原木/深胡桃木色 (Natural Aged Oak & Walnut)",
        "壁炉跃动暖火 (Dancing Fireplace Amber Glow)"
      ],
      recommendation: "极力推荐搭配由天然和纸制成的日式褶皱落地灯或选用带微水泥/粗陶底座的落地灯。适合放置于深炭灰布艺沙发转角，或原木茶几一侧，其透出的柔雅暖光能完美共鸣悬空小火炉的融融暖意，打造极致禅静的居所温度。",
      lightSuggestion: "强烈建议选择 2500K-2700K 昏黄微光，营造围炉夜话的深邃冥想感。微弱的暖光投射在沙色微水泥墙上会拉出修长的自然暗影，与跃动的橙红炉火、远处的树影交相辉映，升华静寂、质朴且深沉的空间格调。"
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
      structure: "抛物线大弧度灯杆（撑杆），圆顶半球形金属灯罩，圆形扁平实心大理石底座。",
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
      structure: "不规则球形纸质灯罩，三根细长的金属立柱作为撑杆与底座。",
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
      structure: "圆球形乳白玻璃灯罩，一根纤细笔直的金属立柱（撑杆），一个小巧的圆形金属底座。",
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
      structure: "一根笔直的垂直立柱（撑杆），立柱上带有三个独立可旋转的锥形小射灯灯罩，一个圆形平整底座。",
      materials: ["重工业哑光黑碳钢主体", "复古铜质调节旋钮", "网格防爆金属网"],
      color: "哑光磨砂黑",
      lightType: "多角度独立旋转强光射灯",
      lightWarmth: "推荐 2700K 暖黄灯丝光",
      cozyIndex: 7,
      placementTip: "这款灯具的三个射灯头均可 360° 旋转，建议其中一个射灯头照射墙上装饰画，一个向下提供沙发区阅读光，最后一个向上照亮天花板，营造极富层次的工业洗墙光影。"
    }
  }
];
