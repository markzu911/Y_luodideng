const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `      const prompt = \`A professional, ultra-high-resolution interior design photograph.
Your task is to generate a new room based on the analysis and embed the provided floor lamp into it.

The floor lamp style, color, and materials MUST perfectly match the reference lamp image:`;

const replacement = `      const prompt = \`A professional, ultra-high-resolution interior design photograph.
Your task is to generate a new room based on the analysis and embed the provided floor lamp into it.

The room style and context MUST match:
- Style: \${roomAnalysis.style}
- Layout: \${roomAnalysis.layout}
- Furniture: \${roomAnalysis.furniture.join(", ")}
- Colors: \${roomAnalysis.colors.join(", ")}

The floor lamp style, color, and materials MUST perfectly match the reference lamp image:`;

content = content.replace(target, replacement);

const target2 = `      if (params.viewType === "close") {
        perspectiveGuidance = "4. VIEW AND PERSPECTIVE (CLOSE VIEW): MUST show an intimate, tight close-up (特写) perspective focusing on the floor lamp in the room. CRITICAL: While the camera angle CAN VARY to show the best perspective, you MUST NOT change the room's original furniture layout. The placement of the lamp must be reasonable and logical within the existing layout (e.g. next to a sofa or bed). 即使是近景（特写）也绝对不能随便更改屋内的家具布局，只能改变摄像机视角！并且落地灯摆放的位置必须合理，要符合真实居家环境的逻辑。Keep the background fully sharp and without bokeh.";
      }`;

const replacement2 = `      if (params.viewType === "close") {
        perspectiveGuidance = "4. VIEW AND PERSPECTIVE (CLOSE VIEW): MUST show an intimate, tight close-up (特写) perspective focusing on the floor lamp in the room. CRITICAL: While the camera angle CAN VARY to show the best perspective, you MUST NOT change the room's original furniture layout. The placement of the lamp must be reasonable and logical within the existing layout (e.g. next to a sofa or bed). 即使是近景（特写）也绝对不能随便更改屋内的家具布局，只能改变摄像机视角！并且落地灯摆放的位置必须合理，要符合真实居家环境的逻辑。Keep the background fully sharp and without bokeh.";
      }
      
      const humanGuidance = params.needModel 
        ? "5. PERSONA / HUMAN PRESENCE: You MUST include a realistic human model (e.g., a person reading, relaxing, or enjoying the space) to enhance the living atmosphere. The human figure should seamlessly blend into the scene and interact naturally with the lighting and environment. 必须要包含一个真实的人物模型（比如正在阅读或休息的人）。" 
        : "5. PERSONA / HUMAN PRESENCE: DO NOT include any human figures or models in the scene. Provide a pure architectural and furniture visualization. 绝对不要在画面中出现任何人物模型。";
`;

content = content.replace(target2, replacement2);
content = content.replace("${perspectiveGuidance}`;", "${perspectiveGuidance}\n${humanGuidance}`;");

fs.writeFileSync('server.ts', content);
