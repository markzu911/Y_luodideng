const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  /You are an expert interior designer\. Analyze this room image for a floor lamp try-on visualizer application\./g,
  "You are an expert interior designer. Analyze this room image for a floor lamp try-on visualizer application. VERY IMPORTANT: You MUST reply in Chinese (简体中文) for all string values."
);
content = content.replace(
  /You are an expert product and lighting designer\. Analyze this floor lamp image\./g,
  "You are an expert product and lighting designer. Analyze this floor lamp image. VERY IMPORTANT: You MUST reply in Chinese (简体中文) for all string values."
);
fs.writeFileSync('server.ts', content);
