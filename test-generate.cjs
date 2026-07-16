const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
require('dotenv').config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  const prompt = `A professional, beautiful, and ultra-high-resolution interior design photograph.
Your task is to generate a beautiful, normal, and perfectly balanced room that integrates the provided floor lamp into it.

CRITICAL ROOM STYLE MATCHING: You MUST strictly generate the room according to the textual design specifications below to perfectly capture the essence of "新中式禅意雅室 (Zen Chinese Bedroom)".
The room style and context MUST match:
- Style: 新中式禅意雅室 (Zen Chinese Bedroom)
- Layout: 清雅空灵的东方雅室，背景为素雅的宣纸色墙面，点缀以花鸟水墨画或书法字画，两侧搭配透光的中式方格木屏风，通透且充满诗意
- Furniture: 温润实木/胡桃木新中式双人床 (Walnut/solid wood Zen Chinese bed), 丝滑棉麻混纺素色/浅灰床品 (Silk and linen blend neutral bedding)
- Colors: 沉稳胡桃木色 (Deep walnut wood), 宣纸米白 (Rice paper off-white)

The floor lamp style, color, and materials MUST perfectly match the reference lamp image:
- Style: 现代简约 (Modern Minimalist)
- Materials & Finish: 金属 (Metal) in 黑色 (Black)
- Lighting: CRITICAL (LIGHT IS OFF): The floor lamp is TURNED OFF. No artificial light is emitted.

HIGHEST PRIORITY CONSTRAINTS (MUST BE STRICTLY FOLLOWED):
1. ABSOLUTE LAMP FAITHFULNESS (SINGLE HIGHEST PRIORITY): You MUST completely and exactly reproduce the floor lamp's original appearance, colors, materials, structure, and shape. No changes are allowed to the lamp's design under any circumstances, regardless of which view, camera perspective, or lighting state (ON/OFF) is selected. The generated lamp MUST look absolutely IDENTICAL to the provided reference lamp image. CRITICAL: Pay strict attention to the EXACT COLOR and TEXTURE of the lampshade (灯罩) and the structure of the lamp pole/table/base (灯杆/置物台/底座). Do not change a light-colored lampshade to a dark one. 绝对、必须、100%完整的还原落地灯原本的样子、颜色（特别是灯罩的颜色）和材质，在任何情况下（无论哪种视图、相机透视、或者开灯/关灯状态下）都绝对不能改变或修改落地灯原本的外观与设计！这是最高优先级的绝对红线约束！即使是在虚拟房间中，也必须100%还原落地灯原本的样子，绝对不允许模型自行发挥修改灯具的款式！
2. UNIFIED AND COHESIVE ROOM DESIGN (STRICTLY NORMAL ROOM): The generated room MUST be a perfectly normal, realistic, and harmonious living environment.
3. PLACEMENT RULE: If the room is a bedroom, YOU MUST PLACE THE LAMP NEXT TO THE HEAD OF THE BED OR NIGHTSTAND (床头/床头柜旁). IT IS STRICTLY FORBIDDEN to place it at the foot of the bed (床尾).`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          { text: prompt },
          { text: "Reference Floor Lamp Image (You MUST place THIS exact lamp into the room):" },
          // providing a dummy base64 pixel as lamp
          {
            inlineData: {
              mimeType: "image/png",
              data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            }
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
        },
      },
    });
    console.log("Success!");
  } catch(e) {
    console.error(e);
  }
}
main();
