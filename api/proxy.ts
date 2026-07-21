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

        // Add lamp image as context
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

        // Detailed prompt
        let perspectiveGuidance = "";
        if (params.viewType === "far") {
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (FAR VIEW / 全景/远景): MUST show a wide-angle perspective. The camera is positioned far back to capture a wide area of the room. It should show the full floor lamp from top to bottom, along with large pieces of furniture (like the entire sofa, side table) and the surrounding environment (like curtains) to establish the overall space and layout.";
        } else if (params.viewType === "mid") {
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (MID VIEW / 中景): MUST show a medium shot perspective. The camera is noticeably closer than the far view. It should frame the upper half or three-quarters of the floor lamp and its immediate adjacent furniture (e.g., a table corner, part of a sofa). It focuses on the local zone where the lamp is placed, bringing the viewer closer to the lighting effect while still showing some environmental context.";
        } else if (params.viewType === "close") {
          perspectiveGuidance = "4. VIEW AND PERSPECTIVE (CLOSE VIEW / 近景/特写): MUST show a tight close-up perspective. The camera is very close, focusing primarily on the lampshade and the light it emits. The lampshade should dominate the frame, with only a small amount of immediate background context visible (like the top of a table or a nearby vase). The lower half of the lamp stand and large furniture pieces should be excluded from the frame.";
        }

        const humanGuidance = params.needModel
          ? "5. PERSONA / HUMAN PRESENCE: You MUST include a realistic human model (e.g., a person reading, relaxing, or enjoying the space) to enhance the living atmosphere. The human figure should seamlessly blend into the scene and interact naturally with the lighting and environment. 必须要包含一个真实的人物模型（比如正在阅读或休息的人）。"
          : "5. PERSONA / HUMAN PRESENCE: DO NOT include any human figures or models in the scene. Provide a pure architectural and furniture visualization. 绝对不要在画面中出现任何人物模型。";

        const prompt = `A professional, ultra-high-resolution interior design photograph.
Your task is to modify the provided room image by naturally embedding the provided floor lamp into it.

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
2. EXACT ROOM PRESERVATION: You MUST preserve the original room's visual appearance and layout exactly. Do NOT regenerate a completely new room. Keep the original room's architectural structure, walls, windows, and all furniture (including bedding, pillows, chairs, tables, curtains, small decorations) looking exactly identical to the original room photograph. You are only allowed to insert the floor lamp into the scene and adjust the local lighting/shadows where the lamp affects the environment. 必须100%保留房间原本的布局、建筑结构和所有的家具、软装（包括床上的毯子形状、枕头位置、窗帘、甚至是墙上的装饰物等），绝对不能改变它们的外观、形状或位置。你的任务仅仅是将落地灯自然地融入原图，并在周围添加逼真的光影，绝对不能改变原本的家具和布局！
3. PLACEMENT RULE: If the room is a bedroom, YOU MUST PLACE THE LAMP NEXT TO THE HEAD OF THE BED OR NIGHTSTAND (床头/床头柜旁). IT IS STRICTLY FORBIDDEN to place it at the foot of the bed (床尾). If the room is a living room, place the floor lamp directly beside or behind (侧后方/侧边) EXISTING furniture like a chaise longue (贵妃榻) or bean bag/lazy sofa (懒人沙发). NEVER place the lamp in front of any sofa. NEVER place the lamp in the aisle/walkway between two sofas. If no such furniture is present, place it on the side-rear (侧后方) or side (侧边) of the main sofa closer to the balcony or window. The placement must be logical and physically realistic. 如果是在卧室，必须、一定、绝对要摆放在床头或床头柜旁边！绝对不能摆放在床尾！绝对不能摆放在房间中间的过道上！如果是客厅，绝对不能将落地灯摆放在沙发的正前方遮挡视线或影响使用，可以摆放在沙发的侧后方或侧边（参考真实居家环境）。
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
