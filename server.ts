import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Helper to convert base64 or fetch images
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    if (url.startsWith("data:image/")) {
      const split = url.split(",");
      const mimeType = url.split(";")[0].split(":")[1] || "image/jpeg";
      return { data: split[1], mimeType };
    }

    let cleanPath = url;
    if (url.startsWith("http")) {
      try {
        const parsedUrl = new URL(url);
        cleanPath = parsedUrl.pathname;
      } catch (e) {
        // Ignore URL parsing failure and try fetching directly
      }
    }

    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    const candidates = [
      path.join(process.cwd(), cleanPath),
      path.join(process.cwd(), "public", cleanPath),
      path.join(process.cwd(), "dist", cleanPath),
    ];

    for (const localPath of candidates) {
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const buffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        const base64 = buffer.toString("base64");
        return { data: base64, mimeType };
      }
    }

    let fetchUrl = url;
    if (url.startsWith("/")) {
      fetchUrl = `http://localhost:3000${url}`;
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Failed to fetch image from URL: ${fetchUrl}`);
    const arrayBuf = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(arrayBuf).toString("base64");
    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error("Error fetching image URL:", error, url);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body size limits for base64 images
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Initialize Gemini client lazily
  let ai: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API_KEY environment variable is required");
      }
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return ai;
  }

  // API endpoints proxying to backend points
  app.all(["/api/tool/*", "/api/upload/*"], async (req, res) => {
    const targetUrl = `http://aibigtree.com${req.originalUrl || req.url}`;
    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value && typeof value === 'string' && key.toLowerCase() !== 'host') {
          headers[key] = value;
        }
      }

      const options: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (typeof req.body === 'object') {
          options.body = JSON.stringify(req.body);
        } else {
          options.body = req.body;
        }
      }

      const forwardRes = await fetch(targetUrl, options);
      const resText = await forwardRes.text();

      forwardRes.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      res.status(forwardRes.status);
      return res.send(resText);
    } catch (error: any) {
      console.error(`Error forwarding request to ${targetUrl}:`, error);
      return res.status(500).json({ error: `Forwarding failed: ${error.message}` });
    }
  });

  // Chat Intent API
  app.post("/api/chat-intent", async (req, res) => {
    try {
      const { text, currentRoomId, currentLampId, currentParams } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Missing text" });
      }

      const client = getGeminiClient();

      const systemInstruction = `你是一个高保真落地灯试摆与智能光影融合App的AI设计总监助理。
你的目标是：
1. 深入理解用户在各种交互阶段输入的自然语言，而不仅仅是看关键字。
2. 提取用户想要进行的操作意图（Intent）以及相关参数。
3. 给出语气温馨、充满设计美学和艺术感、富有感染力、亲切而不机械的中文回复（aiResponse）。

【最核心规则 1 - 落地灯只能由用户上传】：
本项目中已经彻底去除了所有的预设落地灯！无论用户处于任何模式，落地灯均【没有任何内置预设】，完全依靠用户自行上传。
在与用户沟通时：
- 绝对不要推荐任何特定的内置落地灯（如钓鱼灯、野口勇灯等），也不要暗示系统有内置选项。
- 极其温柔、有礼、专业地告知用户：系统为了给您最广阔的个性化定制自由度，支持您上传任何心仪的落地灯照片进行一键融入。请点击界面上的 “📤 上传我的落地灯” 按钮，上传您的落地灯抠图或实拍图。

【最核心规则 2 - 自定义虚拟房间（用户不限于系统规定，可自由命名/定义房间风格）】：
如果用户在对话中提出了想要使用特定的房间背景风格，但这个风格不在下方 VIRTUAL_ROOMS 的预设中（例如“我想看美式书房”、“搞一个日式榻榻米房间”、“赛博朋克风电竞房”、“北欧阳光卧室”等）：
- 必须将 extractedData.roomId 设定为 "custom"。
- 必须在 extractedData.customRoomName 字段填入该自定义房间的具体名称（如“美式复古书房”）。
- 必须在 extractedData.customRoomAnalysis 字段中，为用户梦寐以求的场景设计出专属的专业设计报告。所有字段值必须使用简体中文，格式与 RoomAnalysis 相同。
- 助理的 aiResponse 应该极其有文学修辞和美学张力，告诉用户你已经为他们专属高保真定制并准备好了这一专属自定义虚拟房间场景，下一步可以进行灯具试摆！

当前可用的预设房间 (VIRTUAL_ROOMS):
- "room_7": "极简风・夜" (对应关键词：极简、纯白、微水泥、留白、冷调等)
- "room_1": "现代简约・夜" (对应关键词：现代、简约、客厅、灰色等)
- "room_2": "北欧风・夜" (对应关键词：北欧、原木、卧室、温馨、松弛等)
- "room_3": "新中式・暮" (对应关键词：中式、禅意、胡桃木、水墨、屏风等)
- "room_4": "奶油风・夜" (对应关键词：奶油风、燕麦奶、温柔、法式、浪漫等)
- "room_5": "寂宅风 (Wabi-Sabi)" (对应关键词：侘寂、陶罐、寂静、水泥、枯枝、寂宅、寂宅风等)

当前系统的交互状态：
- 当前已选房间ID: "${currentRoomId || "未选择"}"
- 当前是否已上传落地灯: "${currentLampId ? "已上传" : "未上传"}"
- 当前渲染参数: ${JSON.stringify(currentParams || {})}

你要返回以下 JSON 格式的解析结果，不要返回任何其他内容，也不要用 markdown \`\`\` 包裹：
{
  "intent": "select_room" | "toggle_light" | "set_view" | "generate_scene" | "general_chat" | "unknown",
  "extractedData": {
    "roomId": "room_7" | "room_1" | "room_2" | "room_3" | "room_4" | "room_5" | "custom" | null,
    "customRoomName": string | null (如果用户想自定义系统预设中没有的虚拟房间名称，在此字段填入用户描述的房间名称/风格),
    "customRoomAnalysis": {
      "style": string,
      "layout": string,
      "furniture": string[],
      "colors": string[],
      "recommendation": string,
      "lightSuggestion": string
    } | null,
    "lightState": "on" | "off" | null,
    "viewType": "far" | "mid" | "close" | null,
    "needModel": true | false | null
  },
  "aiResponse": "在这里填写您对用户消息的回复。回复要求：使用第一人称‘我’代表光影助理，结合光线、材质、氛围感，写出极其高级有艺术审美 and 感染力的中文话语。说明您做了什么调整，并在尚未上传灯具时极其温柔且明确地引导用户点击【上传我的落地灯】按钮。字数在100字左右。"
}

指令解析逻辑示例（极其重要）：
- 如果用户说 "想要一种温柔奶糯的感觉"，你应当理解这是想要切换到奶油风，intent="select_room"，extractedData.roomId="room_4"。
- 如果用户说 "我想用美式复古书房作为背景"，由于这不是预设房间，你应当将 intent="select_room"，extractedData.roomId="custom"，extractedData.customRoomName="美式复古书房"，并在 extractedData.customRoomAnalysis 里面自动生成高品质的美式复古书房空间美学方案！
- 如果用户说 "视角稍微拉远，我想看个全貌"，extractedData.viewType="far"。
- 如果用户说 "我想把灯灭掉/点亮"，extractedData.lightState="off" 或 "on"。
- 如果用户说 "开始摆放"、"去渲染吧"、"生成图片"、"我想看看最后效果"，这代表开始融合成图，intent="generate_scene"。
- 如果用户说 "有哪些落地灯选择" 或 "推荐个灯吧"，回复中应说明没有内置灯，请他们上传自己最喜欢的设计，intent="general_chat"。
- 如果用户进行了多项调整（例如 "换成卧室背景，并把灯打开"），你应当同时提取 extractedData.roomId="room_2" 和 extractedData.lightState="on"！

记住，请绝对不要输出任何 markdown 格式！只返回一个可以用 JSON.parse 直接解析的纯 JSON 字符串！`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { text: systemInstruction },
          { text: `用户最新的输入：\n"${text}"` }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              extractedData: {
                type: Type.OBJECT,
                properties: {
                  roomId: { type: Type.STRING },
                  customRoomName: { type: Type.STRING },
                  customRoomAnalysis: {
                    type: Type.OBJECT,
                    properties: {
                      style: { type: Type.STRING },
                      layout: { type: Type.STRING },
                      furniture: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      colors: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      recommendation: { type: Type.STRING },
                      lightSuggestion: { type: Type.STRING }
                    }
                  },
                  lightState: { type: Type.STRING },
                  viewType: { type: Type.STRING },
                  needModel: { type: Type.BOOLEAN }
                }
              },
              aiResponse: { type: Type.STRING }
            },
            required: ["intent", "extractedData", "aiResponse"]
          }
        }
      });

      const textRes = response.text?.trim() || "{}";
      res.json(JSON.parse(textRes));
    } catch (error: any) {
      console.error("Error in /api/chat-intent:", error);
      res.status(500).json({ error: error.message || "Failed to parse chat intent" });
    }
  });

  // Custom Room Analysis API
  app.post("/api/custom-room-analysis", async (req, res) => {
    try {
      const { roomName } = req.body;
      if (!roomName) {
        return res.status(400).json({ error: "Missing custom room name" });
      }

      const client = getGeminiClient();

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            text: `You are an expert interior designer. A user wants to try on a floor lamp in a custom virtual room named "${roomName}".
Generate a highly detailed and cohesive interior design specification (room analysis) for this specific room style.
The generated room MUST perfectly match the aesthetic described by the room name "${roomName}".

You MUST reply in Chinese (简体中文) for all string values.
You must return the analysis in a clean JSON format matching this exact schema:
{
  "style": "Specific style name matching user intent, e.g., 极简包豪斯风, 赛博朋克电竞房, 复古美式书房",
  "layout": "Detailed room layout description designed for this style, highlighting light, materials, space feel, e.g., 精致庄重的美式复古书房。四周环绕深色实木通顶书柜，散发淡淡墨香。中央摆放一张雕花胡桃木大书桌...",
  "furniture": ["List of 6-8 key highly stylized furniture pieces suited for this style in Chinese"],
  "colors": ["4 dominant color tones matching this style in Chinese"],
  "recommendation": "Specific aesthetic and functional recommendation on where to place a floor lamp (e.g., Position next to the leather reading chair, or by the desk to create a warm study corner)",
  "lightSuggestion": "Suggestion for the floor lamp light parameters (e.g., Warm amber light (2500K-2700K) to enhance the vintage wood warmth, or Neon cyan/magenta to elevate the cyber glow)"
}
Return only the raw JSON. Do not wrap it in markdown code blocks like \`\`\`json.`,
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              style: { type: Type.STRING },
              layout: { type: Type.STRING },
              furniture: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              colors: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              recommendation: { type: Type.STRING },
              lightSuggestion: { type: Type.STRING }
            },
            required: ["style", "layout", "furniture", "colors", "recommendation", "lightSuggestion"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text from Gemini");
      }

      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error("Error generating custom room analysis:", error);
      res.status(500).json({ error: error.message || "Failed to generate custom room analysis" });
    }
  });

  // Main Gemini router for Room Analysis, Lamp Analysis, and Scene Generation
  app.post("/api/gemini", async (req, res) => {
    try {
      const { model, payload } = req.body;
      if (!payload || !payload.task) {
        return res.status(400).json({ error: "Missing payload or task type" });
      }

      const client = getGeminiClient();

      if (payload.task === "analyze-room") {
        const { image, mimeType } = payload;
        if (!image) {
          return res.status(400).json({ error: "Missing room image data" });
        }

        const response = await client.models.generateContent({
          model: model || "gemini-2.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: image,
              },
            },
            {
              text: `You are an expert interior designer. Analyze this room image for a floor lamp try-on visualizer application. VERY IMPORTANT: You MUST reply in Chinese (简体中文) for all string values.
You must return the analysis in a clean JSON format matching this exact schema:
{
  "style": "Specific style name in Chinese (e.g. 现代简约, 奶油风, 北欧风, 新中式, 工业风, 极简风, 侘寂风, 田园风, 意式轻奢, 美式复古, Cyberpunk电竞)",
  "layout": "Room layout description in Chinese highlighting space, key structural elements, walls, floors, and natural lighting",
  "furniture": ["List of 3-5 key furniture items present in the room in Chinese, e.g., 灰色布艺沙发, 浅色实木茶几, 白色羊毛地毯"],
  "colors": ["Dominant color tones, e.g., Warm Beige, Charcoal Gray, Light Wood"],
  "recommendation": "Specific aesthetic and functional recommendation on where to place a floor lamp (e.g., Place next to the sofa corner to create a reading nook, Position in the empty corner behind the accent chair)",
  "lightSuggestion": "Suggestion for the floor lamp light parameters (e.g., Warm light (2700K-3000K) to complement the cozy fabric textures, Natural white (4000K) to enhance the clean minimalist lines)"
}
Return only the raw JSON. Do not wrap it in markdown code blocks like \`\`\`json.`,
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.STRING },
                layout: { type: Type.STRING },
                furniture: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                colors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                recommendation: { type: Type.STRING },
                lightSuggestion: { type: Type.STRING }
              },
              required: ["style", "layout", "furniture", "colors", "recommendation", "lightSuggestion"]
            }
          }
        });

        const text = response.text;
        if (!text) {
          throw new Error("No response text from Gemini");
        }
        return res.json(JSON.parse(text));

      } else if (payload.task === "analyze-lamp") {
        const { image, mimeType } = payload;
        if (!image) {
          return res.status(400).json({ error: "Missing lamp image data" });
        }

        const response = await client.models.generateContent({
          model: model || "gemini-2.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: image,
              },
            },
            {
              text: `You are an expert product and lighting designer. Perform a 100% EXHAUSTIVE, HIGH-PRECISION analysis of this floor lamp image across 8 key product dimensions:
VERY IMPORTANT: You MUST reply in Chinese (简体中文) for all string values.

8-DIMENSIONAL LAMP ANALYSIS METHODOLOGY (台灯8维深度解构拆解):
1. 产品结构与整体轮廓 (Product Structure & Silhouette): 识别灯具整体轮廓与结构组成，包括灯罩形状（圆筒/圆锥/百褶等）、灯杆造型（直立杆/一体光滑弧形弯杆/三脚架等）、底座形式（平整圆形/方块等）及各部件连接方式。
2. 外观形态与开关/关节特征 (Visual Form & Controls/Joints): 
   - 重点检查是否有拉链开关/悬挂珠链/拉绳（若无拉链，必须明确标注“无开关拉链/无悬挂珠链/无拉绳”；若有拉链才注明）。
   - 重点检查灯杆转折处是否有机械调节关节/卡扣/手柄（若为一体光滑弧形弯杆，必须明确标注“一体光滑弧度，无凸起调节手柄/无铰链转轴”）。
3. 材质工艺 (Materials & Craftsmanship): 分析灯罩织物/布艺纹理、金属杆颜色与哑光/高光质感、底座材质。
4. 比例尺寸 (Proportions & Scale): 判断高度、宽度、灯罩与灯杆的弯曲比例关系及视觉重心。
5. 颜色搭配 (Color Scheme): 精准拆解灯罩、灯杆、连接件、底座各自的颜色。
6. 光影效果 (Lighting Effects): 光源颜色、亮度、透光方式与产生的环境氛围。
7. 设计风格 (Design Style): 判断设计风格（如现代极简弧形风、复古法式百褶风等）。
8. 空间关系与搭配场景 (Spatial Fit): 判断适用场景与推荐摆放方位。

You must return the analysis in a clean JSON format matching this exact schema:
{
  "style": "Overall design style",
  "structure": "Exhaustive breakdown covering structure, pole shape, shade shape, base, and EXPLICITLY stating whether pull-chains or adjustment levers exist (e.g., 结构组成: 暖白色布艺圆筒灯罩、一体光滑弧形哑光黑色金属灯杆（无调节手柄/无铰链）、无拉链开关/无挂珠链、底部黑色平整圆形金属底座。)",
  "materials": ["Exhaustive list of materials used"],
  "color": "Exact color breakdown per component",
  "lightType": "Lighting description",
  "lightWarmth": "Light warmth recommendation",
  "cozyIndex": 9,
  "placementTip": "Placement tip"
}
Return only the raw JSON. Do not wrap it in markdown code blocks like \`\`\`json.`,
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.STRING },
                structure: { type: Type.STRING },
                materials: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                color: { type: Type.STRING },
                lightType: { type: Type.STRING },
                lightWarmth: { type: Type.STRING },
                cozyIndex: { type: Type.INTEGER },
                placementTip: { type: Type.STRING }
              },
              required: ["style", "structure", "materials", "color", "lightType", "lightWarmth", "cozyIndex", "placementTip"]
            }
          }
        });

        const text = response.text;
        if (!text) {
          throw new Error("No response text from Gemini");
        }
        return res.json(JSON.parse(text));

      } else if (payload.task === "generate-scene") {
        const { roomAnalysis, lampAnalysis, params, roomImage, lampImage } = payload;
        if (!roomAnalysis || !lampAnalysis) {
          return res.status(400).json({ error: "Missing required parameters for scene generation" });
        }

        console.log(`[SERVER_API] Received task: generate-scene. Camera View Selected in UI: ${params?.viewType}. Full params received:`, JSON.stringify(params));

        const parts: any[] = [];

        // ALWAYS add the room image as a visual context if provided
        if (roomImage) {
          parts.push({ text: "IMAGE 1 [REFERENCE ROOM ENVIRONMENT]:" });
          try {
            const fetched = await fetchImageAsBase64(roomImage);
            parts.push({
              inlineData: {
                data: fetched.data,
                mimeType: fetched.mimeType,
              }
            });
          } catch (e) {
            console.error("Failed to fetch room image URL, ignoring inlineData context:", e);
          }
        }

        const hasRoomImage = !!roomImage;

        const lampMaterialsStr = Array.isArray(lampAnalysis?.materials) 
          ? lampAnalysis.materials.join("、") 
          : (lampAnalysis?.materials || "N/A");

        const roomFurnitureStr = Array.isArray(roomAnalysis?.furniture) 
          ? roomAnalysis.furniture.join("、") 
          : (roomAnalysis?.furniture || "N/A");

        const roomColorsStr = Array.isArray(roomAnalysis?.colors) 
          ? roomAnalysis.colors.join("、") 
          : (roomAnalysis?.colors || "N/A");

        // Add lamp image as a visual context if provided
        if (lampImage) {
          parts.push({ text: "IMAGE 2 [EXACT REFERENCE FLOOR LAMP IMAGE TO REPLICATE - 必须100%按此图还原落地灯]:" });
          try {
            const fetched = await fetchImageAsBase64(lampImage);
            parts.push({
              inlineData: {
                data: fetched.data,
                mimeType: fetched.mimeType,
              }
            });
          } catch (e) {
            console.error("Failed to fetch lamp image URL, ignoring inlineData context:", e);
          }
        }

        // Safely extract params with defaults
        const safeParams = {
          viewType: params?.viewType || "far",
          quality: params?.quality || "1K",
          ratio: params?.ratio || "4:3",
          lightState: params?.lightState || "on",
          needModel: !!params?.needModel,
        };

        // Detailed prompt and structure preservation guidance based on selected viewType
        let preservationGuidance = "";
        let perspectiveGuidance = "";

        if (safeParams.viewType === "far") {
          preservationGuidance = "2. FAR VIEW (远景/局部全高视角): Frame a cozy localized corner (sofa armrest/backrest or bedside + wall/curtains). The camera frames the FULL vertical height of the floor lamp from top shade to bottom base. The floor lamp MUST be placed in a realistic, logical location (beside the sofa armrest or bed nightstand) and positioned in the CENTRAL focus area of the photograph. DO NOT show a full wide room — focus strictly on this cozy corner.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (FAR VIEW / 远景视角): Medium-wide interior photography centered on the floor lamp in its cozy room corner. The full lamp stands centered in the frame.";
        } else if (safeParams.viewType === "mid") {
          preservationGuidance = "2. MID VIEW (中景/中近景视角 - 参考中近景视角图): Reference high-end lifestyle interior photography (参考中近景视角图). Frame a tight, warm medium shot focusing on the illuminated upper 2/3 of the floor lamp (lampshade and pole) standing naturally next to the sofa backrest or wooden side table, with soft translucent window curtains or textured wall behind it. The floor lamp MUST be centered in the frame. Warm golden light casts natural highlights onto nearby furniture surfaces. Lower base and floor may be cropped out.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (MID VIEW / 中景视角): Medium-shot perspective capturing the illuminated floor lamp in the central frame, flanked by sofa armrest/backrest and soft background curtains.";
        } else if (safeParams.viewType === "close") {
          preservationGuidance = "2. CLOSE VIEW (近景/特写视角 - 参考近景特写参考图): Reference tight product & interior detail photography (参考近景特写参考图). Zoom in close to focus directly on the glowing lampshade and upper pole of the floor lamp. The illuminated lampshade MUST dominate the central area of the frame. Soft ambient background wall, curtains, or tabletop decor are visible behind the lamp. Floor and base are cropped out.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (CLOSE VIEW / 近景特写视角): Close-up detail shot centered on the glowing lampshade, upper pole, and warm light diffusion.";
        }

        // Detailed style specifications for Virtual Rooms
        const STYLE_SPECS: Record<string, string> = {
          "极简风": "MASTERPIECE ARCHITECTURE: Ultra-high-end elegant warm white minimalist bedroom (暖白极简风卧室) featuring authentic and realistic high-end furniture. MATERIALS: Seamless immaculate warm white plaster headboard wall panels, warm natural light white-washed wood floors, sheer translucent white linen window curtains, thick off-white textured wool area rug. LIGHTING: Built-in ambient linear LED yellow backlight throwing a soft golden glow behind the headboard panel, warm cove ceiling lighting casting a gentle wash downward, and a slender matte-white or minimalist pendant light. NO harsh dark shadows, pure soft-focus lighting. FURNITURE: A realistic, highly comfortable low-profile platform bed with premium light-beige or cream-colored fabric upholstery, styled with fluffy white pillows, pristine cream bedding, and a soft knitted throw blanket. Side table is a sleek, modern round matte-white bedside stand. Large glass landscape windows with light frames showing a peaceful outdoor forest or garden view. VIBE: Warm, serene, bright, extremely peaceful, ultra-luxurious, and clean, photorealistic 8k.",
          "现代简约": "MASTERPIECE ARCHITECTURE: Contemporary luxury modern interior design. Open floor plan with clean straight lines. MATERIALS: Large-format polished marble or sintered stone slabs, tinted glass partitions, brushed metal, premium Italian leather sofas. COLORS: Monochromatic scale of charcoal, slate gray, pure white, and subtle metallic accents. LIGHTING: Cinematic recessed spotlights, high-end residential. VIBE: Sophisticated, expensive, understated luxury, hyper-detailed 3d render style.",
          "北欧风": "MASTERPIECE ARCHITECTURE: Sun-drenched warm cozy Scandinavian living room (北欧风温润客餐厅) featuring authentic and realistic high-end residential furniture. MATERIALS: Light natural white oak solid wood floors, flawless warm soft-white plastered walls, sheer translucent flowing white curtains, thick high-density off-white or oat-beige textured wool area rug. LIGHTING: Abundant bright diffused natural daylight streaming from large glass sliding patio doors, combined with soft warm glow (2700K-3000K) from a classic floor lamp with a pleated cream lampshade. FURNITURE: A spacious comfortable L-shaped cream-colored or off-white fabric sofa, styled with sage-green, light gray and warm beige throw pillows and a textured white knit throw blanket. A minimalist long white-oak coffee table and a matching low wood TV media console on the side. Lush green houseplants including a tall potted green indoor tree (like Radermachera sinica) in a wicker/ceramic pot and small trailing plants. VIBE: Extremely cozy, bright, serene, natural, healing, peaceful, and warm, photorealistic 8k.",
          "新中式": "MASTERPIECE ARCHITECTURE: High-End warm and elegant New Chinese Style Living Room (Warm Oriental Zen). Symmetrical, spacious layout. MATERIALS: Light natural wood floors, premium warm oak and walnut wall paneling, elegant hollow wood grid screens (木格栅), warm plaster walls, sheer translucent linen curtains. FURNITURE: A traditional low-profile solid wood daybed (榻) with a plush cream-colored mattress and clean bolster cushions placed symmetrically, a minimalist solid-wood coffee table, and classical rattan woven armchairs. DETAILS: Traditional scroll ink painting of a red plum blossom branch (写意梅花水墨挂轴), a warm rustic ceramic vase with white plum blossoms on a low wooden console, and a large lush potted green houseplant (bamboo or money-tree) in a ceramic pot. LIGHTING: Built-in ambient ceiling cove lighting casting a rich soft warm yellow glow, and a beautiful central bronze lantern/chandelier. VIBE: Warm, serene, sophisticated, Zen, culturally rich, high-end residential, photorealistic.",
          "奶油风": "MASTERPIECE ARCHITECTURE: Elegant French warm creamy-style bedroom (法式温柔奶油风卧室) featuring authentic and realistic high-end furniture. MATERIALS: Immaculate warm-white or ivory plaster wall panels with delicate classic mouldings (法式石膏线条) and clean white crown mouldings, premium high-gloss pristine beige ceramic floor tiles reflecting soft light, a fluffy white flower-shaped plush rug at the foot of the bed. LIGHTING: Gentle, dreamy warm light glowing from two wall-mounted brass glass flower-shaped sconces mounted symmetrically beside the bed, a delicate brass glass pendant lamp hanging low on the left bedside, and ceiling spotlights casting soft focus. FURNITURE: A luxurious low-profile double bed with a soft cream/beige leather headboard featuring vertical channel tufting (竖向拉扣/竖条纹软包), layered with fluffy white pillows, high-end milk-tea and pale-peach beige bedding, and a soft cream wool knit throw blanket. Side tables are minimalist 2-drawer matte cream cabinets with slender gold brass legs and gold drawer pulls. Next to the bed stands a custom built-in white shaker wardrobe with long brass handles. Left bedside table holds a vintage arched brass tabletop mirror and fresh green foliage branches in a minimalist glass vase. VIBE: Extremely gentle, warm, quiet, romantic, luxurious, and cozy, marshmallow-like, photorealistic 8k.",
          "侘寂风": "MASTERPIECE ARCHITECTURE: Elegant, quiet Wabi-Sabi style living room (寂宅风客厅) featuring authentic and realistic high-end residential furniture. MATERIALS: Soft warm sand-beige textured clay plaster walls, warm natural wood floors, sheer translucent white linen window curtains, thick woven sand-beige wool blend area rug. LIGHTING: Built-in soft warm glow from a modern minimalist rectangular hollow box fireplace with a realistic yellow dancing flame, combined with gentle daylight filtering through a large floor-to-ceiling glass sliding patio door. FURNITURE: A highly comfortable, luxurious low-profile deep charcoal-gray/black textured fabric sofa, and a low chunky rectangular solid dark-wood coffee table. Side furniture includes a tall open dark-wood bookshelf on the left filled with books and organic-shaped ceramic vessels, and a cozy single lounge armchair in light beige cotton linen. Decor includes a large frameless abstract textured canvas painting in deep dark brown and charcoal tones on the wall, and dry twigs/branches in a rustic ceramic vase. VIBE: Extremely quiet, serene, peaceful, natural, and warm, photorealistic 8k.",
          "田园风": "MASTERPIECE ARCHITECTURE: Warm cozy French country-style bedroom (温润田园风卧室) featuring authentic and realistic high-end residential furniture. MATERIALS: Light natural warm honey-oak wood floors, soft creamy-white or pale beige plaster walls, sheer translucent flowing white curtains, beautiful ruffled floral-lace window curtains. LIGHTING: Gentle, romantic indirect light from classic wall-mounted bronze sconces with small pleated fabric shades glowing warm golden yellow, combined with soft diffused daylight filtering from the window. FURNITURE: A highly comfortable classic solid-wood single/double bed frame styled with fluffy white pillows, delicate pink and yellow pastel-colored accent bedding and sheets with floral patterns, and a soft knit throw blanket. Side table is a minimalist metal round bedside stand with tulips. A classic, rustic warm solid-wood study desk styled with books, a small pleated-shade table lamp, and small green potted plant. Under the bed lies a textured handwoven jute area rug. VIBE: Warm, sweet, romantic, serene, natural, healing, peaceful, and cozy, photorealistic 8k."
        };

        const roomStylePrompt = hasRoomImage
          ? `CRITICAL ROOM BACKGROUND PRESERVATION (必须100%绝对保留IMAGE 1原图房间与家具面貌):
- Look directly at the attached reference room image (IMAGE 1).
- You MUST STRICTLY PRESERVE the exact room background, architectural wall materials (wallpapers, wood paneling, plaster, paint colors), window placements, curtains, floor finish, and existing sofa/bed furniture from IMAGE 1.
- DO NOT REPLACE OR MODIFY THE SOFA/BED: The sofa or bed in IMAGE 1 MUST remain identical in shape, fabric/leather material, color, and cushions.
- DO NOT CHANGE WALLS, WINDOWS, OR DECOR: Keep the exact wall colors, paneling, and decor from IMAGE 1.
- DO NOT generate a brand new room or alter the room's interior decoration! Your task is ONLY to place the floor lamp (IMAGE 2) into this exact room corner from IMAGE 1.`
          : `CRITICAL ROOM STYLE MATCHING: You MUST strictly generate the room according to the textual design specifications below to perfectly capture the essence of "${roomAnalysis.style}". 必须严格按照以下【设计规范】和【文字描述】生成极致完美的【${roomAnalysis.style}】风格样板间，完全符合对应的颜色、家具和布局设定，切记不要偏离指定的风格！
  
DESIGN SPECIFICATION FOR THIS STYLE:
${STYLE_SPECS[roomAnalysis.style] || "Generate a professional, high-end interior matching the requested style."}
  
The room style and context MUST match:
- Style: ${roomAnalysis.style}
- Layout: ${roomAnalysis.layout}
- Furniture: ${roomFurnitureStr}
- Colors: ${roomColorsStr}`;

        const lightPrompt = safeParams.lightState === "on"
          ? `CRITICAL (LIGHT IS ON): Warm, soft, high-fidelity light glows from the light source of the lamp. You MUST generate realistic volumetric light cones, ambient lighting casting on the nearby furniture and floor, and highlight shadows with rich glow effects. The warm light from the floor lamp (approx 3000K-3500K) must blend harmoniously with the room's cozy ambient lighting. The entire scene must use a unified, natural, and comfortable color temperature without any strange, extreme contrast between cold blue and warm orange.`
          : `CRITICAL (LIGHT IS OFF): The floor lamp is TURNED OFF. No artificial light is emitted. The lamp is purely lit by the room's ambient daylight and surrounding lights, revealing the authentic texture, colors, and shadows of its structural elements (lampshade, metal poles, wooden elements) without any active glow or light-cone emission.`;

        const humanGuidance = safeParams.needModel 
          ? "5. PERSONA / HUMAN PRESENCE: You MUST include a realistic human model (e.g., a person reading, relaxing, or enjoying the space) to enhance the living atmosphere. The human figure should seamlessly blend into the scene and interact naturally with the lighting and environment. 认知说明：必须要包含一个真实的人物模型（比如正在阅读或休息的人）。" 
          : "5. PERSONA / HUMAN PRESENCE: DO NOT include any human figures or models in the scene. Provide a pure architectural and furniture visualization. 绝对不要在画面中出现任何人物模型。";

        const qualityPrompt = safeParams.quality === "4K"
          ? "7. IMAGE QUALITY & RESOLUTION: Render at ultra-high 4K resolution with hyper-fine textures, extreme edge sharpness, and studio master photographic clarity."
          : safeParams.quality === "2K"
          ? "7. IMAGE QUALITY & RESOLUTION: Render at high-definition 2K resolution with crisp details and clean clarity."
          : "7. IMAGE QUALITY & RESOLUTION: Render at standard clean 1K resolution.";

        const prompt = `A professional, ultra-high-resolution interior design photograph.
Your task is to seamlessly integrate the provided reference floor lamp (IMAGE 2) into the room environment (IMAGE 1), strictly maintaining 100% visual fidelity for BOTH the room (IMAGE 1) and the floor lamp (IMAGE 2).

${roomStylePrompt}

THE LAMP TO INTEGRATE:
Style: ${lampAnalysis.style}
Structure details: ${lampAnalysis.structure || "N/A"}
Materials: ${lampMaterialsStr}
Color: ${lampAnalysis.color}
Light Type: ${lampAnalysis.lightType}
Light Warmth: ${lampAnalysis.lightWarmth}

${lightPrompt}

HIGHEST PRIORITY CONSTRAINTS (MUST BE STRICTLY FOLLOWED):
0. CRITICAL DUAL VISUAL FIDELITY - PRESERVE BOTH IMAGE 1 AND IMAGE 2 (最核心双重约束 - 100%忠实还原原图房间与落地灯):
   - IMAGE 1 IS THE ABSOLUTE TRUTH FOR THE ROOM: Look directly at IMAGE 1. Keep the exact walls, window frame, curtains, flooring, and sofa/bed from IMAGE 1. DO NOT change the sofa/bed style, upholstery material, or wall finish!
   - IMAGE 2 IS THE ABSOLUTE TRUTH FOR THE FLOOR LAMP: Look directly at IMAGE 2. Replicate the floor lamp in IMAGE 2 with exact 1:1 visual fidelity across every dimension:
     * EXACT Lampshade: Same geometry (e.g. cylinder/drum/cone/pleated/flower-shaped), fabric/material texture, pleat pattern, and color as shown in IMAGE 2.
     * EXACT Pole/Stand: Same exact curve angle, pole thickness, material finish (e.g. matte black/brushed brass/chrome), and trajectory. If IMAGE 2 shows a smooth arched pole, DO NOT add any joints, levers, knobs, or extra bends! If IMAGE 2 shows a straight vertical pole, DO NOT bend it!
     * EXACT Base: Same base type, diameter, and material as in IMAGE 2.
     * ZERO HALLUCINATIONS: DO NOT add any pull-chains, hanging beads, extra shelves, swing arms, or hardware controls unless explicitly visible in IMAGE 2!
   - Any visual deviation from IMAGE 1 (room) or IMAGE 2 (lamp) is a critical failure!

1. POLE SHAPE & CONTROL DETAILS (灯杆造型与开关细节 - 100%按IMAGE 2原样还原):
   - POLE SHAPE FIDELITY: If the lamp pole in IMAGE 2 is a smooth arched curve (光滑弧形弯杆), it MUST be rendered as ONE continuous, sleek, smooth curved rod. STRICTLY FORBIDDEN: DO NOT add any mechanical adjustment knobs, angular elbow hinges, counterweight handles, or lever sticks protruding from the pole bend!
   - ABSOLUTE PROHIBITION OF HALLUCINATED PULL-CHAINS: If IMAGE 2 shows no hanging cord or pull-chain switch under the lampshade, YOU MUST NOT RENDER ANY PULL-CHAIN, BEAD CHAIN, OR SWITCH CORD UNDER THE LAMPSHADE!
   - You MUST reproduce ONLY the exact physical parts visible in IMAGE 2 and described in the lamp analysis structure: ${lampAnalysis.structure || "N/A"}.
   - IF the original floor lamp pole is a straight vertical rod, it MUST remain a single clean vertical rod. DO NOT generate any horizontal side arms protruding outwards.
   - IF the original floor lamp does NOT have a built-in tray/table, DO NOT add a tray. IF it HAS a tray, preserve its exact shape, height, and color.

2. ABSOLUTE LAMP FAITHFULNESS & STRUCTURAL INTEGRITY (100% 还原落地灯整体结构与颜色 - 最重要约束):
   - CRITICAL PRIORITY: The most important constraint is that the generated floor lamp MUST be perfectly identical to the uploaded floor lamp image. You MUST completely and exactly reproduce the floor lamp's original appearance, colors, materials, structure, and shape. No modifications or hallucinations are allowed for the lamp itself!
   - PHYSICAL INTEGRITY: The floor lamp (lampshade, pole, built-in tray if any, and bottom base) is ONE SINGLE CONNECTED PHYSICAL OBJECT. The base MUST rest firmly on the floor. DO NOT detach the pole from its base, do not separate the tray, and DO NOT fuse/embed the lamp pole or tray into adjacent nightstands or drawers! The bedside nightstand and sofa are independent items sitting beside the floor lamp.

3. STRICT ROOM ARCHITECTURE, WALLS, WINDOWS & FURNITURE FAITHFULNESS (房间墙面、窗户与家具严禁随意篡改与幻觉):
   - ABSOLUTE ROOM FIDELITY: You MUST PRESERVE the exact architectural structure, wall finishes (wallpapers, dark wood paneling, stone slabs, paint color, plaster textures), window locations, and existing furniture from IMAGE 1.
   - NO HALLUCINATED WINDOWS OR WALLS: If IMAGE 1 does NOT have a window on a wall, DO NOT add a window! If IMAGE 1 has dark wood wall panels, KEEP the exact same dark wood panels! DO NOT change the wall material or color!
   - NO UNREQUESTED FURNITURE: DO NOT introduce random new cabinets, tables, chairs, or shelves that do not exist in IMAGE 1. The furniture present in the generated image MUST strictly match the furniture in IMAGE 1.
   - PERSPECTIVE CONSISTENCY: The camera's shooting distance or framing may zoom in depending on the View Type (Far / Mid / Close), BUT the underlying room elements (background wall, curtains, sofa, bedding) MUST remain 100% faithful to IMAGE 1 without any arbitrary changes.
   - You are STRICTLY FORBIDDEN from generating a wide-angle full-room shot showing an entire room, huge open space, or random new room layouts. Focus strictly on the localized nook/corner where the lamp is placed.

4. STRICT LAMP PLACEMENT RULES & CENTERED COMPOSITION (落地灯摆放位置与画面居中构图):
   - LOGICAL PLACEMENT: The floor lamp MUST be placed in a realistic and natural location (e.g. beside the sofa outer armrest or next to the bed nightstand in the corner). DO NOT place the floor lamp in floating or unnatural places (such as walkways, directly in front of sofa seats, or at the foot of the bed) just to achieve centering.
   - CENTERED FRAMING: Achieve central placement in the photograph through camera angle and framing (通过摄像机的角度选择、对焦取景与构图剪裁，将落地灯呈现在画面中央). The floor lamp MUST be the undisputed primary hero subject and positioned in the central area of the photograph.
   - LOCALIZED NOOK ONLY: Do NOT show an entire wide room — focus purely on this localized nook/corner (无需展示完整房间，只需展示落地灯所在的温馨局部角落).

5. CAMERA CENTERING & VIEW-TYPE PERSPECTIVE (相机镜头对焦取景):
   - ${perspectiveGuidance}

6. ZERO BOKEH & DEEP FOCUS (全焦清晰 - 画面真实清晰):
   - You MUST keep the ENTIRE photograph (lamp, background wall, adjacent furniture, curtains) completely sharp and clear in deep focus.
   - DO NOT apply unnatural bokeh blur or heavy portrait-style background blur.

${qualityPrompt}

${preservationGuidance}

${humanGuidance}`;

        parts.push({ text: prompt });

        const response = await client.models.generateContent({
          model: "gemini-3.1-flash-image",
          contents: {
            parts: parts,
          },
          config: {
            imageConfig: {
              aspectRatio: safeParams.ratio || "4:3",
            },
          },
        });

        let base64Image = null;
        let textResponse = "";

        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              base64Image = part.inlineData.data;
            } else if (part.text) {
              textResponse += part.text;
            }
          }
        }

        if (!base64Image) {
          throw new Error("No image was returned by the generative model. " + textResponse);
        }

        return res.json({ image: `data:image/png;base64,${base64Image}` });

      } else {
        return res.status(400).json({ error: `Unsupported task type: ${payload.task}` });
      }

    } catch (error: any) {
      console.error("Error in /api/gemini endpoint:", error);
      res.status(500).json({ error: error.message || "Gemini endpoint error" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
