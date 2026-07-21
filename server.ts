import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    // 1. If it's already a data URI (base64)
    if (url.startsWith("data:image/")) {
      const split = url.split(",");
      const mimeType = url.split(";")[0].split(":")[1] || "image/jpeg";
      return { data: split[1], mimeType };
    }

    // 2. Resolve local file paths if it's a relative path or points to the localhost domain
    let cleanPath = url;
    if (url.startsWith("http")) {
      try {
        const parsedUrl = new URL(url);
        cleanPath = parsedUrl.pathname;
      } catch (e) {
        // Fallback to fetching directly if URL parsing fails
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

    // 3. Remote URL fetching
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

  // Crucial: increase json body size limit for large base64 images
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Initialize Gemini client lazily
  let ai: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!ai) {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
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

  // API endpoints
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

      // Forward headers
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

  app.post("/api/chat-intent", async (req, res) => {
    try {
      const { text, currentRoomId, currentLampId, currentParams } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Missing text" });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "GEMINI_API_KEY 或 API_KEY 环境变量未配置。请前往 Settings (设置) 菜单添加名为 GEMINI_API_KEY 的密钥，值填写您的 Gemini API Key。" 
        });
      }

      const client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

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

  app.post("/api/gemini", async (req, res) => {
    try {
      const { model, payload } = req.body;
      if (!payload || !payload.task) {
        return res.status(400).json({ error: "Missing payload or task type" });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "GEMINI_API_KEY 或 API_KEY 环境变量未配置。请在 Settings（设置）中添加名为 GEMINI_API_KEY 的密钥。" 
        });
      }

      const client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

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
  "style": "Overall interior design style (e.g., Modern Minimalist, Nordic Cozy, Industrial Loft, Creamy, Mid-Century Modern)",
  "layout": "Room layout description (e.g., Spacious living room with an L-shaped sofa, Cozy bedroom corner)",
  "furniture": ["List of major furniture pieces detected, e.g., sofa, coffee table, plant"],
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

        const parsed = JSON.parse(text);
        return res.json(parsed);

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
  "cozyIndex": 8, // A cozy index score from 1 to 10
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

        const parsed = JSON.parse(text);
        return res.json(parsed);

      } else if (payload.task === "generate-scene") {
        const { roomAnalysis, lampAnalysis, params, roomImage, lampImage } = payload;
        if (!roomAnalysis || !lampAnalysis) {
          return res.status(400).json({ error: "Missing required parameters for scene generation" });
        }

        // Add explicit console logging to verify received parameters match UI selection
        console.log(`[SERVER_API] Received task: generate-scene. Camera View Selected in UI: ${params?.viewType}. Full params received:`, JSON.stringify(params));

        const parts: any[] = [];

        // ALWAYS add the room image as a visual context if provided, so that Gemini knows the exact room layout and structure to preserve!
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

        // Detailed prompt and structure preservation guidance based on selected viewType to resolve the layout-contradiction
        let preservationGuidance = "";
        let perspectiveGuidance = "";

        if (params.viewType === "far") {
          preservationGuidance = "2. UNIFIED ROOM DESIGN CENTERED ON THE FLOOR LAMP (FAR VIEW / 全景以落地灯为核心): The generated room MUST maintain the style, layout, color palette, textures, and atmosphere of the Reference Room Image. However, the camera shooting angle, perspective, or position is highly flexible. It does NOT have to match the uploaded reference room's camera perspective. Adjust, tilt, or rotate the camera to find the absolute best composition where the floor lamp stands tall, prominent, and is the absolute core, central focal point (视觉中心与核心主角) of the entire room, illuminating its surrounding environment. The camera should frame the scene so that the lamp is highly detailed and dominates the visual attention, surrounded by the bed or sofa as cozy contextual elements.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (FAR VIEW / 全景/远景): This is a wide-angle spacious shot showcasing the lamp integrated into the room design, BUT the floor lamp MUST be the absolute central visual core (核心/主角) of the composition, just like the provided reference photo. Position the camera at a beautiful, professional interior design shooting angle (not necessarily the same as the reference room's shooting angle) to showcase the lamp's full-length design elegantly, standing tall as the master hero element in the room's wider context, casting a gorgeous volumetric glow and washing surrounding furniture with cozy light.";
        } else if (params.viewType === "mid") {
          preservationGuidance = "2. ZOOMED-IN COZY MID SHOT CENTERED ON THE LAMP (中景再次拉近距离): This is a classic close-up mid shot. The camera zooms in closer compared to the far view, framing the floor lamp as the absolute vertical focal point (occupying 70-80% of the vertical frame height). The shooting angle does not need to match the reference images; instead, adjust the camera position (e.g., shoot from a beautiful 3/4 side angle, front angle, or elegant perspective) to showcase the lamp's body, built-in details, and its interaction with the adjacent furniture (such as a sofa side or nightstand) in the most visually stunning way. The style and materials of adjacent elements must match the reference room.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (MID VIEW / 中景/中近景): The camera is placed closer (1.5 to 2.5 meters away), framing the floor lamp as the primary subject. Showcase the detailed design of the lamp body, shade, and any intermediate details. Customize the camera's perspective and height to achieve the most beautiful cinematic angle for the lamp, casting warm light on the cropped section of the couch, bed, or side table.";
        } else if (params.viewType === "close") {
          preservationGuidance = "2. EXTREMELY TIGHT CLOSE-UP ON THE LAMP AS PRIMARY SUBJECT (近景以落地灯为最主要的主体): The generated image is a high-end close-up detail shot focusing strictly and heavily on the floor lamp (especially the lampshade and upper pole structure) as the absolute primary subject. You have absolute freedom in selecting the camera angle and height (e.g., shooting slightly upwards, downwards, or from an ultra-close-up angle) to capture the absolute best, most delicate, and artistic view. The focus is entirely on the exquisite texture of the lampshade, the metal poles, and the warm, gentle light bloom, with surrounding textures (such as a nearby fabric or table surface) softly blurred or cropped in matching style.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (CLOSE VIEW / 近景/特写): This is an extreme close-up detail shot where the floor lamp is the absolute main subject (最主要的主体). Showcase the detailed design of the shade, the beautiful vertical fabric pleats, the pull chain, and the delicate material finish. Position the camera at the most perfect artistic shooting angle to capture the soft, local pool of light and material elegance.";
        }
        
        // Detailed style specifications for Virtual Rooms to ensure architectural and aesthetic fidelity
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
          : `CRITICAL ROOM STYLE MATCHING: You MUST preserve the exact interior design style provided in the reference room image (e.g., Wabi-Sabi, Modern Cream, Minimalist, etc.). Do NOT invent a different room style! The generated room MUST feel like the exact same space as the reference image, just with the lamp added.
The room style and context MUST match:
- Style: ${roomAnalysis.style}
- Layout: ${roomAnalysis.layout}
- Furniture: ${roomAnalysis.furniture.join(", ")}
- Colors: ${roomAnalysis.colors.join(", ")}`;

        const prompt = `A professional, beautiful, and ultra-high-resolution interior design photograph.
Your task is to generate a beautiful, normal, and perfectly balanced room that integrates the provided floor lamp into it.

${roomStylePrompt}

The floor lamp style, color, and materials MUST perfectly match the reference lamp image:
- Style: ${lampAnalysis.style}
- Materials & Finish: ${lampAnalysis.materials.join(", ")} in ${lampAnalysis.color}
- Lighting: ${params.lightState === "on" 
  ? `CRITICAL (LIGHT IS ON): The floor lamp is TURNED ON. Emitted light MUST be rendered with maximum physical realism as follows:
    1. VOLUMETRIC GLOW & BLOOM: The lampshade must glow with high luminescent intensity, creating a realistic warm light bloom and subtle atmospheric halo around the shade. The light source within must look active and bright.
    2. DIRECT & INDIRECT WALL WASHING: The lamp must project a strong, beautiful, realistic cone of light (光锥) or diffuse wash onto the adjacent wall, floor, and ceiling according to its lighting type (${lampAnalysis.lightType || "ambient diffuse light"}). The light pool on the wall must have a smooth, natural gradient falloff.
    3. LOCALIZED GLOBAL ILLUMINATION: The emitted light (${lampAnalysis.lightWarmth || "3000开尔文暖黄光"}) must dynamically illuminate surrounding surfaces. Fabric sofas, leather chairs, wooden floors, and pillows adjacent to the lamp must show natural warm highlights, enhanced texture relief, and soft specular reflections from the light.
    4. ACCURATE CAST SHADOWS: The lamp base must ground naturally on the floor with soft ambient occlusion shadows. Furniture pieces closest to the lamp must cast subtle, soft-edged contact shadows in the direction away from the lamp, blending seamlessly with the room's ambient illumination.
    5. COHESIVE LIGHTING STYLE: The warm illumination from the lamp must blend smoothly and harmoniously with the room's cozy ambient lighting. The entire scene must use a unified, natural, and comfortable color temperature without any strange, extreme contrast between cold blue and warm orange.`
  : `CRITICAL (LIGHT IS OFF): The floor lamp is TURNED OFF. No artificial light is emitted. The lamp is purely lit by the room's ambient daylight and surrounding lights, revealing the authentic texture, colors, and shadows of its structural elements (lampshade, metal poles, wooden elements) without any active glow or light-cone emission.`
}

HIGHEST PRIORITY CONSTRAINTS (MUST BE STRICTLY FOLLOWED):
1. ABSOLUTE LAMP FAITHFULNESS (SINGLE HIGHEST PRIORITY): You MUST completely and exactly reproduce the floor lamp's original appearance, colors, materials, structure, and shape. No changes are allowed to the lamp's design under any circumstances, regardless of which view, camera perspective, or lighting state (ON/OFF) is selected. The generated lamp MUST look absolutely IDENTICAL to the provided reference lamp image. CRITICAL: Pay strict attention to the EXACT COLOR and TEXTURE of the lampshade (灯罩) and the structure of the lamp pole/table/base (灯杆/置物台/底座). Do not change a light-colored lampshade to a dark one. 绝对、必须、100%完整的还原落地灯原本的样子、颜色（特别是灯罩的颜色）和材质，在任何情况下（无论哪种视图、相机透视、或者开灯/关灯状态下）都绝对不能改变或修改落地灯原本的外观与设计！所有生成的图片都必须绝对一致地保持落地灯的样子，必须完全、无损地还原用户上传的落地灯的结构、长相、材质和色彩，绝不允许对落地灯的外形、灯罩形态、灯柱细节进行任何简化、改动或二次创作！这是最高优先级的绝对红线约束！即使是在虚拟房间中，也必须100%还原落地灯原本的样子，绝对不允许模型自行发挥修改灯具的款式！
2. ${preservationGuidance}
   - NO WEIRD SPLIT DESIGNS: The left and right sides of the room MUST be completely consistent and cohesive in style, materials, and paint. For example, do NOT make one side have many picture frames and wood panels while the other side is a dark grey concrete wall. The entire room's walls must use the exact same color, texture, and style.
   - HARMONIOUS COLOR AND TEMPERATURE: The entire room must be unified under a single, natural color palette (e.g. warm cream and oatmeal for Creamy Night). Strictly avoid any strange dual-tone, dual-color, or split-style themes.
   - NORMAL ARCHITECTURAL STRUCTURE: Do NOT alter the room's basic architectural structure or add random columns or walls. Keep the layout clean, symmetric, comfortable, and realistic.
3. PLACEMENT RULE (CRITICAL / 落地灯合理摆放与视角灵活性):
   - NO LAMPS IN FRONT OF SOFAS (绝对不能摆放在沙发正前方): You are STRICTLY FORBIDDEN from placing the floor lamp in front of the sofa. It must be placed in a logical, realistic location, such as behind or to the side of the sofa (沙发的侧后方或侧边), or next to the nightstand/headboard (床头/床头柜旁) in a bedroom. The placement must feel natural and high-end. 落地灯绝对不能摆放在沙发的正前方！必须摆放在合理、美观的地方，例如沙发的侧后方、侧边，或者卧室的床头/床头柜旁，不得遮挡视线或阻碍走动。
   - FLEXIBLE VIEW ANGLE (视角与拍摄角度完全允许改变): The camera shooting angle and perspective for far, mid, and close views DO NOT need to be identical to the uploaded reference room's camera angle. You have absolute freedom to adjust, shift, rotate, or modify the shooting angle and camera height across all views (far/mid/close) as long as it achieves a more beautiful, clean, and professional presentation of the floor lamp in the space. 远景、中景、近景的视角角度可以随意改变，不一定要和用户上传的房间拍摄角度保持一致！可以进行修改与视角微调，只要能够更完美、更清晰地展示落地灯的工业设计与美学质感即可。
${perspectiveGuidance}`;

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

  // API endpoints
  app.post("/api/analyze-room", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing room image data" });
      }

      const client = getGeminiClient();
      
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
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
  "style": "Overall interior design style (e.g., Modern Minimalist, Nordic Cozy, Industrial Loft, Creamy, Mid-Century Modern)",
  "layout": "Room layout description (e.g., Spacious living room with an L-shaped sofa, Cozy bedroom corner)",
  "furniture": ["List of major furniture pieces detected, e.g., sofa, coffee table, plant"],
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

      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error("Error analyzing room:", error);
      res.status(500).json({ error: error.message || "Failed to analyze room" });
    }
  });

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
Return only the raw JSON. Do not wrap it in markdown code blocks like \`\`\`json.`
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

  app.post("/api/analyze-lamp", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing lamp image data" });
      }

      const client = getGeminiClient();

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
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
  "cozyIndex": 8, // A cozy index score from 1 to 10
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

      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error("Error analyzing lamp:", error);
      res.status(500).json({ error: error.message || "Failed to analyze lamp" });
    }
  });

  app.post("/api/generate-scene", async (req, res) => {
    try {
      const { roomAnalysis, lampAnalysis, params, roomImage, lampImage } = req.body;
      if (!roomAnalysis || !lampAnalysis) {
        return res.status(400).json({ error: "Missing required parameters for scene generation" });
      }

      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "API_KEY 环境变量未配置。请前往 Settings（设置）菜单中添加名为 API_KEY 的密钥，值填写您的 Gemini 智能 API Key。" 
        });
      }

      const client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const parts: any[] = [];

      // Add room image as a visual context if provided
      if (roomImage) {
        if (roomImage.startsWith("http")) {
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
        } else if (roomImage.includes("base64,")) {
          const split = roomImage.split(",");
          const mime = roomImage.split(";")[0].split(":")[1] || "image/jpeg";
          parts.push({
            inlineData: {
              data: split[1],
              mimeType: mime,
            }
          });
        }
      }

      // Add lamp image as a visual context if provided
      if (lampImage) {
        if (lampImage.startsWith("http")) {
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
        } else if (lampImage.includes("base64,")) {
          const split = lampImage.split(",");
          const mime = lampImage.split(";")[0].split(":")[1] || "image/png";
          parts.push({
            inlineData: {
              data: split[1],
              mimeType: mime,
            }
          });
        }
      }

      // Detailed prompt for image editing/blending
      let perspectiveGuidance = "";
      if (params.viewType === "far") {
        perspectiveGuidance = "4. VIEW AND PERSPECTIVE (FAR VIEW): MUST show a wide-angle, full-shot (远景) perspective displaying the entire room layout and the integrated floor lamp in the context of the whole space. CRITICAL: Follow the PLACEMENT RULE strictly. Even in a far view, if it's a bedroom, the lamp MUST be near the head of the bed (床头), NOT the foot (床尾). Showcase the realistic effect of the lamp integrated into the room.";
      } else if (params.viewType === "mid") {
        perspectiveGuidance = "4. VIEW AND PERSPECTIVE (MID VIEW): MUST show a medium close-up (中近景) perspective focused on the key furniture (such as the sofa/bedside corner) and the integrated floor lamp. CRITICAL: Follow the PLACEMENT RULE strictly. If it's a bedroom, the lamp MUST be near the head of the bed (床头).";
      } else if (params.viewType === "close") {
        perspectiveGuidance = "4. VIEW AND PERSPECTIVE (CLOSE VIEW): MUST show an intimate, tight close-up (特写) perspective focusing on the floor lamp in the room. CRITICAL: While the camera angle CAN VARY to show the best perspective, you MUST NOT change the room's original furniture layout. The placement of the lamp must be reasonable and logical within the existing layout (e.g. next to a sofa or bed). 即使是近景（特写）也绝对不能随便更改屋内的家具布局，只能改变摄像机视角！并且落地灯摆放的位置必须合理，要符合真实居家环境的逻辑。Keep the background fully sharp and without bokeh.";
      }
      
      const prompt = `A professional, ultra-high-resolution interior design photograph.
Your task is to generate a new room based on the analysis and embed the provided floor lamp into it.

The room style and context MUST match:
- Style: ${roomAnalysis.style}
- Layout: ${roomAnalysis.layout}
- Furniture: ${roomAnalysis.furniture.join(", ")}
- Colors: ${roomAnalysis.colors.join(", ")}

The floor lamp style, color, and materials MUST perfectly match the reference lamp image:
- Style: ${lampAnalysis.style}
- Materials & Finish: ${lampAnalysis.materials.join(", ")} in ${lampAnalysis.color}
- Lighting: ${params.lightState === "on" 
  ? `CRITICAL (LIGHT IS ON): The floor lamp is TURNED ON. Emitted light MUST be rendered with maximum physical realism as follows:
    1. VOLUMETRIC GLOW & BLOOM: The lampshade must glow with high luminescent intensity, creating a realistic warm light bloom and subtle atmospheric halo around the shade. The light source within must look active and bright.
    2. DIRECT & INDIRECT WALL WASHING: The lamp must project a strong, beautiful, realistic cone of light (光锥) or diffuse wash onto the adjacent wall, floor, and ceiling according to its lighting type (${lampAnalysis.lightType || "ambient diffuse light"}). The light pool on the wall must have a smooth, natural gradient falloff.
    3. LOCALIZED GLOBAL ILLUMINATION: The emitted light (${lampAnalysis.lightWarmth || "3000开尔文暖黄光"}) must dynamically illuminate surrounding surfaces. Fabric sofas, leather chairs, wooden floors, and pillows adjacent to the lamp must show natural warm highlights, enhanced texture relief, and soft specular reflections from the light.
    4. ACCURATE CAST SHADOWS: The lamp base must ground naturally on the floor with soft ambient occlusion shadows. Furniture pieces closest to the lamp must cast subtle, soft-edged contact shadows in the direction away from the lamp, blending seamlessly with the room's ambient illumination.
    5. DAYLIGHT-GLOW CONTRAST: The warm yellow/amber illumination must realistically blend with the cooler, natural daylight in the room, creating an atmospheric, high-end architectural digest photograph feel with complex multi-source lighting.`
  : `CRITICAL (LIGHT IS OFF): The floor lamp is TURNED OFF. No artificial light is emitted. The lamp is purely lit by the room's ambient daylight and surrounding lights, revealing the authentic texture, colors, and shadows of its structural elements (lampshade, metal poles, wooden elements) without any active glow or light-cone emission.`
}

