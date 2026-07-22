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

        if (params.viewType === "close") {
          viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: CLOSE VIEW (近景/特写视角 - 必须100%严格按照近景参考图进行微距特写剪裁，绝对禁止画成远景/大房间！):
- THIS IS A TIGHT MACRO / CLOSE-UP DETAIL PHOTOGRAPH (如同用户提供的近景参考图所示的特写镜头).
- CAMERA CROP & ZOOM: The camera MUST zoom in extremely close to capture ONLY the glowing lampshade and the upper stem/pole of the floor lamp.
- LAMPSHADE DOMINANCE: The illuminated lampshade MUST fill the majority (~50%-70%) of the upper/center frame.
- BACKGROUND: The immediate background behind the pole/stem shows ONLY a warm wall surface, cabinet panel, or side table corner with decor (such as a vase of flowers) bathed in the lamp's soft golden glow.
- ABSOLUTE PROHIBITIONS FOR CLOSE VIEW (近景特写严禁事项):
  * DO NOT show any ceiling or ceiling light strips!
  * DO NOT show the floor or the floor lamp base!
  * DO NOT show a wide living room, full sofas, chaise lounges, coffee tables, or wide windows!
  * ANY image showing a wide living room or visible ceiling/floor in CLOSE VIEW is a critical error!`;
        } else if (params.viewType === "mid") {
          viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: MID VIEW (中景/中近景视角):
- Reference high-end interior photography. Frame a tight medium shot focusing on the illuminated upper 2/3 of the floor lamp (lampshade and pole) standing naturally next to the sofa backrest or bedside table.
- Background shows soft translucent curtains or warm wall paneling.
- The floor lamp base and floor are cropped out.`;
        } else {
          viewTypeSpecificPrompt = `
CRITICAL VIEW TYPE: FAR VIEW (远景/局部角落视角 - 绝对禁止展示整间大客厅或远景大房间！):
- Reference high-end lifestyle interior photography (如远景视角参考图所示). Frame ONLY a cozy localized nook/corner of the sofa or bed (沙发或床榻的局部角落一角).
- In the midground/foreground, show the sofa backrest/armrest with plush cushions or throw blanket. In the background, soft floor-to-ceiling window curtains or warm wall paneling are visible.
- The floor lamp stands in this cozy corner beside/behind the sofa/bed, with its illuminated shade standing out prominently in the upper-center frame.
- ABSOLUTE PROHIBITION: DO NOT show a wide-angle full room, open living room layout, or distant wide furniture!`;
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

        const roomStylePrompt = hasRoomImage
          ? `CRITICAL ROOM BACKGROUND PRESERVATION (必须100%绝对保留IMAGE 1原图房间与家具面貌):
- Look directly at the attached reference room image (IMAGE 1).
- You MUST STRICTLY PRESERVE the exact room background, architectural wall materials (wallpapers, wood paneling, plaster, paint colors), window placements, curtains, and existing sofa/bed furniture from IMAGE 1.
- DO NOT REPLACE OR MODIFY THE SOFA/BED: The sofa or bed in IMAGE 1 MUST remain identical in shape, fabric/leather material, color, and cushions.
- DO NOT CHANGE WALLS OR DECOR: Keep the exact wall colors, paneling, and decor from IMAGE 1.`
          : (params.viewType === "close"
              ? `ROOM STYLE CONTEXT: Match the wall colors, textures, and ambient materials of "${roomAnalysis.style}" for the background wall.`
              : `CRITICAL ROOM STYLE MATCHING: You MUST strictly generate the room according to the textual design specifications below to perfectly capture the essence of "${roomAnalysis.style}".
DESIGN SPECIFICATION FOR THIS STYLE:
${STYLE_SPECS[roomAnalysis.style] || "Generate a professional, high-end interior matching the requested style."}
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
