const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `let roomStylePrompt = "";
        if (isVirtualRoom) {
          if (params.viewType === "close") {
            roomStylePrompt = \`CRITICAL BACKGROUND MATCHING: You MUST strictly generate the background to perfectly capture the essence of "\${roomAnalysis.style}". 
DESIGN SPECIFICATION FOR BACKGROUND:
Keep the background extremely simple, such as a dim, clean, and out-of-focus dark-grey or deep-brown flat paneled wall or cabinet door, creating a sophisticated luxury contrast. 
CRITICAL: DO NOT generate any large furniture, beds, sofas, floors, or complete rooms, as this is an extreme close-up detail shot of the lamp only.
- Style: \${roomAnalysis.style}
- Colors: \${roomAnalysis.colors.join(", ")}\`;
          } else {
            roomStylePrompt = \`CRITICAL ROOM STYLE MATCHING: You MUST strictly generate the room according to the textual design specifications below to perfectly capture the essence of "\${roomAnalysis.style}". 必须严格按照以下【设计规范】和【文字描述】生成极致完美的【\${roomAnalysis.style}】风格样板间，完全符合对应的颜色、家具和布局设定，切记不要偏离指定的风格！

DESIGN SPECIFICATION FOR THIS STYLE:
\${STYLE_SPECS[roomAnalysis.style] || "Generate a professional, high-end interior matching the requested style."}

The room style and context MUST match:
- Style: \${roomAnalysis.style}
- Layout: \${roomAnalysis.layout}
- Furniture: \${roomAnalysis.furniture.join(", ")}
- Colors: \${roomAnalysis.colors.join(", ")}\`;
          }
        } else {
          roomStylePrompt = \`CRITICAL ROOM PRESERVATION RULES (真实照片背景、家具硬装与布局100%严苛保持一致 - 绝不修改或虚构背景):
- You MUST use the EXACT room layout, wall paneling, cabinets, decorative items, flooring, doors, windows, and furniture shown in the "Reference Room Image".
- ABSOLUTELY NO ALTERATIONS TO BACKGROUND: Do NOT rearrange the sofa, do NOT change the wall material or texture, do not add or delete cabinet boards, do not introduce new shelves or plants, and do not create non-existent window designs.
- STRICTLY CONSTRAIN PLACEMENT: The room environment MUST remain 100% identical to the uploaded photo. You are ONLY placing the floor lamp into this existing real corner.
- The corner of the room must be a real corner from the room uploaded by the user, and the layout and furniture must remain consistent. Do not add or delete items, and do not invent non-existent walls, cabinets, or windows (画面里展示的房间一角必须是用户上传照片中真实的一角，家具与硬装布局必须完全保持一致，严禁自己添加多余物品或删除原有物品，严禁虚构任何原本不存在的墙面、柜面、窗户、柜子或背景元素！).\`;
        }`;

code = code.replace(/const roomStylePrompt = isVirtualRoom[\s\S]*?元素！\)\.\`;/, replacement);
fs.writeFileSync('server.ts', code);