HIGHEST PRIORITY CONSTRAINTS (MUST BE STRICTLY FOLLOWED):
1. ABSOLUTE LAMP FAITHFULNESS (SINGLE HIGHEST PRIORITY): You MUST completely and exactly reproduce the floor lamp's original appearance, colors, materials, structure, and shape. No changes are allowed to the lamp's design under any circumstances, regardless of which view, camera perspective, or lighting state (ON/OFF) is selected. The generated lamp MUST look absolutely IDENTICAL to the provided reference lamp image. CRITICAL: Pay strict attention to the EXACT COLOR and TEXTURE of the lampshade (灯罩) and the structure of the lamp pole/table/base (灯杆/置物台/底座). Do not change a light-colored lampshade to a dark one. 绝对、必须、100%完整的还原落地灯原本的样子、颜色（特别是灯罩的颜色）和材质，在任何情况下（无论哪种视图、相机透视、或者开灯/关灯状态下）都绝对不能改变或修改落地灯原本的外观与设计！这是最高优先级的绝对红线约束！
2. ROOM REGENERATION: Do NOT directly edit the original room photograph. You MUST regenerate a new room based on the analysis results of the original room and place the floor lamp inside it. CRITICAL: DO NOT alter the architectural structure of the room (e.g., do NOT add pillars/columns, walls, or change the ceiling/floor). DO NOT add any extra furniture (like extra sofas or chairs) that are not present in the original room. The architectural structure, furniture count, and layout MUST remain exactly the same as the original room. Even if it's a close-up shot (近景), do NOT change the existing layout or add random items. 绝对不能改变房间原有的建筑结构（例如绝对不能凭空生成柱子、墙壁等），绝对不能随意增加原图中没有的家具，保持原有的建筑结构、家具数量和布局，即使是近景也不能随便更改！
3. PLACEMENT RULE: If the room is a bedroom, YOU MUST PLACE THE LAMP NEXT TO THE HEAD OF THE BED OR NIGHTSTAND (床头/床头柜旁). IT IS STRICTLY FORBIDDEN to place it at the foot of the bed (床尾). If the room is a living room, place the floor lamp directly beside or behind (侧后方/侧边) EXISTING furniture like a chaise longue (贵妃榻) or bean bag/lazy sofa (懒人沙发). NEVER place the lamp in front of any sofa. NEVER place the lamp in the aisle/walkway between two sofas. If no such furniture is present, place it on the side-rear (侧后方) or side (侧边) of the main sofa closer to the balcony or window. The placement must be logical and physically realistic. 如果是在卧室，必须、一定、绝对要摆放在床头或床头柜旁边！绝对不能摆放在床尾！绝对不能摆放在房间中间的过道上！如果是客厅，绝对不能将落地灯摆放在沙发的正前方遮挡视线或影响使用，可以摆放在沙发的侧后方或侧边（参考真实居家环境）。
${perspectiveGuidance}`;

      parts.push({ text: prompt });

      // Call Gemini 3.1 Flash Lite Image model
      const response = await client.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
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

      res.json({ image: `data:image/png;base64,${base64Image}` });
    } catch (error: any) {
      console.error("Error generating scene:", error);
      res.status(500).json({ error: error.message || "Failed to generate integrated scene" });
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
