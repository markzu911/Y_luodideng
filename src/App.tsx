import React, { useState, useRef, useEffect, ChangeEvent, MouseEvent, TouchEvent } from "react";
import { 
  Upload, Sparkles, Sliders, Sun, Download, ChevronRight, 
  Image as ImageIcon, Grid, Trash2, Loader2, Power, 
  Lightbulb, Compass, User, Palette, Check, ArrowLeft,
  ChevronLeft, Info, HelpCircle, ZoomIn, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VIRTUAL_ROOMS, PRESET_LAMPS } from "./data";
import { RoomAnalysis, LampAnalysis, VirtualRoom, PresetLamp, GenerationParams } from "./types";
import AgentMode from "./components/AgentMode";

// Helper to compress an uploaded image using HTML5 Canvas (max dimension 1600px, quality 0.85, output format image/jpeg)
const compressImage = (file: File, maxDimension = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Scale proportionally if any dimension exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Output as image/jpeg to compress effectively
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function App() {
  // Current step state: 1, 2, 3, 4
  const [step, setStep] = useState<number>(1);
  // Current App Mode: "select" (模式选择), "agent" (智能体模式) or "expert" (专家模式)
  const [appMode, setAppMode] = useState<"select" | "agent" | "expert">("select");

  // SaaS Integration State
  const [userId, setUserId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("userId") || "default_user_id";
  });
  const [toolId, setToolId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("toolId") || "default_tool_id";
  });
  const [userIntegral, setUserIntegral] = useState<number | null>(null);
  const [toolRequiredIntegral, setToolRequiredIntegral] = useState<number>(0);
  const [userInfo, setUserInfo] = useState<{ name: string; enterprise: string; integral: number } | null>(null);

  const isOutOfCredits = userIntegral !== null && userIntegral < toolRequiredIntegral;

  // Helper to convert base64 image data to a Blob
  const base64ToBlob = (base64: string, mime: string): Blob => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  };

  // Fetch initial Launch Information (1st endpoint: launch)
  const fetchLaunchInfo = async (uId: string, tId: string) => {
    try {
      const res = await fetch("/api/tool/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uId, toolId: tId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setUserInfo(data.data.user);
          setUserIntegral(data.data.user.integral);
          setToolRequiredIntegral(data.data.tool.integral);
        }
      }
    } catch (err) {
      console.error("Failed to fetch launch info:", err);
    }
  };

  // Listen to postMessage for SAAS_INIT and URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uId = params.get("userId");
    const tId = params.get("toolId");
    if (uId) setUserId(uId);
    if (tId) setToolId(tId);

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SAAS_INIT') {
        console.log("Received SAAS_INIT from host:", event.data);
        if (event.data.userId) setUserId(event.data.userId);
        if (event.data.toolId) setToolId(event.data.toolId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync launch info whenever userId or toolId changes
  useEffect(() => {
    fetchLaunchInfo(userId, toolId);
  }, [userId, toolId]);
  
  // Scene Selection State
  const [sceneMode, setSceneMode] = useState<"upload" | "virtual">("upload");
  const [selectedVirtualRoom, setSelectedVirtualRoom] = useState<VirtualRoom | null>(null);
  const [uploadedRoomBase64, setUploadedRoomBase64] = useState<string | null>(null);
  const [roomAnalysis, setRoomAnalysis] = useState<RoomAnalysis | null>(null);
  const [isRoomAnalyzing, setIsRoomAnalyzing] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Lamp Selection State
  const [lampMode, setLampMode] = useState<"upload" | "preset">("upload");
  const [selectedPresetLamp, setSelectedPresetLamp] = useState<PresetLamp | null>(null);
  const [uploadedLampBase64, setUploadedLampBase64] = useState<string | null>(null);
  const [lampAnalysis, setLampAnalysis] = useState<LampAnalysis | null>(null);
  const [isLampAnalyzing, setIsLampAnalyzing] = useState<boolean>(false);
  const [lampError, setLampError] = useState<string | null>(null);

  // Generation Parameters State
  const [params, setParams] = useState<GenerationParams>({
    viewType: "far",
    quality: "1K",
    ratio: "4:3",
    lightState: "on",
  });
  const [isGeneratingScene, setIsGeneratingScene] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationText, setGenerationText] = useState<string>("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [generatedSceneUrl, setGeneratedSceneUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [generationHistory, setGenerationHistory] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Reset to initial state when restarting
  const handleRestart = () => {
    setStep(1);
    setSelectedVirtualRoom(null);
    setUploadedRoomBase64(null);
    setRoomAnalysis(null);
    setSelectedPresetLamp(null);
    setUploadedLampBase64(null);
    setLampAnalysis(null);
    setGeneratedSceneUrl(null);
    setGenerationError(null);
  };

  // Pre-load default selections to make exploration seamless
  useEffect(() => {
    // If user switches to virtual, select first room by default
    if (sceneMode === "virtual" && !selectedVirtualRoom) {
      handleSelectVirtualRoom(VIRTUAL_ROOMS[0]);
    }
  }, [sceneMode]);

  useEffect(() => {
    // If user switches to preset lamp, select first lamp by default
    if (lampMode === "preset" && !selectedPresetLamp) {
      handleSelectPresetLamp(PRESET_LAMPS[0]);
    }
  }, [lampMode]);

  // Handle virtual room selection
  const handleSelectVirtualRoom = (room: VirtualRoom) => {
    setSelectedVirtualRoom(room);
    setUploadedRoomBase64(null);
    setRoomAnalysis(room.analysis);
  };

  // Handle preset lamp selection
  const handleSelectPresetLamp = (lamp: PresetLamp) => {
    setSelectedPresetLamp(lamp);
    setUploadedLampBase64(null);
    setLampAnalysis(lamp.analysis);
  };

  // Handle Room Photo upload
  const handleRoomUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedVirtualRoom(null);
    setRoomAnalysis(null);
    setRoomError(null);
    setIsRoomAnalyzing(true);
    setUploadedRoomBase64(null);

    try {
      // Compress the image first (returns data:image/jpeg;base64,...)
      const base64String = await compressImage(file);
      setUploadedRoomBase64(base64String);

      // Strip out metadata prefix for API call
      const pureBase64 = base64String.split(",")[1];
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          payload: {
            task: "analyze-room",
            image: pureBase64,
            mimeType: "image/jpeg"
          }
        })
      });
      
      if (!res.ok) {
        throw new Error("场景分析接口请求失败");
      }
      
      const data = await res.json();
      setRoomAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setRoomError("房间场景智能分析失败，已为您加载兜底分析方案。");
      // Fallback analysis to prevent blocking the user
      setRoomAnalysis({
        style: "现代简约起居空间",
        layout: "温馨明亮的室内客房布局，光线充足",
        furniture: ["休闲沙发", "舒适抱枕", "现代质感背景墙"],
        colors: ["米白色", "原木色", "浅灰色"],
        recommendation: "建议将落地灯摆放在沙发后方拐角处，或者休闲椅旁，创造温馨的局部光照区。",
        lightSuggestion: "推荐 3000开尔文 暖白光或暖黄光，以增强温馨柔和的包裹感色彩氛围。"
      });
    } finally {
      setIsRoomAnalyzing(false);
    }
  };

  // Handle Lamp Photo upload
  const handleLampUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPresetLamp(null);
    setLampAnalysis(null);
    setLampError(null);
    setIsLampAnalyzing(true);
    setUploadedLampBase64(null);

    try {
      const base64String = await compressImage(file);
      setUploadedLampBase64(base64String);

      const pureBase64 = base64String.split(",")[1];
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          payload: {
            task: "analyze-lamp",
            image: pureBase64,
            mimeType: "image/jpeg"
          }
        })
      });

      if (!res.ok) {
        throw new Error("灯具分析接口请求失败");
      }

      const data = await res.json();
      setLampAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setLampError("落地灯设计分析失败，已为您加载兜底分析方案。");
      // Fallback lamp analysis to prevent blocking the user
      setLampAnalysis({
        style: "极简现代落地灯",
        materials: ["金属烤漆立柱", "高透散光灯罩"],
        color: "曜石黑",
        lightType: "漫反射温柔环境光",
        lightWarmth: "推荐 3000开尔文 温馨暖光",
        cozyIndex: 8,
        placementTip: "纤细的灯柱适合靠紧墙壁放置。将灯罩角度朝向阅读位倾斜，不仅照度完美而且能渲染出极致的光阴过度。"
      });
    } finally {
      setIsLampAnalyzing(false);
    }
  };

  // Trigger high tech rendering progress in Step 3
  const handleStartGeneration = async () => {
    setGenerationError(null);

    // 1. Verify user's points (2nd endpoint: verify)
    try {
      const verifyRes = await fetch("/api/tool/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, toolId })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        const errorMsg = verifyData.message || "您的体验额度不足，无法启动生成。";
        setGenerationError(errorMsg);
        return;
      }
    } catch (err: any) {
      console.error("Points verification failed:", err);
      setGenerationError("额度校验失败，请稍后重试。");
      return;
    }

    setIsGeneratingScene(true);
    setGenerationProgress(0);
    setGeneratedSceneUrl(null);

    const messages = [
      "正在提取房间空间三维设计美学结构...",
      "正在解析场景色调分布与光源环境...",
      "正在将落地灯置入场景空间模型中...",
      "正在匹配落地灯与房间材质、色调调和度...",
      "正在渲染真实的灯具高保真融合预览...",
      "融合完成！正在进入实时智能试摆工作室..."
    ];

    setGenerationText(messages[0]);

    let currentProgress = 0;
    let apiCompleted = false;
    let apiResultUrl: string | null = null;
    let apiErrorMsg: string | null = null;

    // Trigger the backend API call asynchronously
    const runGeneration = async () => {
      try {
        const bgUrl = getSceneBackground();
        const lampUrl = getLampPreview();

        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gemini-3.1-flash-lite-image",
            payload: {
              task: "generate-scene",
              roomAnalysis,
              lampAnalysis,
              params,
              roomImage: bgUrl,
              lampImage: lampUrl,
            }
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "人工智能空间融合生成失败");
        }

        const data = await res.json();
        const base64Image = data.image; // "data:image/png;base64,..."

        // 2. Consume points (3rd endpoint: consume)
        const consumeRes = await fetch("/api/tool/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, toolId })
        });
        const consumeData = await consumeRes.json();
        
        if (!consumeRes.ok || !consumeData.success) {
          throw new Error(consumeData.message || "额度扣除失败，请重试。");
        }

        // Refresh user points display
        fetchLaunchInfo(userId, toolId);

        // 3. Upload generated image to SaaS OSS (4th endpoint: direct-token + upload + commit)
        try {
          const blob = base64ToBlob(base64Image, "image/png");
          
          // Request upload token
          const tokenRes = await fetch("/api/upload/direct-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              toolId,
              source: "result",
              fileName: `result_${Date.now()}.png`,
              mimeType: "image/png",
              fileSize: blob.size
            })
          });

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            if (tokenData.success) {
              // PUT image directly to Aliyun OSS via proxy upload URL
              const uploadRes = await fetch(tokenData.uploadUrl, {
                method: tokenData.method || "PUT",
                headers: tokenData.headers || { "Content-Type": "image/png" },
                body: blob
              });

              if (uploadRes.ok) {
                // Commit the uploaded image to the database
                const commitRes = await fetch("/api/upload/commit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId,
                    toolId,
                    source: "result",
                    objectKey: tokenData.objectKey,
                    fileSize: blob.size
                  })
                });

                const commitData = await commitRes.json();
                if (commitRes.ok && commitData.success && commitData.savedToRecords) {
                  console.log("Result image uploaded and committed successfully:", commitData.url);
                  apiResultUrl = commitData.url || base64Image;
                } else {
                  apiResultUrl = base64Image;
                }
              } else {
                console.error("OSS Upload failed. Falling back to local base64.");
                apiResultUrl = base64Image;
              }
            } else {
              apiResultUrl = base64Image;
            }
          } else {
            apiResultUrl = base64Image;
          }
        } catch (uploadErr) {
          console.error("Error uploading image to Aliyun OSS:", uploadErr);
          apiResultUrl = base64Image; // Fallback to base64 if upload fails
        }

      } catch (err: any) {
        console.error("Error generating scene:", err);
        apiErrorMsg = err.message || "由于服务端处理超时或异常，人工智能空间融合未成功。";
      } finally {
        apiCompleted = true;
      }
    };

    runGeneration();

    const interval = setInterval(() => {
      // Progress increments slower if API is still running and we're nearing 90%
      const increment = currentProgress >= 85 && !apiCompleted ? 1 : Math.floor(Math.random() * 12) + 8;
      currentProgress = Math.min(95, currentProgress + increment);
      setGenerationProgress(currentProgress);
      
      const msgIndex = Math.min(
        Math.floor((currentProgress / 100) * messages.length),
        messages.length - 1
      );
      setGenerationText(messages[msgIndex]);

      if (apiCompleted) {
        clearInterval(interval);
        setGenerationProgress(100);
        setGenerationText(messages[messages.length - 1]);

        setTimeout(() => {
          setIsGeneratingScene(false);
          if (apiErrorMsg) {
            setGenerationError(apiErrorMsg);
            // Stay at Step 3 to show the error message clearly
          } else if (apiResultUrl) {
            if (generatedSceneUrl && !generationHistory.includes(generatedSceneUrl)) {
              setGenerationHistory(prev => [generatedSceneUrl, ...prev]);
            }
            setGeneratedSceneUrl(apiResultUrl);
            setStep(4);
          }
        }, 800);
      }
    }, 200);
  };

  // Export fully synthesized image directly from the generated AI scene
  const handleExportResult = (url?: string | React.MouseEvent) => {
    const targetUrl = typeof url === 'string' ? url : (previewImageUrl || generatedSceneUrl);
    if (!targetUrl) return;

    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = targetUrl;
    img.onload = () => {
      exportCanvas.width = img.width;
      exportCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = exportCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `落地灯空间智能无缝融合效果图_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        // Fallback to opening in new window if canvas export gets CORS blocked
        window.open(targetUrl, "_blank");
      }
    };
  };

  // Get current active scene background preview
  const getSceneBackground = () => {
    if (uploadedRoomBase64) return uploadedRoomBase64;
    if (selectedVirtualRoom) {
      if (params.viewType === "close" && selectedVirtualRoom.imageUrlClose) {
        return selectedVirtualRoom.imageUrlClose;
      }
      if (params.viewType === "mid" && selectedVirtualRoom.imageUrlMid) {
        return selectedVirtualRoom.imageUrlMid;
      }
      if (params.viewType === "far" && selectedVirtualRoom.imageUrlFar) {
        return selectedVirtualRoom.imageUrlFar;
      }
      return selectedVirtualRoom.imageUrl;
    }
    return null;
  };

  // Get current active lamp preview
  const getLampPreview = () => {
    if (uploadedLampBase64) return uploadedLampBase64;
    if (selectedPresetLamp) return selectedPresetLamp.imageUrl;
    return null;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FAF9F5] text-[#2C2623] font-sans antialiased selection:bg-[#E5DCC5] selection:text-[#2C2623] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#EBE8DF] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3" id="app-logo">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#967C55] to-[#D4C2A3] flex items-center justify-center text-white shadow-sm">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-extrabold tracking-tight text-[#1C1715]">落地灯智能试摆助手</h1>
            <p className="text-[9px] text-[#8C8375] uppercase tracking-wider font-semibold">专业落地灯智能光影试摆工作室 二点五版本</p>
          </div>
        </div>

        {/* Dynamic Stepper / Agent Status / Switcher Integrated directly into Header */}
        {appMode !== "select" ? (
          <div className="flex items-center gap-2.5">
            {/* 返回按钮 */}
            <button
              onClick={() => setAppMode("select")}
              className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#EBE8DF] text-[11px] font-bold text-[#7A7061] hover:text-[#1C1715] hover:bg-[#F2EFE9] transition-all flex items-center space-x-1 shadow-sm hover:border-[#967C55]/40"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[#967C55]" />
              <span className="hidden md:inline">返回主页</span>
            </button>

            {/* Switcher */}
            <div className="bg-[#EBE8DF]/40 p-1 rounded-xl flex items-center gap-0.5 border border-[#EBE8DF]/60 shadow-inner">
              <button
                onClick={() => setAppMode("agent")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  appMode === "agent" 
                    ? "bg-[#967C55] text-white shadow-sm" 
                    : "text-[#7A7061] hover:text-[#1C1715]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>智能体模式</span>
              </button>
              <button
                onClick={() => setAppMode("expert")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  appMode === "expert" 
                    ? "bg-[#967C55] text-white shadow-sm" 
                    : "text-[#7A7061] hover:text-[#1C1715]"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>专家模式</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center space-x-2 bg-[#F2EFE9] border border-[#E4DFD5] px-3.5 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-[#7A7061]">请先选择体验模式</span>
          </div>
        )}

        {/* Credit Badge */}
        <div className="flex items-center space-x-2 bg-[#F2EFE9] border border-[#E4DFD5] px-3 py-1.5 rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-[#967C55]" />
          <span className="text-xs font-semibold text-[#665D4F]" id="credit-display">
            {userIntegral !== null 
              ? `${userInfo?.name || "用户"} | 额度: ${userIntegral}`
              : "高级设计智囊"}
          </span>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col min-h-0 ${appMode === "select" ? "overflow-y-auto" : "overflow-hidden"}`}>
        
        {appMode === "select" ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto py-12 px-4 text-center"
          >
            {/* Title & Subtitle */}
            <h2 className="text-3xl md:text-4xl font-black text-[#1C1715] tracking-tight mb-4">
              开启您的 AI 极速试铺之旅
            </h2>
            <p className="text-sm text-[#7A7061] max-w-2xl mx-auto leading-relaxed mb-12">
              无论您是希望得到贴心的智能设计助理引导，还是渴望在全功能的专业面板上精细调校，我们都为您提供了专属的使用方案。
            </p>

            {/* Grid of Choices */}
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Agent Mode Card */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-white border border-[#EBE8DF] rounded-3xl p-8 text-left shadow-sm hover:shadow-xl hover:border-[#967C55]/40 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Decorative Background Blob */}
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#967C55]/5 rounded-full blur-2xl group-hover:bg-[#967C55]/10 transition-colors" />

                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#967C55]/10 text-[#967C55] flex items-center justify-center mb-6 border border-[#967C55]/10">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  
                  <div className="flex items-center space-x-2.5 mb-3.5">
                    <h3 className="text-lg font-black text-[#1C1715]">智能体模式</h3>
                    <span className="bg-[#EBE8DF] text-[#7A7061] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      推荐新手
                    </span>
                  </div>

                  <p className="text-xs text-[#7A7061] leading-relaxed mb-8">
                    对话式交互，像和专业软装设计师聊天一样。AI 将一步步引导您选择房间场景、提取材质特征、全景光影拟合、直接在聊天框内返回生图效果。
                  </p>
                </div>

                <button
                  onClick={() => setAppMode("agent")}
                  className="w-full py-3.5 bg-[#967C55] hover:bg-[#836C47] text-white rounded-2xl text-xs font-black transition-colors flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>开启智能对话引导</span>
                </button>
              </motion.div>

              {/* Expert Mode Card */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-white border border-[#EBE8DF] rounded-3xl p-8 text-left shadow-sm hover:shadow-xl hover:border-[#967C55]/40 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Decorative Background Blob */}
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#8C8375]/5 rounded-full blur-2xl group-hover:bg-[#8C8375]/10 transition-colors" />

                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#F2EFE9] text-[#7A7061] flex items-center justify-center mb-6 border border-[#E4DFD5]">
                    <Sliders className="w-6 h-6" />
                  </div>
                  
                  <div className="flex items-center space-x-2.5 mb-3.5">
                    <h3 className="text-lg font-black text-[#1C1715]">专家工作台</h3>
                    <span className="bg-[#967C55]/10 text-[#967C55] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      高阶微调
                    </span>
                  </div>

                  <p className="text-xs text-[#7A7061] leading-relaxed mb-8">
                    经典分步流程。提供高可控性的光影/漫反射/比例匹配/人模参数调节，支持多图层切换对比、局部放大及原图下载。
                  </p>
                </div>

                <button
                  onClick={() => setAppMode("expert")}
                  className="w-full py-3.5 bg-white hover:bg-[#FAF9F5] text-[#2C2623] border border-[#EBE8DF] hover:border-[#967C55]/50 rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-[#967C55]" />
                  <span>进入工程师工作台</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <>
            {appMode === "agent" ? (
          <AgentMode
            userId={userId}
            toolId={toolId}
            userIntegral={userIntegral}
            toolRequiredIntegral={toolRequiredIntegral}
            userInfo={userInfo}
            fetchLaunchInfo={fetchLaunchInfo}
            selectedVirtualRoom={selectedVirtualRoom}
            setSelectedVirtualRoom={setSelectedVirtualRoom}
            uploadedRoomBase64={uploadedRoomBase64}
            setUploadedRoomBase64={setUploadedRoomBase64}
            roomAnalysis={roomAnalysis}
            setRoomAnalysis={setRoomAnalysis}
            isRoomAnalyzing={isRoomAnalyzing}
            setIsRoomAnalyzing={setIsRoomAnalyzing}
            selectedPresetLamp={selectedPresetLamp}
            setSelectedPresetLamp={setSelectedPresetLamp}
            uploadedLampBase64={uploadedLampBase64}
            setUploadedLampBase64={setUploadedLampBase64}
            lampAnalysis={lampAnalysis}
            setLampAnalysis={setLampAnalysis}
            isLampAnalyzing={isLampAnalyzing}
            setIsLampAnalyzing={setIsLampAnalyzing}
            params={params}
            setParams={setParams}
            generatedSceneUrl={generatedSceneUrl}
            setGeneratedSceneUrl={setGeneratedSceneUrl}
            generationHistory={generationHistory}
            setGenerationHistory={setGenerationHistory}
          />
        ) : (
          <div className="flex flex-col flex-1 overflow-y-auto min-h-0 pr-1 pb-4 scrollbar-thin scrollbar-thumb-gray-200">
            {/* Expert Mode Stepper Indicator */}
            <div className="shrink-0 flex items-center justify-center space-x-2 md:space-x-4 text-xs font-semibold mb-4 pb-2 border-b border-[#EBE8DF]/60 max-w-2xl mx-auto">
              {[
                { num: 1, label: "场景分析" },
                { num: 2, label: "灯具匹配" },
                { num: 3, label: "生成参数" },
                { num: 4, label: "试摆预览" }
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#C4BDB0]" />}
                  <div className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border transition-all duration-300 ${
                    step === s.num 
                      ? "bg-[#967C55] text-white border-[#967C55] shadow-sm font-extrabold" 
                      : step > s.num 
                        ? "bg-white text-[#967C55] border-[#967C55]/30 font-bold" 
                        : "bg-[#FAF9F5]/40 text-[#8C8375] border-[#EBE8DF]"
                  }`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === s.num 
                        ? "bg-white/20 text-white" 
                        : step > s.num 
                          ? "bg-[#967C55]/10 text-[#967C55]" 
                          : "bg-[#EBE8DF] text-[#8C8375]"
                    }`}>{s.num}</span>
                    <span className="text-[11px]">{s.label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Upload or Choose Scene */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 min-h-0 space-y-3"
          >
            <div className="shrink-0 text-center space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-[#967C55] uppercase">第一步 / 共四步</span>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#1C1715]">第 1 步：选择或上传场景</h2>
              <p className="text-xs text-[#7A7061] max-w-xl mx-auto">
                人工智能专家模型将根据您上传的房间照片或所选风格进行高精度空间布局与光影关系分析
              </p>
            </div>

            {/* Toggle Modes */}
            <div className="shrink-0 flex justify-center">
              <div className="bg-[#EBE8DF] p-1 rounded-2xl inline-flex shadow-inner">
                <button
                  id="tab-upload-room"
                  onClick={() => setSceneMode("upload")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${sceneMode === "upload" ? "bg-white text-[#1C1715] shadow-sm" : "text-[#7A7061] hover:text-[#1C1715]"}`}
                >
                  <Upload className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                  上传房间照片
                </button>
                <button
                  id="tab-virtual-room"
                  onClick={() => setSceneMode("virtual")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${sceneMode === "virtual" ? "bg-white text-[#1C1715] shadow-sm" : "text-[#7A7061] hover:text-[#1C1715]"}`}
                >
                  <Grid className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                  选择虚拟房间
                </button>
              </div>
            </div>

            {/* Render Scene Selector and Analysis Split */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              
              {/* Left Selector Area */}
              <div className="lg:col-span-7 h-full flex flex-col min-h-0">
                {sceneMode === "upload" ? (
                  <div className="bg-white rounded-3xl border-2 border-dashed border-[#D6CFC1] hover:border-[#967C55] p-4 transition-colors flex flex-col items-center justify-center flex-1 min-h-0 relative overflow-hidden group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleRoomUpload}
                      onClick={(e) => (e.target as HTMLInputElement).value = ''}
                      className="absolute inset-0 opacity-0 cursor-pointer z-30"
                      id="room-upload-input"
                      disabled={isRoomAnalyzing}
                    />
                    
                    {uploadedRoomBase64 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF9F5] p-2 overflow-hidden">
                        <div className="absolute inset-0 z-0">
                          <img 
                            src={uploadedRoomBase64} 
                            alt="" 
                            className="w-full h-full object-cover opacity-40 blur-xl scale-110"
                          />
                        </div>
                        <img 
                          src={uploadedRoomBase64} 
                          alt="Uploaded Room" 
                          className="w-full h-full object-contain rounded-2xl relative z-10 shadow-sm"
                        />
                        {!isRoomAnalyzing && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl m-2 z-20">
                            <div className="bg-white/95 text-[#2C2623] px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2">
                              <Upload className="w-4 h-4" />
                              <span>更换新照片</span>
                            </div>
                          </div>
                        )}
                        {isRoomAnalyzing && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-2xl m-2 z-20 backdrop-blur-sm space-y-5">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white animate-pulse">
                                <Sparkles className="w-7 h-7" />
                              </div>
                              <Loader2 className="w-18 h-18 text-white animate-spin absolute -top-1 -left-1" />
                            </div>
                            <div className="space-y-1.5 text-center">
                              <h4 className="text-base font-bold text-white shadow-sm">人工智能室内空间智能深度分析中</h4>
                              <p className="text-xs text-white/80 max-w-xs drop-shadow">我们正在精准识别房间风格、大型家具布局、主导色调分布并制定黄金试摆机位建议...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center space-y-4 pointer-events-none">
                        <div className="w-16 h-16 rounded-2xl bg-[#FAF9F5] border border-[#EBE8DF] flex items-center justify-center mx-auto text-[#967C55] group-hover:scale-110 transition-transform">
                          <Sparkles className={`w-7 h-7 ${isRoomAnalyzing ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-[#2C2623]">{isRoomAnalyzing ? "分析中..." : "点击或拖拽上传房间场景图"}</p>
                          <p className="text-xs text-[#8C8375] mt-1.5">{isRoomAnalyzing ? "请稍候" : "支持常见图片格式（如 JPG, PNG, WebP），最大支持 20MB"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
                    {VIRTUAL_ROOMS.map((room) => (
                      <div
                        key={room.id}
                        id={`virtual-room-card-${room.id}`}
                        onClick={() => handleSelectVirtualRoom(room)}
                        className={`group relative rounded-3xl overflow-hidden cursor-pointer border-2 transition-all duration-300 p-4 flex flex-col ${selectedVirtualRoom?.id === room.id ? "bg-white border-[#967C55] ring-4 ring-[#967C55]/10 shadow-sm" : "bg-white border-[#EBE8DF] hover:border-[#967C55]/60 hover:shadow-md"}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${selectedVirtualRoom?.id === room.id ? "bg-[#967C55]/10 text-[#967C55]" : "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-[#1C1715] mb-1">{room.name}</h4>
                        <p className="text-[10px] text-[#8C8375] leading-relaxed flex-1 line-clamp-2">{room.style}</p>
                        
                        {selectedVirtualRoom?.id === room.id && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#967C55] text-white flex items-center justify-center shadow-lg">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Analysis Dashboard Area */}
              <div className="lg:col-span-5 h-full flex flex-col min-h-0">
                {roomAnalysis ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl border border-[#EBE8DF] p-4 space-y-3 shadow-sm flex-1 min-h-0 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between border-b border-[#FAF9F5] pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-xl bg-[#FAF9F5] border border-[#EBE8DF] text-[#967C55]">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-[#1C1715]">场景解析报告</h3>
                      </div>
                    </div>

                    {/* Room Style */}
                    <div className="bg-[#FAF9F5] border border-[#EBE8DF] rounded-2xl p-3 space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#967C55]">
                        <Compass className="w-3.5 h-3.5" />
                        <span>设计风格</span>
                      </div>
                      <p className="text-xs font-bold text-[#2C2623]">{roomAnalysis.style}</p>
                    </div>
                    
                    {/* Furniture & Colors */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-[#8C8375]">主要物件</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {roomAnalysis.furniture.slice(0,4).map((m: string, i: number) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#EBE8DF] text-[#665D4F] font-bold line-clamp-1">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-[#8C8375]">主要色彩</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {roomAnalysis.colors.slice(0,3).map((c: string, i: number) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#EBE8DF] text-[#665D4F] font-bold line-clamp-1">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Placement recommendation */}
                    <div className="border-t border-[#FAF9F5] pt-2 space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#967C55]">
                        <Sparkles className="w-3 h-3" />
                        <span>摆放机位建议</span>
                      </div>
                      <p className="text-[10px] text-[#665D4F] leading-relaxed bg-[#FAF9F5] border border-[#EBE8DF] p-2 rounded-xl">{roomAnalysis.recommendation}</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-3xl border border-[#EBE8DF] p-4 flex flex-col items-center justify-center flex-1 min-h-0 text-center space-y-2 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-[#FAF9F5] border border-[#EBE8DF] flex items-center justify-center text-[#8C8375]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-[#2C2623]">等待上传场景</h4>
                      <p className="text-[10px] text-[#8C8375] max-w-[200px]">上传照片以生成智能布局分析</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error state */}
            {roomError && (
              <div className="shrink-0 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{roomError}</span>
              </div>
            )}

            {/* Next buttons */}
            <div className="shrink-0 flex justify-end pt-2">
              <button
                id="btn-goto-step-2"
                disabled={!roomAnalysis}
                onClick={() => setStep(2)}
                className={`px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-sm transition-all ${roomAnalysis ? "bg-[#967C55] text-white hover:bg-[#836C47] cursor-pointer" : "bg-[#FAF9F5] border border-[#EBE8DF] text-[#C4BDB0] cursor-not-allowed"}`}
              >
                <span>下一步：选择灯具</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Upload Lamp */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 min-h-0 space-y-3"
          >
            <div className="shrink-0 text-center space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-[#967C55] uppercase">第二步 / 共四步</span>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#1C1715]">第 2 步：上传落地灯图片</h2>
              <p className="text-xs text-[#7A7061] max-w-xl mx-auto">
                上传需要试摆的灯具照片，模型将识别材质出光方向并自动计算摆放参数
              </p>
            </div>

            {/* Selector Area */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              
              {/* Left Upload Area */}
              <div className="lg:col-span-7 h-full flex flex-col min-h-0">
                <div className="bg-white rounded-3xl border-2 border-dashed border-[#D6CFC1] hover:border-[#967C55] p-4 transition-colors flex flex-col items-center justify-center flex-1 min-h-0 relative overflow-hidden group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLampUpload}
                    onClick={(e) => (e.target as HTMLInputElement).value = ''}
                    className="absolute inset-0 opacity-0 cursor-pointer z-30"
                    id="lamp-upload-input"
                    disabled={isLampAnalyzing}
                  />
                  
                  {uploadedLampBase64 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF9F5] p-6 overflow-hidden">
                      <div className="absolute inset-0 z-0">
                        <img 
                          src={uploadedLampBase64} 
                          alt="" 
                          className="w-full h-full object-cover opacity-40 blur-xl scale-110"
                        />
                      </div>
                      <img 
                        src={uploadedLampBase64} 
                        alt="Uploaded Lamp" 
                        className="max-w-full max-h-full object-contain relative z-10 shadow-sm"
                      />
                      {!isLampAnalyzing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <div className="bg-white/95 text-[#2C2623] px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2">
                            <Upload className="w-4 h-4" />
                            <span>更换新灯具</span>
                          </div>
                        </div>
                      )}
                      {isLampAnalyzing && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 backdrop-blur-sm space-y-5">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white animate-pulse">
                              <Lightbulb className="w-7 h-7" />
                            </div>
                            <Loader2 className="w-18 h-18 text-white animate-spin absolute -top-1 -left-1" />
                          </div>
                          <div className="space-y-1.5 text-center">
                            <h4 className="text-base font-bold text-white shadow-sm">人工智能灯光与材质模型深度解析中</h4>
                            <p className="text-xs text-white/80 max-w-xs drop-shadow">我们正在识别灯身材质骨架、光学透镜路径、默认适温，并计算睡前治愈度评级指数...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-4 pointer-events-none">
                      <div className="w-16 h-16 rounded-2xl bg-[#FAF9F5] border border-[#EBE8DF] flex items-center justify-center mx-auto text-[#967C55] group-hover:scale-110 transition-transform">
                        <Lightbulb className={`w-7 h-7 ${isLampAnalyzing ? 'animate-pulse' : ''}`} />
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#2C2623]">{isLampAnalyzing ? "分析中..." : "点击或拖拽上传落地灯背景图"}</p>
                        <p className="text-xs text-[#8C8375] mt-1.5">{isLampAnalyzing ? "请稍候" : "支持常见图片格式（如 JPG, PNG, WebP），最大支持 20MB"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Analysis Dashboard Area */}
              <div className="lg:col-span-5 h-full flex flex-col min-h-0">
                {lampAnalysis ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl border border-[#EBE8DF] p-4 space-y-3 shadow-sm flex-1 min-h-0 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between border-b border-[#FAF9F5] pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-xl bg-[#FAF9F5] border border-[#EBE8DF] text-[#967C55]">
                          <Lightbulb className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-[#1C1715]">灯具产品解析</h3>
                      </div>
                    </div>

                    {/* Lamp Style */}
                    <div className="bg-[#FAF9F5] border border-[#EBE8DF] rounded-2xl p-3 space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#967C55]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>灯具风格归类</span>
                      </div>
                      <p className="text-xs font-bold text-[#2C2623]">{lampAnalysis.style}</p>
                    </div>

                    {/* Cozy Dial (Radial Indicator approximation) */}
                    <div className="flex items-center justify-between bg-[#FAF9F5] border border-[#EBE8DF] p-3 rounded-2xl">
                      <div>
                        <span className="text-[10px] font-semibold text-[#8C8375]">居家氛围治愈指数</span>
                        <p className="text-[9px] text-[#665D4F] mt-0.5 font-medium">评分越高代表夜间治愈感越好</p>
                      </div>
                      <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 rounded-full bg-white border border-[#EBE8DF]">
                        <span className="text-lg font-black text-[#967C55]">{lampAnalysis.cozyIndex}</span>
                      </div>
                    </div>

                    {/* Materials & Color */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-[#8C8375]">主体骨架材质</span>
                        <div className="flex flex-wrap gap-1">
                          {lampAnalysis.materials.map((m, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#EBE8DF] text-[#665D4F] font-bold">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-[#8C8375]">主要色彩配色</span>
                        <p className="text-xs text-[#2C2623] font-bold mt-1">{lampAnalysis.color}</p>
                      </div>
                    </div>

                    {/* Light type */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[#8C8375]">出光方向与光路</span>
                      <p className="text-xs text-[#2C2623] font-medium">{lampAnalysis.lightType}</p>
                    </div>

                    {/* Recommend light temperature */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[#8C8375]">推荐搭配色温</span>
                      <p className="text-xs text-[#967C55] font-bold">{lampAnalysis.lightWarmth}</p>
                    </div>

                    {/* Placement recommendation */}
                    <div className="border-t border-[#FAF9F5] pt-2 space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#967C55]">
                        <Compass className="w-3 h-3" />
                        <span>光影摆放贴士</span>
                      </div>
                      <p className="text-[10px] text-[#665D4F] leading-relaxed bg-[#FAF9F5] border border-[#EBE8DF] p-2 rounded-xl">{lampAnalysis.placementTip}</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-3xl border border-[#EBE8DF] p-4 flex flex-col items-center justify-center flex-1 min-h-0 text-center space-y-2 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-[#FAF9F5] border border-[#EBE8DF] flex items-center justify-center text-[#8C8375]">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-[#2C2623]">等待上传灯具</h4>
                      <p className="text-[10px] text-[#8C8375] max-w-[200px]">上传照片以生成智能分析报告</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error state */}
            {lampError && (
              <div className="shrink-0 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{lampError}</span>
              </div>
            )}

            {/* Back & Next actions */}
            <div className="shrink-0 flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-[#EBE8DF] rounded-xl text-xs font-bold flex items-center space-x-1.5 text-[#7A7061] hover:bg-[#FAF9F5] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>更换场景</span>
              </button>

              <button
                id="btn-goto-step-3"
                disabled={!lampAnalysis}
                onClick={() => setStep(3)}
                className={`px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-sm transition-all ${lampAnalysis ? "bg-[#967C55] text-white hover:bg-[#836C47] cursor-pointer" : "bg-[#FAF9F5] border border-[#EBE8DF] text-[#C4BDB0] cursor-not-allowed"}`}
              >
                <span>下一步：选择参数</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Choose Generation Parameters */}
        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 min-h-0 space-y-3 max-w-4xl mx-auto w-full"
          >
            <div className="shrink-0 text-center space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-[#967C55] uppercase">第三步 / 共四步</span>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#1C1715]">配置试摆生成参数</h2>
              <p className="text-xs text-[#7A7061] max-w-xl mx-auto">
                选择场景视角、清晰度、画面比例以及是否需要模特，系统将为您渲染生成物理光照场景。
              </p>
            </div>

            {/* High-fidelity Parameter selector (Reference Image 2) */}
            <div className="flex-1 min-h-0 bg-[#FAF9F5] border border-[#E9E4D9] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm overflow-y-auto">
              
              {/* Parameter 1: Perspective (场景图) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-extrabold text-[#2C2623]">场景视角</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "far", name: "远景图", desc: "展示整个房间全景" },
                    { id: "mid", name: "中近景", desc: "聚焦沙发与拐角" },
                    { id: "close", name: "近景", desc: "细部特写" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setParams({ ...params, viewType: opt.id as any })}
                      className={`px-4 py-2.5 rounded-2xl border text-left transition-all max-w-[180px] flex-1 ${params.viewType === opt.id ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm" : "bg-white/40 border-[#EBE8DF] hover:border-[#967C55]/50"}`}
                    >
                      <p className="text-xs font-extrabold text-[#2C2623]">{opt.name}</p>
                      <p className="text-[9px] text-[#8C8375] mt-0.5 leading-snug">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 4: Ratio (比例) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-extrabold text-[#2C2623]">画布构图比例</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "4:3", name: "4:3", desc: "横构图" },
                    { id: "3:4", name: "3:4", desc: "竖构图" },
                    { id: "1:1", name: "1:1", desc: "正方形" },
                    { id: "16:9", name: "16:9", desc: "宽屏" },
                    { id: "9:16", name: "9:16", desc: "竖屏" }
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setParams({ ...params, ratio: r.id as any })}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-start gap-0.5 ${params.ratio === r.id ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061] hover:border-[#967C55]/50"}`}
                    >
                      <p className="font-extrabold">{r.name}</p>
                      <p className="text-[9px] font-medium opacity-70">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Parameter 3: Resolution (清晰度) */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold text-[#2C2623]">画面清晰度</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "1K", label: "1K" },
                      { id: "2K", label: "2K" },
                      { id: "4K", label: "4K" }
                    ].map((q) => (
                      <button
                        key={q.id}
                        onClick={() => setParams({ ...params, quality: q.id as any })}
                        className={`px-5 py-2.5 rounded-xl border text-xs font-black transition-all ${params.quality === q.id ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061] hover:border-[#967C55]/50"}`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parameter 5: Light State (开灯/关灯) */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold text-[#2C2623]">灯具状态</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setParams({ ...params, lightState: "on" })}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${params.lightState === "on" ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061] hover:border-[#967C55]/50"}`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>开灯 (漫反射)</span>
                    </button>
                    <button
                      onClick={() => setParams({ ...params, lightState: "off" })}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${params.lightState === "off" ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061] hover:border-[#967C55]/50"}`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>关灯 (自然光)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {isOutOfCredits && (
              <div className="shrink-0 bg-amber-50 border border-amber-200 text-[#7A5B35] rounded-xl p-4 text-xs font-bold flex items-start space-x-2.5 mt-2">
                <Info className="w-4 h-4 text-[#967C55] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-[13px] text-[#2C2623]">⚠️ 您的体验额度已用尽</p>
                  <p className="text-[#8C8375] text-[11px] font-medium leading-relaxed">
                    当前的体验额度余额不足（所需额度：{toolRequiredIntegral}），无法启动生成渲染。
                  </p>
                </div>
              </div>
            )}

            {generationError && (
              <div className="shrink-0 bg-red-50 border border-red-200 text-red-950 rounded-xl p-3 text-[10px] flex items-start space-x-2 mt-2">
                <Info className="w-3 h-3 text-red-700 shrink-0 mt-0.5" />
                <span className="font-medium">{generationError}</span>
              </div>
            )}

            {/* Back & Next actions */}
            <div className="shrink-0 flex justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-[#EBE8DF] rounded-xl text-xs font-bold flex items-center space-x-2 text-[#7A7061] hover:bg-[#FAF9F5] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>更换灯具</span>
              </button>

              <button
                id="btn-generate-scene"
                onClick={handleStartGeneration}
                disabled={isOutOfCredits}
                className={`px-6 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-md hover:shadow-lg transition-all ${
                  isOutOfCredits ? "bg-[#D6CFC1] cursor-not-allowed hover:shadow-none" : "bg-[#967C55] hover:bg-[#836C47]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>生成试摆效果</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Real-time Synthesis & Try-on Studio */}
        {step === 4 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Header controls inside Workspace */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#EBE8DF] pb-4 gap-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#967C55] uppercase">人工智能空间无缝融合</span>
                <h2 className="text-xl md:text-2xl font-black text-[#1C1715] mt-1">专属空间落地灯美学试摆间</h2>
                <p className="text-xs text-[#8C8375] mt-0.5">人工智能模型在您的专属空间重构落地灯光源，物理级渲染漫反射洗墙光晕。</p>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 bg-white border border-[#EBE8DF] rounded-xl text-xs font-bold text-[#7A7061] hover:bg-[#FAF9F5] transition-colors flex items-center space-x-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>返回修改参数</span>
                </button>

                <button
                  id="btn-export-scene"
                  onClick={handleExportResult}
                  className="px-5 py-2.5 bg-[#967C55] hover:bg-[#836C47] text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-sm"
                >
                  <Download className="w-4 h-4 text-amber-200" />
                  <span>导出试摆效果图</span>
                </button>
              </div>
            </div>

            {/* Visual Canvas Container */}
            <div className="flex flex-col items-center justify-center w-full space-y-4">
              
              {/* Left Column: Visual Canvas */}
              <div className="flex flex-col items-center w-full space-y-4">
                
                {/* Canvas view card with aspect ratios */}
                <div 
                  className="relative overflow-hidden rounded-3xl bg-[#1C1715] shadow-2xl border border-black/10 select-none w-full max-w-[620px] group cursor-pointer"
                  style={{
                    aspectRatio: params.ratio.replace(':', '/')
                  }}
                  onClick={() => {
                    if (generatedSceneUrl) {
                      setPreviewImageUrl(generatedSceneUrl);
                      setIsPreviewOpen(true);
                    }
                  }}
                >
                  {generatedSceneUrl ? (
                    /* AI Seamless Spatial Fusion View */
                    <>
                      <img 
                        src={generatedSceneUrl} 
                        alt="AI Seamless Spatial Fusion" 
                        className="absolute inset-0 w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-black/60 backdrop-blur-md rounded-full p-3 text-white flex items-center space-x-2">
                          <ZoomIn className="w-5 h-5" />
                          <span className="text-xs font-bold tracking-wider">点击放大预览</span>
                        </div>
                      </div>

                      {/* Label tag info */}
                      <div className="absolute bottom-4 left-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-[10px] font-bold tracking-wider uppercase space-x-1.5 flex items-center">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        <span>人工智能空间无缝融合模型</span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[#2C2623] flex items-center justify-center text-xs text-[#8C8375]">
                      未加载到试摆效果图
                    </div>
                  )}
                </div>

                {/* Quick Help */}
                <div className="mt-3.5 flex items-center space-x-2 text-xs text-[#8C8375] bg-[#F2EFE9] px-4 py-2 rounded-xl border border-[#E4DFD5] w-full max-w-[620px]">
                  <Info className="w-3.5 h-3.5 text-[#967C55] shrink-0" />
                  <span>先进人工智能多模态融合模型已将该落地灯完美、无缝地融合在您的房间中，高拟真度生成了匹配场景色调的折射光照、软阴影与反射。</span>
                </div>
              </div>

            </div>
          </motion.div>
        )}
          </div>
        )}
          </>
        )}

      </main>

      {/* High tech AI generating skeleton layout overlay */}
      <AnimatePresence>
        {isGeneratingScene && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#FAF9F5]/98 z-50 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="max-w-md space-y-6">
              <div className="relative mx-auto w-24 h-24">
                {/* Glowing rotating gears and sparkles */}
                <div className="absolute inset-0 rounded-3xl border border-[#967C55]/30 animate-spin-slow" />
                <div className="absolute inset-2 rounded-2xl border-2 border-dashed border-[#967C55]/60 animate-spin" style={{ animationDirection: 'reverse' }} />
                <div className="absolute inset-4 rounded-xl bg-[#967C55] flex items-center justify-center text-white shadow-xl">
                  <Sparkles className="w-8 h-8 text-amber-200 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-[#2C2623] tracking-tight">人工智能高精度光影融和渲染中</h3>
                <p className="text-xs text-[#8C8375] font-medium animate-pulse">{generationText}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 pt-2">
                <div className="w-64 h-2 bg-[#EBE8DF] rounded-full overflow-hidden mx-auto">
                  <div 
                    className="h-full bg-gradient-to-r from-[#967C55] to-[#D4C2A3] rounded-full transition-all duration-100"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-[#967C55] uppercase tracking-widest">{generationProgress}% 已完成</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPreviewOpen && (previewImageUrl || generatedSceneUrl) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 sm:p-8"
            onClick={() => setIsPreviewOpen(false)}
          >
            <button 
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={previewImageUrl || generatedSceneUrl || undefined} 
              alt="Enlarged Preview" 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Download Button in Modal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExportResult(previewImageUrl || generatedSceneUrl || undefined);
              }}
              className="absolute bottom-6 p-3 px-6 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center space-x-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>下载图片</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating History Gallery (Bottom Left) */}
      <AnimatePresence>
        {generationHistory.length > 0 && step === 4 && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed bottom-6 left-6 z-40 flex flex-row gap-3 max-w-[50vw] overflow-x-auto p-2"
          >
            {generationHistory.map((url, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setPreviewImageUrl(url);
                  setIsPreviewOpen(true);
                }}
                className="relative shrink-0 group w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg cursor-pointer transition-all hover:scale-105 hover:border-[#967C55] hover:shadow-xl bg-black/10 backdrop-blur-sm"
              >
                <img src={url} alt={`History ${idx}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="shrink-0 border-t border-[#EBE8DF] py-2 text-center text-[10px] text-[#8C8375] space-y-0.5 bg-white/60">
        <p>© 2026 智能落地灯光影试摆设计工作室. 保留所有权利。</p>
        <p className="text-[9px] uppercase tracking-widest font-bold text-[#C4BDB0]">设计精度: 100% | 智能渲染引擎: 二点五版本</p>
      </footer>
    </div>
  );
}
