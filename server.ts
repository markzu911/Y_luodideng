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

    const localPath = path.join(process.cwd(), cleanPath);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
      const base64 = buffer.toString("base64");
      return { data: base64, mimeType };
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image from URL: ${url}`);
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
              text: `You are an expert product and lighting designer. Analyze this floor lamp image. VERY IMPORTANT: You MUST reply in Chinese (简体中文) for all string values.
You must return the analysis in a clean JSON format matching this exact schema:
{
  "style": "The design style of this floor lamp (e.g., Nordic Minimalist, Bauhaus Arc, Mid-Century Modern, Industrial Globe, Paper Lantern)",
  "materials": ["Materials used, e.g., Matte Black Metal, Brushed Brass, Rice Paper, Marble base"],
  "color": "Color of the lamp structure and shade. VERY IMPORTANT: BE SPECIFIC ABOUT THE LAMPSHADE COLOR (e.g., Cream White lampshade with Walnut wood table base, Solid Black metal structure)",
  "lightType": "The type of lighting it provides (e.g., Arc direct reading light, Ambient diffuse light, Upward indirect lighting)",
  "lightWarmth": "Default or recommended light warmth (e.g., Warm Warmth (2700K), Neutral White (4000K))",
  "cozyIndex": 8,
  "placementTip": "A professional tip on how to position and combine this lamp in a residential space (e.g., Angle the arc shade directly over your reading seat; place the marble base behind the sofa back to save space)"
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
              required: ["style", "materials", "color", "lightType", "lightWarmth", "cozyIndex", "placementTip"]
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
          parts.push({ text: "Reference Room Image (This is the room environment to place the lamp into):" });
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

        const isVirtualRoom = roomImage && roomImage.includes("/assets/");

        // Add lamp image as a visual context if provided
        if (lampImage) {
          parts.push({ text: "Reference Floor Lamp Image (You MUST place THIS exact lamp into the room):" });
          if (lampImage.startsWith("http") || lampImage.startsWith("data:") || lampImage.includes("/assets/")) {
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
        }

        // Detailed prompt and structure preservation guidance based on selected viewType
        let preservationGuidance = "";
        let perspectiveGuidance = "";

        if (params.viewType === "far") {
          preservationGuidance = "2. LOCALIZED CORNER SHOT (远景/局部全高景): Frame the full height of the floor lamp from base to lampshade in its cozy corner alongside the adjacent nightstand or sofa arm. CRITICAL: STRICTLY DO NOT SHOW THE ENTIRE ROOM! You must CROP tightly to only the single localized corner where the floor lamp stands. NEVER generate a wide panoramic shot of the whole bedroom or living room.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (FAR VIEW / 远景/局部角落景): Show the full height of the floor lamp within its immediate corner setting. The camera MUST focus and crop tightly on this corner alone. DO NOT pull back to show the entire room.";
        } else if (params.viewType === "mid") {
          preservationGuidance = "2. ZOOMED-IN COZY MID SHOT (中景/中近景): Medium close-up shot focusing directly on the floor lamp body, its shelf/side-table, and the immediate bedside nightstand or sofa corner. The background room is tightly cropped out.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (MID VIEW / 中景/中近景): The camera is closer (1 to 2 meters away), framing the floor lamp as the primary hero subject. Showcase the detailed design of the lamp body, shade, and middle shelf alongside a cropped piece of furniture.";
        } else if (params.viewType === "close") {
          preservationGuidance = "2. EXTREMELY TIGHT CLOSE-UP (近景/特写): High-end close-up detail shot focusing strictly on the lampshade, upper pole, and soft light bloom. The background furniture is softly blurred or cropped out.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (CLOSE VIEW / 近景/特写): Extreme close-up detail shot where the lampshade and light source dominate the frame, capturing the soft light pool and material texture.";
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

        const roomStylePrompt = isVirtualRoom
          ? `CRITICAL ROOM STYLE MATCHING: You MUST strictly generate the room according to the textual design specifications below to perfectly capture the essence of "${roomAnalysis.style}". 必须严格按照以下【设计规范】和【文字描述】生成极致完美的【${roomAnalysis.style}】风格样板间，完全符合对应的颜色、家具和布局设定，切记不要偏离指定的风格！
  
DESIGN SPECIFICATION FOR THIS STYLE:
${STYLE_SPECS[roomAnalysis.style] || "Generate a professional, high-end interior matching the requested style."}
  
The room style and context MUST match:
- Style: ${roomAnalysis.style}
- Layout: ${roomAnalysis.layout}
- Furniture: ${roomAnalysis.furniture.join(", ")}
- Colors: ${roomAnalysis.colors.join(", ")}`
          : `CRITICAL ROOM STYLE MATCHING: You MUST preserve the exact style and structural integrity of the uploaded room background. Under no circumstances should you generate a completely different style of walls, floors, or furniture. The generated scene MUST feel like a natural extension and high-fidelity placement of the lamp within the real uploaded room context.`;

        const lightPrompt = params.lightState === "on"
          ? `CRITICAL (LIGHT IS ON): Warm, soft, high-fidelity light glows from the light source of the lamp. You MUST generate realistic volumetric light cones, ambient lighting casting on the nearby furniture and floor, and highlight shadows with rich glow effects. The warm light from the floor lamp (approx 3000K-3500K) must blend harmoniously with the room's cozy ambient lighting. The entire scene must use a unified, natural, and comfortable color temperature without any strange, extreme contrast between cold blue and warm orange.`
          : `CRITICAL (LIGHT IS OFF): The floor lamp is TURNED OFF. No artificial light is emitted. The lamp is purely lit by the room's ambient daylight and surrounding lights, revealing the authentic texture, colors, and shadows of its structural elements (lampshade, metal poles, wooden elements) without any active glow or light-cone emission.`;

        const humanGuidance = params.needModel 
          ? "5. PERSONA / HUMAN PRESENCE: You MUST include a realistic human model (e.g., a person reading, relaxing, or enjoying the space) to enhance the living atmosphere. The human figure should seamlessly blend into the scene and interact naturally with the lighting and environment. 认知说明：必须要包含一个真实的人物模型（比如正在阅读或休息的人）。" 
          : "5. PERSONA / HUMAN PRESENCE: DO NOT include any human figures or models in the scene. Provide a pure architectural and furniture visualization. 绝对不要在画面中出现任何人物模型。";

        const prompt = `A professional, ultra-high-resolution interior design photograph.
Your task is to generate a new room based on the analysis and embed the provided floor lamp into it.

${roomStylePrompt}

THE LAMP TO INTEGRATE:
Style: ${lampAnalysis.style}
Materials: ${lampAnalysis.materials.join(", ")}
Color: ${lampAnalysis.color}
Light Type: ${lampAnalysis.lightType}
Light Warmth: ${lampAnalysis.lightWarmth}

${lightPrompt}

HIGHEST PRIORITY CONSTRAINTS (MUST BE STRICTLY FOLLOWED):
1. ABSOLUTE LAMP FAITHFULNESS & HERO STATUS (SINGLE HIGHEST PRIORITY - 100% 还原落地灯与绝对主角地位): You MUST completely and exactly reproduce the floor lamp's original appearance, colors, materials, structure, and shape. No changes are allowed to the lamp's design under any circumstances, regardless of which view, camera perspective, or lighting state (ON/OFF) is selected. The generated lamp MUST look absolutely IDENTICAL to the provided reference lamp image. CRITICAL: Pay strict attention to the EXACT COLOR and TEXTURE of the lampshade (灯罩) and the structure of the lamp pole/table/base (灯杆/置物台/底座). Do not change a light-colored lampshade to a dark one. The floor lamp MUST be the absolute, undisputed main subject of the image (绝对唯一的视觉中心与画面的绝对主角). 绝对、必须、100%完整的还原落地灯原本的样子、颜色（特别是灯罩的颜色）和材质！在任何情况下，落地灯都必须作为绝对的主体与核心主角！

2. STRICTLY DO NOT SHOW FULL ROOM (严禁展示完整/全景房间，只能展示局部角落):
   - You are STRICTLY FORBIDDEN from generating a wide-angle full-room shot (严禁生成能看到整间卧室、整张床、大窗口、整排柜子的广角全景图).
   - You MUST crop the photograph tightly so it shows ONLY A SINGLE LOCALIZED CORNER or nook of the room (e.g., just the nightstand corner beside the bed, or just one end of the sofa with the curtains/wall).
   - Keep the surrounding corner elements (wall, curtains, nightstand or sofa arm) cohesive, clean, and matching the specified interior design style.

3. AUTHENTIC & REALISTIC LAMP PLACEMENT (落地灯必须真实合理地摆放，严禁随便乱摆):
   - The floor lamp MUST be placed in a 100% natural, realistic, functional indoor position:
     * In a bedroom: Place the floor lamp directly beside the headboard / nightstand (床头或床头柜旁).
     * In a living room: Place the floor lamp in the sofa corner, behind or to the side of the sofa (沙发角/沙发侧后方), or next to an armchair/reading chair.
   - STRICTLY FORBIDDEN: NEVER place the floor lamp floating in the open middle of the room floor, in walkways, or in front of a sofa or bed.
   - DO NOT move the physical position of the lamp to an unnatural spot in the room just to center it! The lamp MUST stay in its authentic, practical corner spot.

4. CAMERA CENTERING THROUGH FRAMING (依靠摄影镜头对焦取景居中，而不是移动灯的位置):
   - To make the floor lamp the primary visual focus in the photograph, the CAMERA MUST FRAME AND CROP DIRECTLY AROUND THE CORNER WHERE THE LAMP STANDS.
   - The camera angle should aim at the floor lamp in its cozy corner, making the lamp sit comfortably near the center of the photo frame.

${perspectiveGuidance}

${humanGuidance}`;

        parts.push({ text: prompt });

        const response = await client.models.generateContent({
          model: model || "gemini-3.1-flash-lite-image",
          contents: {
            parts: parts,
          },
          config: {
            imageConfig: {
              aspectRatio: params.ratio || "4:3",
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
