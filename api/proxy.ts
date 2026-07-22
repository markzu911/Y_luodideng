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

        const isUploadedRoom = roomImage && (roomImage.includes("base64,") || roomImage.startsWith("data:image/") || roomImage.startsWith("blob:"));
        const isVirtualRoom = !isUploadedRoom;

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
        let preservationGuidance = "";
        let perspectiveGuidance = "";

        if (params.viewType === "far") {
          preservationGuidance = "2. CORNER & SOFA FRAME (远景视角 - 100% 模仿参考远景视角与局部取景):\n   - CROP & FRAMING: Frame a localized corner featuring a section/armrest of the sofa, throw pillows, side wall, coffee table, and the floor lamp standing in the corner right beside the sofa armrest. DO NOT render a wide full-room shot or show unnecessary empty room space (展示沙发的一角与茶几局部即可，无需展示整个完整大房间).\n   - FULL LAMP HEIGHT: Show the complete floor lamp from top lampshade down to its base standing on the floor right beside the sofa armrest.\n   - SOFA & LAMP PROXIMITY: The floor lamp must stand snugly in the corner right beside the sofa's outer armrest, with the sofa corner, coffee table, and background wall surrounding it in natural photorealistic composition.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (FAR VIEW / 远景视角): Focused corner framing displaying a sofa corner, coffee table, and the full-height floor lamp standing right beside the sofa armrest (without showing the whole wide room).";
        } else if (params.viewType === "mid") {
          preservationGuidance = "2. FULL-HEIGHT CORNER SHOT (中景/完整视角): Frame the floor lamp standing directly next to the sofa armrest or bed in the corner, keeping the sofa and wall tightly adjacent to the lamp in natural camera perspective.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (MID VIEW / 中景视角): Medium-distance framing showing the floor lamp standing right beside the primary sofa armrest or nightstand with zero gap between furniture and lamp.";
        } else if (params.viewType === "close") {
          preservationGuidance = "2. CLOSE-UP MACRO DETAIL SHOT (近景特写视角 - 落地灯主体特写):\n   - SUBJECT FOCUS: The floor lamp (lampshade and upper pole) is the ABSOLUTE MAIN SUBJECT of the image. The camera must be zoomed in extremely close to the lamp.\n   - CROP LEVEL: You MUST crop out the lower half and base of the floor lamp. The lampshade MUST dominate the central frame, occupying the majority of the image height.\n   - REAL ROOM BACKGROUND: The background MUST strictly be an authentic partial section of the room from IMAGE 1 (e.g., blurred wall texture, edge of furniture, or vase), serving ONLY as a softly rendered backdrop. DO NOT emphasize the room or furniture layout; the focus is solely on the lamp's detailed texture.";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (MACRO CLOSE-UP VIEW / 近景特写视角): Camera zoomed in very close to the glowing lampshade and upper pole. Bottom of the lamp and floor are cropped out of frame. The lampshade dominates the central frame.";
        }

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
- Furniture: ${roomFurnitureStr}
- Colors: ${roomColorsStr}`
          : `CRITICAL ROOM STYLE & ARCHITECTURE PRESERVATION: You MUST strictly preserve the exact style, architectural walls, window placement, wall textures, and furniture layout of the uploaded room background (IMAGE 1). 必须完全绝对保留用户上传房间图片（IMAGE 1）的墙面材质、窗户布局、硬装结构和原有家具。严禁擅自增加原图不存在的窗户、修改墙面颜色/材质或多出未经允许的家具！将落地灯（IMAGE 2）自然融合成画放置在原本房间角落的沙发或床头侧面。`;

        const lightPrompt = params.lightState === "on"
          ? `CRITICAL (LIGHT IS ON): Warm, soft, high-fidelity light glows from the light source of the lamp. You MUST generate realistic volumetric light cones, ambient lighting casting on the nearby furniture and floor, and highlight shadows with rich glow effects. The warm light from the floor lamp (approx 3000K-3500K) must blend harmoniously with the room's cozy ambient lighting. The entire scene must use a unified, natural, and comfortable color temperature without any strange, extreme contrast between cold blue and warm orange.`
          : `CRITICAL (LIGHT IS OFF): The floor lamp is TURNED OFF. No artificial light is emitted. The lamp is purely lit by the room's ambient daylight and surrounding lights, revealing the authentic texture, colors, and shadows of its structural elements (lampshade, metal poles, wooden elements) without any active glow or light-cone emission.`;

        const humanGuidance = params.needModel
          ? "5. PERSONA / HUMAN PRESENCE: You MUST include a realistic human model (e.g., a person reading, relaxing, or enjoying the space) to enhance the living atmosphere. The human figure should seamlessly blend into the scene and interact naturally with the lighting and environment. 必须要包含一个真实的人物模型（比如正在阅读或休息的人）。"
          : "5. PERSONA / HUMAN PRESENCE: DO NOT include any human figures or models in the scene. Provide a pure architectural and furniture visualization. 绝对不要在画面中出现任何人物模型。";

        const prompt = `A professional, ultra-high-resolution interior design photograph.
Your task is to generate a new room based on the analysis and embed the provided floor lamp into it.

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
1. NO UNREQUESTED OR HALLUCINATED LAMP PARTS (严禁出现台灯原本没有的任何部件 - 绝对精细100%还原):
   - You MUST reproduce ONLY the exact physical parts visible in the reference floor lamp image and described in the lamp analysis structure: ${lampAnalysis.structure || "N/A"}.
   - STRICTLY FORBIDDEN: DO NOT add any unrequested horizontal swing arms, side brackets, extra poles, secondary lampshades, pull-chains (unless present in original), extra trays, or hardware extensions that do NOT exist in the original lamp image.
   - IF the original floor lamp pole is a straight vertical rod, it MUST remain a single clean vertical rod. DO NOT generate any horizontal side arms protruding outwards.
   - IF the original floor lamp does NOT have a built-in tray/table, DO NOT add a tray. IF it HAS a tray, preserve its exact shape, height, and color.

2. ABSOLUTE LAMP FAITHFULNESS & STRUCTURAL INTEGRITY (100% 还原落地灯整体结构与颜色):
   - You MUST completely and exactly reproduce the floor lamp's original appearance, colors, materials, structure, and shape.
   - REALISTIC SCALE & PROPORTION (真实比例大小): The floor lamp MUST maintain a realistic scale and proportion relative to the sofa and room. It MUST NOT be unnaturally oversized, gigantic, or overly tall. The lampshade and pole should look appropriately sized for a standard living room floor lamp standing naturally next to a sofa.
   - PHYSICAL INTEGRITY: The floor lamp (lampshade, pole, built-in tray if any, and bottom base) is ONE SINGLE CONNECTED PHYSICAL OBJECT. ${params.viewType === "close" ? "FOR CLOSE-UP VIEW (近景特写): The camera is zoomed in tight on the upper lampshade and pole, so the bottom base and floor are naturally CROPPED OUT of the camera frame." : "The base MUST rest firmly on the floor. DO NOT detach the pole from its base, do not separate the tray, and DO NOT fuse/embed the lamp pole or tray into adjacent nightstands or drawers! The bedside nightstand and sofa are independent items sitting beside the floor lamp."}

3. ROOM LAYOUT CONSISTENCY & LOCALIZED CORNER (房间布局变动限制与局部角落取景):
   - Keep the background walls, wall paneling, curtains, window positions, and furniture style completely consistent and stable.
   - You are STRICTLY FORBIDDEN from generating a wide-angle full-room shot showing an entire room, huge open space, or random new room layouts. Focus strictly on the localized nook/corner where the lamp is placed.

4. STRICT LAMP PLACEMENT RULES & REALISTIC SPATIAL PERSPECTIVE (落地灯摆放位置与透视空间关系):
   - ${params.viewType === "close" ? "FOR CLOSE-UP VIEW (近景特写): The camera is extremely zoomed in on the lamp itself. The spatial relationship to the sofa/bed is implied by the background, but the lamp stands as the central focal point." : "CRITICAL SOFA PLACEMENT & PHYSICAL PROXIMITY: The floor lamp MUST be placed directly beside the sofa armrest or in the corner wall right behind the armrest. The lamp pole MUST be physically close to the sofa armrest with ZERO floating gap. STRICTLY FORBIDDEN: DO NOT place the floor lamp isolated in the middle of the room, in open pathways, or in front of the sofa! (绝对禁止将落地灯孤立放置在房间中央空地或离沙发太远的空旷处！必须紧贴沙发扶手或墙角放置！).\n   - CRITICAL BEDROOM PLACEMENT: In a bedroom, the floor lamp MUST be placed ONLY at the headboard corner beside the nightstand. STRICTLY FORBIDDEN to place at the foot of the bed or bed-end bench (绝对禁止把落地灯放在床尾或床脚处！).\n   - PERSPECTIVE ALIGNMENT: The sofa armrest, headboard, or side table MUST be directly adjacent to the lamp pole in the camera view to establish a natural, physically realistic spatial perspective."}

5. CAMERA CENTERING & VIEW-TYPE PERSPECTIVE (相机镜头对焦取景):
   - ${perspectiveGuidance}

6. FOCUS & DEPTH OF FIELD (对焦与视觉质感):
   - ${params.viewType === "close" ? "FOR CLOSE-UP VIEW (近景特写): The floor lamp's lampshade and upper pole must be in crisp, razor-sharp focus in the foreground, with the authentic partial room background softly rendering behind it with natural close-up macro photography depth." : "You MUST keep the ENTIRE photograph (lamp, background wall, adjacent furniture, curtains) completely sharp and clear in deep focus. DO NOT apply unnatural bokeh blur or heavy portrait-style background blur."}

${preservationGuidance}

${humanGuidance}`;

        parts.push({ text: prompt });

        const response = await client.models.generateContent({
          model: model || "gemini-3.1-flash-image",
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
