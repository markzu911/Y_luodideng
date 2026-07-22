import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image from URL: ${url}`);
    const arrayBuf = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(arrayBuf).toString("base64");
    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error("Error fetching image URL:", error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse URL pathname
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Handle /api/tool/* and /api/upload/* proxy
  if (pathname.startsWith('/api/tool/') || pathname.startsWith('/api/upload/')) {
    const targetUrl = `http://aibigtree.com${req.url || pathname}`;
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
        // req.body can be object/JSON for Vercel functions as Vercel pre-parses it if Content-Type is json
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
  }

  // Handle POST /api/gemini
  if (pathname === '/api/gemini') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
      const { model, payload } = req.body || {};
      if (!payload || !payload.task) {
        return res.status(400).json({ error: "Missing payload or task type" });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY 或 API_KEY 环境变量未配置。请在 Vercel 环境变量中配置 GEMINI_API_KEY。"
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
  "furniture": ["List of major furniture pieces detected with their relative sizes/proportions, e.g., large 3-seater sofa, queen-size double bed, small round coffee table, tall indoor plant"],
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
              text: `You are an expert product and lighting designer. Perform a 100% EXHAUSTIVE, NON-OMISSIVE, HIGH-PRECISION analysis of this floor lamp image.
VERY IMPORTANT: You MUST reply in Chinese (简体中文) for all string values.

CRITICAL INSTRUCTIONS FOR FULL COMPONENT ANALYSIS (全部件无遗漏全面细节深度解析):
You MUST inspect and describe EVERY SINGLE physical component of the lamp in detail. Do NOT omit anything:
1. Base (底座): Material, shape (round disc/square block/marble slab/integrated bedside table), finish, and stability features.
2. Pole/Stand & Joints (撑杆与结构件): Pole shape (straight vertical / curved arc / swan-neck / tripod), material, color, height joints, and any mechanical features. EXPLICITLY state if there are NO horizontal swing arms, NO side branches, or NO extra brackets!
3. Built-in Tray/Shelf (置物台/茶几盘): Does a built-in tray or drawer exist on the pole? Describe its shape (round/square wood tray), height position, drawer count, and material. If NO tray exists, explicitly state "无置物茶几盘".
4. Shade & Light Head (灯罩/灯头): Lampshade shape (pleated cone / scalloped dome / glass globe / drum / paper lantern), fabric/glass material, pleat pattern, rim color, and light diffusion direction.
5. Switches & Controls (开关与细节): Note switch mechanisms (e.g., hanging brass pull-chain switch below the shade, foot pedal switch, turn knob) if visible.

You must return the analysis in a clean JSON format matching this exact schema:
{
  "style": "Overall design style (e.g., 现代法式百褶复古风, 北欧极简原木风, 包豪斯黄铜弧形风)",
  "structure": "Exhaustive component-by-component breakdown (e.g., 包含: 暖白色百褶布艺灯罩、直立式哑光黑色金属杆、悬挂式黄铜拉线开关、中部固定圆形胡桃木置物茶几盘、底部圆形黑色平整底座。严禁增加任何摇臂或侧向延伸杆。)",
  "materials": ["Exhaustive list of all materials used in base, pole, tray, shade, and switch"],
  "color": "Exact color breakdown for each individual component (e.g., 暖白布艺灯罩、哑光黑灯杆、胡桃木色茶几盘、黑色金属底座)",
  "lightType": "Lighting classification (e.g., 360°柔和漫反射环境光、下照式舒适阅读光)",
  "lightWarmth": "Light warmth recommendation (e.g., 2700K-3000K 温馨暖光)",
  "cozyIndex": 9,
  "placementTip": "A professional tip on how to position and style this lamp in a room"
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

        const parsed = JSON.parse(text);
        return res.json(parsed);

      } else if (payload.task === "generate-scene") {
        const { roomAnalysis, lampAnalysis, params, roomImage, lampImage } = payload;
        if (!roomAnalysis || !lampAnalysis) {
          return res.status(400).json({ error: "Missing required parameters for scene generation" });
        }

        const parts: any[] = [];

        // Add room image as context
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

        // Add lamp image as context
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

        // Detailed prompt
        let viewTypeSpecificPrompt = "";

        if (hasRoomImage) {
          // WHEN USER UPLOADED A ROOM IMAGE (IMAGE 1):
          if (params.viewType === "close") {
            viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: CLOSE VIEW (近景/特写视角 - 必须100%基于用户上传的IMAGE 1房间背景进行特写取景):
- CAMERA CROP & ZOOM: Macro close-up detail shot focusing directly on the glowing lampshade and upper stem/pole of the floor lamp (IMAGE 2).
- BACKGROUND MUST BE IMAGE 1: The background behind the lamp pole and shade MUST show the exact wall texture, dark wood paneling, marble wall, or vertical window blinds directly from IMAGE 1.
- ABSOLUTE PROHIBITION OF NEW FURNITURE: DO NOT add any new side cabinets, nightstands, tabletop lamps, or decor that DO NOT exist in IMAGE 1! If the lamp in IMAGE 1 is next to the sofa edge or marble wall, show that exact sofa fabric edge or marble wall from IMAGE 1 in the close-up background.`;
          } else if (params.viewType === "mid") {
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
          if (params.viewType === "close") {
            viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: CLOSE VIEW (近景/特写视角 - 100%微距特写):
- CAMERA CROP & ZOOM: Macro detail shot focusing on the illuminated lampshade and upper stem/pole.
- BACKGROUND: Background shows warm wall texture or side table decor in soft glow.
- PROHIBITION: Do NOT show ceiling, floor, or full living room layout.`;
          } else if (params.viewType === "mid") {
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
          : (params.viewType === "close"
              ? `ROOM STYLE CONTEXT: Match the wall colors, textures, and ambient materials of "${roomAnalysis.style}" for the background wall.`
              : `CRITICAL ROOM STYLE MATCHING: You MUST strictly generate the localized room corner according to the textual design specifications below for "${roomAnalysis.style}".
DESIGN SPECIFICATION FOR THIS STYLE:
${STYLE_SPECS[roomAnalysis.style] || "Generate a professional, high-end interior corner matching the requested style."}
- Style: ${roomAnalysis.style}
- Layout: ${roomAnalysis.layout}
- Furniture: ${roomFurnitureStr}
- Colors: ${roomColorsStr}`);

        const lightPrompt = params.lightState === "on"
          ? `CRITICAL (LIGHT IS ON): Warm, soft, high-fidelity light glows from the light source of the lamp. You MUST generate realistic volumetric light cones, ambient lighting casting on nearby surfaces, and highlight shadows with rich glow effects. The warm light from the floor lamp (approx 3000K-3500K) must blend harmoniously with the cozy ambient lighting.`
          : `CRITICAL (LIGHT IS OFF): The floor lamp is TURNED OFF. No artificial light is emitted. The lamp is purely lit by ambient daylight.`;

        const humanGuidance = params.needModel
          ? "PERSONA / HUMAN PRESENCE: Include a realistic human model interacting naturally with the space."
          : "PERSONA / HUMAN PRESENCE: DO NOT include any human figures or models in the scene. Provide a pure architectural and furniture visualization.";

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

${humanGuidance}`;

        parts.push({ text: prompt });

        const response = await client.models.generateContent({
          model: "gemini-3.1-flash-image",
          contents: {
            parts: parts,
          },
          config: {
            imageConfig: {
              aspectRatio: params.ratio === "3:4" ? "3:4" : "4:3",
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
      console.error("Error in serverless /api/gemini endpoint:", error);
      return res.status(500).json({ error: error.message || "Gemini endpoint error" });
    }
  }

  return res.status(404).json({ error: `Not Found: ${pathname}` });
}
