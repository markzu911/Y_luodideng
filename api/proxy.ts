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

        const isVirtualRoom = roomImage && (roomImage.includes("/assets/") || roomImage.includes("assets/"));

        // Add lamp image as context
        if (lampImage) {
          if (lampImage.startsWith("http") || lampImage.includes("/assets/")) {
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

        // Detailed prompt and structure preservation guidance based on selected viewType
        let preservationGuidance = "";
        let perspectiveGuidance = "";

        if (params.viewType === "far") {
          preservationGuidance = "2. DISTANT / WIDER CORNER SHOT (远景/更宽局部视角): The camera is positioned further back compared to the medium close view to capture a wider, more comprehensive view of the room corner. It clearly reveals the entire height of the floor lamp (base to shade), the full scale of the neighboring furniture (e.g., the complete side of the sofa, or the entire bed headboard with the nightstand), and more floor and wall surface. It MUST show a distinctly larger range of the room than the medium view, but NOT the entire room (远景视角：视距较远，展示落地灯所在角落的更宽范围，包括完整的落地灯、完整的相邻家具侧边、更多的墙面与地面，展示范围明显大于中景，但又不是展示整间房间，确保画面重点仍在角落里).";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (FAR VIEW / 远景/更宽视距视角): Set a larger camera distance to show a broader segment of the room's corner environment. It must be clearly distinguished from the medium view by showing significantly more of the surrounding layout and furniture, while keeping the floor lamp as the primary focal subject.";
        } else if (params.viewType === "mid") {
          preservationGuidance = "2. MEDIUM CLOSE SHOT (中景/中等视距视角): The camera is positioned at a medium distance (approx 1 to 1.5 meters), focusing on a tighter, more intimate view of the floor lamp's upper-to-mid section (lampshade, pole, built-in shelf/tray) and the immediate neighboring furniture (e.g., only the side armrest of the sofa or the top of the bedside nightstand). The visible room area is smaller, more focused, and much tighter than the far view (中景视角：视距较近，约1-1.5米，聚焦于落地灯中上段及其紧邻的局部，展示的房间范围明显比远景更小更窄，与远景有明确的视距和景深区分).";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (MID VIEW / 中景/中等视距): A closer, more focused medium shot that tightly frames the floor lamp and its immediate surrounding elements. It MUST have a narrower perspective and smaller visible room range compared to the far view.";
        } else if (params.viewType === "close") {
          preservationGuidance = "2. EXTREME MACRO CLOSE-UP (近景/特写 - 画面仅展示灯罩与上段直立灯杆): EXTREME MACRO DETAIL SHOT. The camera MUST zoom in very closely to focus exclusively on the upper lampshade, straight vertical upper pole, and pull-chain switch (if present in original). The lampshade MUST dominate 60%-70% of the photo frame. CRITICAL: DO NOT add any horizontal swing arm, extension bracket, swivel joint, or side attachment under the shade! The floor, lamp base, and room ceiling MUST be completely cropped OUT of the frame!";
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (CLOSE VIEW / 近景/灯罩长焦特写): Macro photography distance focusing directly on the lampshade and straight vertical pole. Look at classic product close-up detail photos: only the upper shade and straight vertical pole are visible. DO NOT add any horizontal swing arm, side bracket, or swivel joint!";
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
- Furniture: ${roomAnalysis.furniture.join(", ")}
- Colors: ${roomAnalysis.colors.join(", ")}`
          : `CRITICAL ROOM STYLE MATCHING: You MUST preserve the exact style and structural integrity of the uploaded room background. Under no circumstances should you generate a completely different style of walls, floors, or furniture. The generated scene MUST feel like a natural extension and high-fidelity placement of the lamp within the real uploaded room context.`;

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
Materials: ${lampAnalysis.materials.join(", ")}
Color: ${lampAnalysis.color}
Light Type: ${lampAnalysis.lightType}
Light Warmth: ${lampAnalysis.lightWarmth}

${lightPrompt}

HIGHEST PRIORITY CONSTRAINTS (MUST BE STRICTLY FOLLOWED):
1. NO UNREQUESTED OR HALLUCINATED LAMP PARTS OR ITEMS (严禁出现台灯原本没有的任何部件与杂物 - 绝对精细100%还原):
   - You MUST reproduce ONLY the exact physical parts visible in the reference floor lamp image and described in the lamp analysis structure: ${lampAnalysis.structure || "N/A"}.
   - STRICTLY FORBIDDEN HORIZONTAL ARMS / BRACKETS: DO NOT add any horizontal swing arms, side extension brackets, swivel joints, extra poles, secondary lampshades, or hardware attachments that do NOT exist in the original reference lamp image (绝对禁止增加任何横向伸缩摇臂、侧向延伸支架、转轴或副灯罩！).
   - IF the original floor lamp pole is a straight vertical rod, it MUST remain a single clean, straight vertical rod with ZERO side projections.
   - NO EXTRA ITEMS ON LAMP / TRAY: Do NOT place any unrequested cups, vases, desk lamps, or decorative clutter onto the floor lamp's tray or pole unless originally present in the reference image. Keep the floor lamp 100% clean and authentic to its original design.

2. ABSOLUTE LAMP FAITHFULNESS & STRUCTURAL INTEGRITY (100% 还原落地灯整体结构与颜色):
   - You MUST completely and exactly reproduce the floor lamp's original appearance, colors, materials, structure, and shape.
   - PHYSICAL INTEGRITY: The floor lamp (lampshade, pole, built-in tray if any, and bottom base) is ONE SINGLE CONNECTED PHYSICAL OBJECT. The base MUST rest firmly on the floor. DO NOT detach the pole from its base, do not separate the tray, and DO NOT fuse/embed the lamp pole or tray into adjacent nightstands or drawers! The bedside nightstand and sofa are independent items sitting beside the floor lamp.

3. STRICT ROOM LAYOUT CONSISTENCY (房间布局与背景结构绝对禁止改变 - 100%保持原房布局):
   - You MUST strictly preserve and maintain the exact room layout, wall paneling, sofa arrangement, window location, curtains, and furniture from the provided room image.
   - STRICTLY FORBIDDEN: DO NOT rearrange furniture, DO NOT move the sofa, DO NOT change wall materials/paneling, and DO NOT invent a new room layout (绝对禁止移动沙发或主要家具位置、绝对禁止改变背景墙和窗帘结构！).
   - The room background MUST remain 100% identical and stable across all generated views and light toggles.

4. STRICT LAMP PLACEMENT RULES - MUST BE PLACED ON THE SIDE OF SOFA/BED (落地灯摆放位置严禁放在床尾或沙发正前方！必须放在侧面):
   - CRITICAL SOFA PLACEMENT: In a living room, the floor lamp MUST be placed on the SIDE of the sofa (beside the outer armrest or in the corner behind the armrest). STRICTLY FORBIDDEN: DO NOT place the floor lamp in front of the sofa seats, in front of the coffee table, or facing the sofa front (绝对禁止把落地灯摆放在沙发正前方、座位前或茶几旁！必须放在沙发侧面扶手旁！).
   - CRITICAL BEDROOM PLACEMENT: In a bedroom, the floor lamp MUST be placed ONLY at the headboard corner beside the nightstand. STRICTLY FORBIDDEN to place at the foot of the bed or bed-end bench (绝对禁止把落地灯放在床尾或床脚处！).
   - NEVER place the lamp floating in walkways, open room center, or facing furniture frontally.

5. STRICT DIMENSIONS & PROPORTIONAL SCALE MATCHING (严苛家具与落地灯的物理尺寸与比例对照规范):
   - HEIGHT PROPORTION (相对高度): A standard floor lamp stands about 1.5 to 1.8 meters tall. The floor lamp MUST be physically taller than the sofa backrest and bedside nightstand. The lampshade should stand at a realistic reading/ambient height relative to the adjacent sofa or bed.
   - USER LAMP SCALE FIDELITY (注意用户上传落地灯的尺寸信息): Strictly honor the proportions of the uploaded floor lamp image. If the reference lamp is a slender pole lamp, do not make it thick. If the shade is large and dome-shaped, ensure it maintains that scale relative to the sofa's armrest.
   - BUILT-IN TRAY HEIGHT (内置置物台/茶几高度): If the floor lamp has a built-in tray/table, its height from the floor MUST stand at a standard, realistic height (about 55cm to 65cm). It MUST align beautifully and horizontally with the adjacent sofa armrest or bedside nightstand. It must NOT look unnaturally low or abnormally high near the shade.
   - SIZE & SCALE FIDELITY (真实比例与家具尺寸对照): The lampshade, pole thickness, built-in tray width, and base diameter MUST be perfectly proportioned to the adjacent real furniture (sofa, nightstand, bed). The lamp must NOT look like a giant towering column, nor a tiny miniature desk-lamp scale model.
   - GROUNDED BASE (底座落地稳固): The floor lamp's base must rest flatly and solidly on the floor, rather than floating in mid-air or sinking into the ground.

6. CAMERA CENTERING & VIEW-TYPE PERSPECTIVE & SOFA CORNER FRAMING (相机镜头对焦取景与沙发一角局部取景规范):
   - ${perspectiveGuidance}
   - SOFA CORNER FRAMING (只展示房间中沙发的一角): In living room or sofa scenes, the camera MUST adopt an elegant, tight, and professional catalog-style framing. Do NOT show the entire sofa, and do NOT show the entire room. Instead, only capture a localized corner of the sofa (e.g., about 1/3 to 1/2 of the sofa, showing one armrest, the side seat cushion, and a pillow or two, with a small part of a coffee table in the corner foreground, and a beautifully framed painting or textured paneling on the wall behind it). Place the floor lamp gracefully right beside the sofa armrest. This tight framing keeps the visual focus extremely snug, cozy, and highly professional.

7. ZERO BOKEH & DEEP FOCUS (全焦清晰 - 画面真实清晰):
   - You MUST keep the ENTIRE photograph (lamp, background wall, adjacent furniture, curtains) completely sharp and clear in deep focus.
   - DO NOT apply unnatural bokeh blur or heavy portrait-style background blur.

${preservationGuidance}

${humanGuidance}`;

        parts.push({ text: prompt });

        const response = await client.models.generateContent({
          model: model || "gemini-3.1-flash-lite-image",
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
