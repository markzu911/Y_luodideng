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
        let viewTypeSpecificPrompt = "";

        if (hasRoomImage) {
          // WHEN USER UPLOADED A ROOM IMAGE (IMAGE 1):
          if (safeParams.viewType === "close") {
            viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: CLOSE VIEW (近景/特写视角 - 必须100%基于用户上传的IMAGE 1房间背景进行特写取景):
- CAMERA CROP & ZOOM: Macro close-up detail shot focusing directly on the glowing lampshade and upper stem/pole of the floor lamp (IMAGE 2).
- BACKGROUND MUST BE IMAGE 1: The background behind the lamp pole and shade MUST show the exact wall texture, dark wood paneling, marble wall, or vertical window blinds directly from IMAGE 1.
- ABSOLUTE PROHIBITION OF NEW FURNITURE: DO NOT add any new side cabinets, nightstands, tabletop lamps, or decor that DO NOT exist in IMAGE 1! If the lamp in IMAGE 1 is next to the sofa edge or marble wall, show that exact sofa fabric edge or marble wall from IMAGE 1 in the close-up background.`;
          } else if (safeParams.viewType === "mid") {
            viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: MID VIEW (中景视角 - 必须100%基于用户上传的IMAGE 1房间背景进行中景取景):
- CAMERA FRAMING: Medium-shot framing focusing on the floor lamp (IMAGE 2) standing beside the sofa/bed in IMAGE 1.
- BACKGROUND & FURNITURE: Maintain the exact sofa fabric, cushions, wall paneling, and curtains directly from IMAGE 1. DO NOT invent new furniture or change the sofa.`;
          } else {
            viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: FAR VIEW (远景/全景视角 - 必须100%完全保留用户上传的IMAGE 1房间全局布局):
- FULL ROOM PRESERVATION: Render the COMPLETE wide/full room scene EXACTLY as shown in IMAGE 1.
- DO NOT ALTER THE ROOM: Keep the full wide camera angle of IMAGE 1, including the entire sofa, coffee table, rug/floor, window curtains/blinds, ceiling lights, and background walls.
- LAMP INTEGRATION: Seamlessly place the single floor lamp from IMAGE 2 into its natural spot beside the sofa/bed in IMAGE 1, perfectly matching the perspective, scale, and lighting of IMAGE 1.`;
          }
        } else {
          // VIRTUAL ROOM GENERATION (No IMAGE 1 uploaded):
          if (safeParams.viewType === "close") {
            viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: CLOSE VIEW (近景/特写视角 - 100%微距特写):
- CAMERA CROP & ZOOM: Macro detail shot focusing on the illuminated lampshade and upper stem/pole.
- BACKGROUND: Background shows warm wall texture or side table decor in soft glow.
- PROHIBITION: Do NOT show ceiling, floor, or full living room layout.`;
          } else if (safeParams.viewType === "mid") {
            viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: MID VIEW (中景视角):
- Medium-shot perspective focusing on the upper 2/3 of the floor lamp next to sofa backrest or bedside table.
- Background shows soft translucent curtains or warm wall paneling.
- Base/floor cropped out.`;
          } else {
            viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: FAR VIEW (远景/局部角落视角):
- Focused interior photography framing a cozy localized sofa/bed corner matching the chosen style.
- Show sofa armrest with cushions in foreground and soft background curtains/wall paneling.`;
          }
        }

        // Detailed style specifications for Virtual Rooms
        const STYLE_SPECS: Record<string, string> = {
          "极简风": "Ultra-high-end warm white minimalist interior corner (暖白极简风局部角落). MATERIALS: Seamless warm white plaster headboard wall panels, warm natural wood floors, sheer translucent white linen window curtains, thick off-white textured wool rug. LIGHTING: Built-in ambient linear LED yellow backlight throwing a soft golden glow. FURNITURE: A cozy sofa armrest or low-profile bed corner with light-beige fabric upholstery, styled with plush white pillows and a soft knitted throw blanket.",
          "现代简约": "Contemporary luxury modern interior corner (现代简约局部角落). MATERIALS: Large-format sintered stone slab wall, tinted glass partition, brushed metal accents. COLORS: Charcoal, slate gray, pure white. FURNITURE: Premium Italian leather sofa armrest with soft cushions.",
          "北欧风": "Sun-drenched warm cozy Scandinavian living room corner (北欧风温润沙发角落). MATERIALS: Light natural white oak wood floor, warm soft-white plastered wall, sheer translucent flowing white curtains, thick oat-beige wool rug. FURNITURE: A comfortable cream-colored fabric sofa nook with sage-green and warm beige throw pillows and a textured white knit throw blanket. A tall potted green indoor plant.",
          "新中式": "High-End warm and elegant New Chinese Style room corner (新中式温润禅意角落). MATERIALS: Light natural wood floors, warm oak/walnut wall paneling, hollow wood grid screens (木格栅), sheer linen curtains. FURNITURE: Traditional low-profile solid wood daybed (榻) corner with plush cream mattress and bolster cushions.",
          "奶油风": "French warm creamy-style bedroom/living corner (法式温柔奶油风局部角落). MATERIALS: Ivory plaster wall panels with delicate classic mouldings (法式石膏线条), high-gloss beige tiles, fluffy plush rug. FURNITURE: Soft cream leather headboard or sofa corner with vertical channel tufting, milk-tea and pale-peach beige cushions.",
          "侘寂风": "Elegant, quiet Wabi-Sabi style corner (寂宅风局部角落). MATERIALS: Soft warm sand-beige clay plaster wall, natural wood floors, translucent linen curtains, woven sand-beige wool rug. FURNITURE: Comfortable charcoal-gray or beige fabric sofa armrest corner with dry twigs in a rustic ceramic vase.",
          "田园风": "Warm cozy French country-style corner (温润田园风局部角落). MATERIALS: Light natural honey-oak wood floors, soft creamy-white plaster walls, sheer ruffled lace curtains. FURNITURE: Comfortable classic bed frame or sofa corner with pastel-colored accent bedding and floral throw pillows."
        };

        const roomStylePrompt = hasRoomImage
          ? `CRITICAL ROOM BACKGROUND PRESERVATION (100% 必须绝对完全还原IMAGE 1原图背景与家具面貌 - 核心约束):
- Look directly at the attached reference room image (IMAGE 1).
- ABSOLUTE TRUTH FOR THE ROOM: IMAGE 1 is the 100% exact reference for the background. You MUST strictly preserve:
  1. EXACT Sofa / Bed: Keep the exact shape, color, fabric/leather texture, throw pillows, and blankets from IMAGE 1. DO NOT change a white sofa to brown or change its style!
  2. EXACT Walls & Windows: Keep the exact wall colors, marble/wood paneling, wallpaper, window frames, and vertical blinds/curtains from IMAGE 1.
  3. EXACT Floor & Coffee Table: Keep the exact rug, flooring material, coffee table, and room decor from IMAGE 1.
- YOUR SOLE TASK: Place the floor lamp from IMAGE 2 into the exact room environment from IMAGE 1. DO NOT generate a new room or alter IMAGE 1's interior design!`
          : (safeParams.viewType === "close"
              ? `ROOM STYLE CONTEXT: Match the wall colors, textures, and ambient materials of "${roomAnalysis.style}" for the background wall.`
              : `CRITICAL ROOM STYLE MATCHING: You MUST strictly generate the localized room corner according to the textual design specifications below for "${roomAnalysis.style}".
DESIGN SPECIFICATION FOR THIS STYLE:
${STYLE_SPECS[roomAnalysis.style] || "Generate a professional, high-end interior corner matching the requested style."}
- Style: ${roomAnalysis.style}
- Layout: ${roomAnalysis.layout}
- Furniture: ${roomFurnitureStr}
- Colors: ${roomColorsStr}`);

        const lightPrompt = safeParams.lightState === "on"
          ? `CRITICAL (LIGHT IS ON): Warm, soft, high-fidelity light glows from the light source of the lamp. You MUST generate realistic volumetric light cones, ambient lighting casting on nearby surfaces, and highlight shadows with rich glow effects. The warm light from the floor lamp (approx 3000K-3500K) must blend harmoniously with the cozy ambient lighting.`
          : `CRITICAL (LIGHT IS OFF): The floor lamp is TURNED OFF. No artificial light is emitted. The lamp is purely lit by ambient daylight.`;

        const humanGuidance = safeParams.needModel 
          ? "PERSONA / HUMAN PRESENCE: Include a realistic human model interacting naturally with the space." 
          : "PERSONA / HUMAN PRESENCE: DO NOT include any human figures or models in the scene. Provide a pure architectural and furniture visualization.";

        const qualityPrompt = safeParams.quality === "4K"
          ? "IMAGE QUALITY & RESOLUTION: Render at ultra-high 4K resolution with hyper-fine textures and studio master photographic clarity."
          : safeParams.quality === "2K"
          ? "IMAGE QUALITY & RESOLUTION: Render at high-definition 2K resolution with crisp details."
          : "IMAGE QUALITY & RESOLUTION: Render at standard clean 1K resolution.";

        const prompt = `A professional, ultra-high-resolution interior design photograph.

${viewTypeSpecificPrompt}

${roomStylePrompt}

THE LAMP TO INTEGRATE (IMAGE 2):
Style: ${lampAnalysis.style}
Structure details: ${lampAnalysis.structure || "N/A"}
Materials: ${lampMaterialsStr}
Color: ${lampAnalysis.color}
Light Type: ${lampAnalysis.lightType}
Light Warmth: ${lampAnalysis.lightWarmth}

${lightPrompt}

HIGHEST PRIORITY CONSTRAINTS (MUST BE STRICTLY FOLLOWED):
0. STRICT SINGLE LAMP MANDATE (绝对唯一落地灯规则 - 严禁出现双杆或两盏灯):
   - The scene MUST contain EXACTLY ONE single floor lamp (replicated 1:1 from IMAGE 2).
   - STRICTLY FORBIDDEN: DO NOT render two floor lamps, DO NOT generate double poles, extra arc branches, or floating secondary lamp stands!

1. CRITICAL DUAL VISUAL FIDELITY (100%忠实还原原图):
   - IF ROOM IMAGE (IMAGE 1) IS PROVIDED: Preserve the exact walls, curtains, and sofa/bed from IMAGE 1.
   - LAMP (IMAGE 2): Replicate the floor lamp in IMAGE 2 with exact 1:1 visual fidelity across lampshade geometry, pole curvature/shape, and color.
   - If IMAGE 2 shows a single straight vertical rod, DO NOT bend it and DO NOT add side branches!
   - If IMAGE 2 shows a single arched rod, render a single smooth arched rod with NO extra elbows or joints!

2. NO UNREQUESTED OR HALLUCINATED LAMP PARTS:
   - Reproduce ONLY the exact physical parts visible in IMAGE 2.
   - ABSOLUTE PROHIBITION OF HALLUCINATED PULL-CHAINS: If IMAGE 2 has no pull-chain cord, DO NOT add any pull-chain cord!

3. CAMERA & COMPOSITION RULES:
   - ${viewTypeSpecificPrompt}

${qualityPrompt}

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
