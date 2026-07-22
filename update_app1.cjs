const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add new state variables
const stateTarget = `  const [generatedSceneUrl, setGeneratedSceneUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);`;
const stateReplacement = `  const [generatedSceneUrl, setGeneratedSceneUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [generationHistory, setGenerationHistory] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);`;
content = content.replace(stateTarget, stateReplacement);

// 2. Update handleStartGeneration to save to history
const genTarget = `          } else if (apiResultUrl) {
            setGeneratedSceneUrl(apiResultUrl);
            setStep(4);
          }`;
const genReplacement = `          } else if (apiResultUrl) {
            if (generatedSceneUrl && !generationHistory.includes(generatedSceneUrl)) {
              setGenerationHistory(prev => [generatedSceneUrl, ...prev]);
            }
            setGeneratedSceneUrl(apiResultUrl);
            setStep(4);
          }`;
content = content.replace(genTarget, genReplacement);

// 3. Update handleExportResult to support any URL
const exportTarget = `  const handleExportResult = () => {
    if (!generatedSceneUrl) return;

    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = generatedSceneUrl;`;
const exportReplacement = `  const handleExportResult = (url?: string | React.MouseEvent) => {
    const targetUrl = typeof url === 'string' ? url : (previewImageUrl || generatedSceneUrl);
    if (!targetUrl) return;

    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = targetUrl;`;
content = content.replace(exportTarget, exportReplacement);

// Also update window.open fallback in handleExportResult
const fallbackTarget = `window.open(generatedSceneUrl, "_blank");`;
const fallbackReplacement = `window.open(targetUrl, "_blank");`;
content = content.replace(fallbackTarget, fallbackReplacement);

fs.writeFileSync('src/App.tsx', content);
