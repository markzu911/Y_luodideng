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

export default function App() {
  // Current step state: 1, 2, 3, 4
  const [step, setStep] = useState<number>(1);

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
    needModel: false,
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
  const handleRoomUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      setUploadedRoomBase64(base64String);
      setSelectedVirtualRoom(null);
      setRoomAnalysis(null);
      setRoomError(null);
      
      // Call Room Analysis API
      setIsRoomAnalyzing(true);
      try {
        // Strip out metadata prefix (e.g., "data:image/jpeg;base64,") for API call
        const pureBase64 = base64String.split(",")[1];
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            payload: {
              task: "analyze-room",
              image: pureBase64,
              mimeType: file.type
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
    reader.readAsDataURL(file);
  };

  // Handle Lamp Photo upload
  const handleLampUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      setUploadedLampBase64(base64String);
      setSelectedPresetLamp(null);
      setLampAnalysis(null);
      setLampError(null);

      // Call Lamp Analysis API
      setIsLampAnalyzing(true);
      try {
        const pureBase64 = base64String.split(",")[1];
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            payload: {
              task: "analyze-lamp",
              image: pureBase64,
              mimeType: file.type
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
    reader.readAsDataURL(file);
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
        const errorMsg = verifyData.message || "您的积分不足，无法启动生成。";
        setGenerationError(errorMsg);
        return;
      }
    } catch (err: any) {
      console.error("Points verification failed:", err);
      setGenerationError("积分校验失败，请稍后重试。");
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
          throw new Error(consumeData.message || "积分扣除失败，请重试。");
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
    <div className="min-h-screen bg-[#FAF9F5] text-[#2C2623] font-sans antialiased selection:bg-[#E5DCC5] selection:text-[#2C2623]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#EBE8DF] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3" id="app-logo">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#967C55] to-[#D4C2A3] flex items-center justify-center text-white shadow-sm">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#1C1715]">落地灯智能试摆助手</h1>
            <p className="text-[10px] text-[#8C8375] uppercase tracking-wider font-medium">专业落地灯智能光影试摆工作室 二点五版本</p>
          </div>
        </div>

        {/* Dynamic Stepper */}
        <div className="hidden lg:flex items-center space-x-2.5 text-xs font-semibold">
          {[
            { num: 1, label: "场景分析" },
            { num: 2, label: "灯具匹配" },
            { num: 3, label: "生成参数" },
            { num: 4, label: "试摆预览" }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#C4BDB0]" />}
              <div className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border transition-all duration-300 ${
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
                <span>{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Credit Badge */}
        <div className="flex items-center space-x-2 bg-[#F2EFE9] border border-[#E4DFD5] px-3 py-1.5 rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-[#967C55]" />
          <span className="text-xs font-semibold text-[#665D4F]" id="credit-display">
            {userIntegral !== null 
              ? `${userInfo?.name || "用户"} | 积分: ${userIntegral}`
              : "高级设计智囊"}
          </span>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        
        {/* Step 1: Upload or Choose Scene */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold tracking-widest text-[#967C55] uppercase">第一步 / 共四步</span>
              <h2 className="text-2xl md:text-3.5xl font-extrabold tracking-tight text-[#1C1715]">第 1 步：选择或上传场景</h2>
              <p className="text-sm text-[#7A7061] max-w-xl mx-auto">
                人工智能专家模型将根据您上传的房间照片或所选风格进行高精度空间布局与光影关系分析
              </p>
            </div>

            {/* Toggle Modes */}
            <div className="flex justify-center">
              <div className="bg-[#EBE8DF] p-1 rounded-2xl inline-flex shadow-inner">
                <button
                  id="tab-upload-room"
                  onClick={() => setSceneMode("upload")}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${sceneMode === "upload" ? "bg-white text-[#1C1715] shadow-sm" : "text-[#7A7061] hover:text-[#1C1715]"}`}
                >
                  <Upload className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                  上传房间照片
                </button>
                <button
                  id="tab-virtual-room"
                  onClick={() => setSceneMode("virtual")}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${sceneMode === "virtual" ? "bg-white text-[#1C1715] shadow-sm" : "text-[#7A7061] hover:text-[#1C1715]"}`}
                >
                  <Grid className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                  选择虚拟房间
                </button>
              </div>
            </div>

            {/* Render Scene Selector and Analysis Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Selector Area */}
              <div className="lg:col-span-7 h-full flex flex-col">
                {sceneMode === "upload" ? (
                  <div className="bg-white rounded-3xl border-2 border-dashed border-[#D6CFC1] hover:border-[#967C55] p-8 transition-colors flex flex-col items-center justify-center flex-1 min-h-[340px] relative overflow-hidden group">
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
                          <p className="text-xs text-[#8C8375] mt-1.5">{isRoomAnalyzing ? "请稍候" : "支持常见图片格式，推荐沙发或墙角等试摆全景"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {VIRTUAL_ROOMS.map((room) => (
                      <div
                        key={room.id}
                        id={`virtual-room-card-${room.id}`}
                        onClick={() => handleSelectVirtualRoom(room)}
                        className={`group relative rounded-3xl overflow-hidden cursor-pointer border-2 transition-all duration-300 p-6 flex flex-col ${selectedVirtualRoom?.id === room.id ? "bg-white border-[#967C55] ring-4 ring-[#967C55]/10 shadow-sm" : "bg-white border-[#EBE8DF] hover:border-[#967C55]/60 hover:shadow-md"}`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedVirtualRoom?.id === room.id ? "bg-[#967C55]/10 text-[#967C55]" : "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-[#1C1715] mb-2">{room.name}</h4>
                        <p className="text-xs text-[#8C8375] leading-relaxed flex-1">{room.style}</p>
                        
                        {selectedVirtualRoom?.id === room.id && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#967C55] text-white flex items-center justify-center shadow-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Analysis Dashboard Area */}
              <div className="lg:col-span-5 h-full flex flex-col">
                {roomAnalysis ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl border border-[#EBE8DF] p-6 space-y-5 shadow-sm flex-1"
                  >
                    <div className="flex items-center justify-between border-b border-[#FAF9F5] pb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-[#FAF9F5] border border-[#EBE8DF] text-[#967C55]">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-[#1C1715]">场景空间解析报告</h3>
                      </div>
                      <span className="text-[10px] bg-[#FAF9F5] border border-[#EBE8DF] text-[#7A7061] px-2.5 py-1 rounded-full font-bold">深度解析</span>
                    </div>

                    {/* Room Style */}
                    <div className="bg-[#FAF9F5] border border-[#EBE8DF] rounded-2xl p-4 space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-[#967C55]">
                        <Compass className="w-3.5 h-3.5" />
                        <span>空间设计风格定位</span>
                      </div>
                      <p className="text-sm font-bold text-[#2C2623]">{roomAnalysis.style}</p>
                    </div>
                    
                    {/* Furniture & Colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#8C8375]">主要家具物件</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {roomAnalysis.furniture.slice(0,4).map((m: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#EBE8DF] text-[#665D4F] font-bold">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#8C8375]">主导色彩分布</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {roomAnalysis.colors.slice(0,3).map((c: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#EBE8DF] text-[#665D4F] font-bold">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Placement recommendation */}
                    <div className="border-t border-[#FAF9F5] pt-4 space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-[#967C55]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>智能摆放机位建议</span>
                      </div>
                      <p className="text-xs text-[#665D4F] leading-relaxed bg-[#FAF9F5] border border-[#EBE8DF] p-3 rounded-xl">{roomAnalysis.recommendation}</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-3xl border border-[#EBE8DF] p-8 flex flex-col items-center justify-center flex-1 min-h-[340px] text-center space-y-3.5 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-[#FAF9F5] border border-[#EBE8DF] flex items-center justify-center text-[#8C8375]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[#2C2623]">等待上传场景</h4>
                      <p className="text-xs text-[#8C8375] max-w-[220px]">上传您的房间照片以生成智能空间布局分析报告</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error state */}
            {roomError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{roomError}</span>
              </div>
            )}

            {/* Next buttons */}
            <div className="flex justify-end pt-4">
              <button
                id="btn-goto-step-2"
                disabled={!roomAnalysis}
                onClick={() => setStep(2)}
                className={`px-8 py-3.5 rounded-2xl text-sm font-extrabold flex items-center space-x-2 shadow-sm transition-all ${roomAnalysis ? "bg-[#967C55] text-white hover:bg-[#836C47] cursor-pointer" : "bg-[#FAF9F5] border border-[#EBE8DF] text-[#C4BDB0] cursor-not-allowed"}`}
              >
                <span>下一步：选择灯具</span>
                <ChevronRight className="w-4 h-4" />
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
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold tracking-widest text-[#967C55] uppercase">第二步 / 共四步</span>
              <h2 className="text-2xl md:text-3.5xl font-extrabold tracking-tight text-[#1C1715]">第 2 步：上传落地灯图片</h2>
              <p className="text-sm text-[#7A7061] max-w-xl mx-auto">
                上传需要试摆的灯具照片，人工智能视觉大模型将智能识别材质、出光方向并自动计算推荐摆放参数
              </p>
            </div>

            {/* Selector Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Upload Area */}
              <div className="lg:col-span-7 h-full flex flex-col">
                <div className="bg-white rounded-3xl border-2 border-dashed border-[#D6CFC1] hover:border-[#967C55] p-8 transition-colors flex flex-col items-center justify-center flex-1 min-h-[340px] relative overflow-hidden group">
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
                        <p className="text-xs text-[#8C8375] mt-1.5">{isLampAnalyzing ? "请稍候" : "支持实拍图，推荐透明背景或白底效果最佳"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Analysis Dashboard Area */}
              <div className="lg:col-span-5 h-full flex flex-col">
                {lampAnalysis ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl border border-[#EBE8DF] p-6 space-y-5 shadow-sm flex-1"
                  >
                    <div className="flex items-center justify-between border-b border-[#FAF9F5] pb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-[#FAF9F5] border border-[#EBE8DF] text-[#967C55]">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-[#1C1715]">人工智能灯具产品解析报告</h3>
                      </div>
                      <span className="text-[10px] bg-[#FAF9F5] border border-[#EBE8DF] text-[#7A7061] px-2.5 py-1 rounded-full font-bold">精细解析</span>
                    </div>

                    {/* Lamp Style */}
                    <div className="bg-[#FAF9F5] border border-[#EBE8DF] rounded-2xl p-4 space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-[#967C55]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>灯具设计风格归类</span>
                      </div>
                      <p className="text-sm font-bold text-[#2C2623]">{lampAnalysis.style}</p>
                    </div>

                    {/* Cozy Dial (Radial Indicator approximation) */}
                    <div className="flex items-center justify-between bg-[#FAF9F5] border border-[#EBE8DF] p-4 rounded-2xl">
                      <div>
                        <span className="text-xs font-semibold text-[#8C8375]">居家氛围治愈指数</span>
                        <p className="text-xs text-[#665D4F] mt-1 font-medium">评分越高代表夜间弱光治愈感越好</p>
                      </div>
                      <div className="flex flex-col items-center justify-center shrink-0 w-16 h-16 rounded-full bg-white border border-[#EBE8DF]">
                        <span className="text-xl font-black text-[#967C55]">{lampAnalysis.cozyIndex}</span>
                        <span className="text-[9px] text-[#8C8375] font-bold">/ 10</span>
                      </div>
                    </div>

                    {/* Materials & Color */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#8C8375]">主体骨架材质</span>
                        <div className="flex flex-wrap gap-1">
                          {lampAnalysis.materials.map((m, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#EBE8DF] text-[#665D4F] font-bold">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#8C8375]">主要色彩配色</span>
                        <p className="text-xs text-[#2C2623] font-bold mt-1">{lampAnalysis.color}</p>
                      </div>
                    </div>

                    {/* Light type */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-[#8C8375]">出光方向与光路类型</span>
                      <p className="text-sm text-[#2C2623] font-medium">{lampAnalysis.lightType}</p>
                    </div>

                    {/* Recommend light temperature */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-[#8C8375]">推荐搭配光色色温</span>
                      <p className="text-sm text-[#967C55] font-bold">{lampAnalysis.lightWarmth}</p>
                    </div>

                    {/* Placement recommendation */}
                    <div className="border-t border-[#FAF9F5] pt-4 space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-[#967C55]">
                        <Compass className="w-3.5 h-3.5" />
                        <span>光影摆放融合贴士</span>
                      </div>
                      <p className="text-xs text-[#665D4F] leading-relaxed bg-[#FAF9F5] border border-[#EBE8DF] p-3 rounded-xl">{lampAnalysis.placementTip}</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-3xl border border-[#EBE8DF] p-8 flex flex-col items-center justify-center flex-1 min-h-[340px] text-center space-y-3.5 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-[#FAF9F5] border border-[#EBE8DF] flex items-center justify-center text-[#8C8375]">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[#2C2623]">等待上传灯具</h4>
                      <p className="text-xs text-[#8C8375] max-w-[220px]">上传您中意的落地灯实拍以生成智能分析报告</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error state */}
            {lampError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{lampError}</span>
              </div>
            )}

            {/* Back & Next actions */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3.5 border border-[#EBE8DF] rounded-2xl text-sm font-bold flex items-center space-x-2 text-[#7A7061] hover:bg-[#FAF9F5] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>上一步：更换场景</span>
              </button>

              <button
                id="btn-goto-step-3"
                disabled={!lampAnalysis}
                onClick={() => setStep(3)}
                className={`px-8 py-3.5 rounded-2xl text-sm font-extrabold flex items-center space-x-2 shadow-sm transition-all ${lampAnalysis ? "bg-[#967C55] text-white hover:bg-[#836C47] cursor-pointer" : "bg-[#FAF9F5] border border-[#EBE8DF] text-[#C4BDB0] cursor-not-allowed"}`}
              >
                <span>下一步：生成参数</span>
                <ChevronRight className="w-4 h-4" />
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
            className="space-y-8 max-w-4xl mx-auto"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold tracking-widest text-[#967C55] uppercase">第三步 / 共四步</span>
              <h2 className="text-2xl md:text-3.5xl font-extrabold tracking-tight text-[#1C1715]">配置试摆生成参数</h2>
              <p className="text-sm text-[#7A7061] max-w-xl mx-auto">
                选择场景视角、清晰度、画面比例以及是否需要模特，系统将为您极速渲染生成最高维度的光照物理场景。
              </p>
            </div>

            {/* High-fidelity Parameter selector (Reference Image 2) */}
            <div className="bg-[#FAF9F5] border border-[#E9E4D9] rounded-3xl p-6 md:p-8 space-y-8 shadow-sm">
              
              {/* Parameter 1: Perspective (场景图) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-[#2C2623]">场景视角</span>
                  <span className="text-[10px] text-[#967C55] bg-[#FAF9F5] px-2 py-0.5 rounded font-bold uppercase">空间视角</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "far", name: "远景图", desc: "展示整个房间全景" },
                    { id: "mid", name: "中近景", desc: "聚焦沙发、茶几与拐角" },
                    { id: "close", name: "近景", desc: "细部光影雕琢与特写" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setParams({ ...params, viewType: opt.id as any })}
                      className={`px-6 py-4 rounded-2xl border text-left transition-all max-w-[210px] flex-1 ${params.viewType === opt.id ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm" : "bg-white/40 border-[#EBE8DF] hover:border-[#967C55]/50"}`}
                    >
                      <p className="text-xs font-extrabold text-[#2C2623]">{opt.name}</p>
                      <p className="text-[10px] text-[#8C8375] mt-1 leading-snug">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 2: Need Model (是否需要模特) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-[#2C2623]">生活氛围渲染 (是否需要模特)</span>
                  <span className="text-[10px] text-[#967C55] bg-[#FAF9F5] px-2 py-0.5 rounded font-bold uppercase">比例模特</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setParams({ ...params, needModel: false })}
                    className={`px-6 py-4 rounded-2xl border text-xs font-bold transition-all ${!params.needModel ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061]"}`}
                  >
                    不需要 (纯场景)
                  </button>
                  <button
                    onClick={() => setParams({ ...params, needModel: true })}
                    className={`px-6 py-4 rounded-2xl border text-xs font-bold transition-all ${params.needModel ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061]"}`}
                  >
                    需要 (置入舒适看书剪影)
                  </button>
                </div>
              </div>

              {/* Parameter 3: Resolution (清晰度) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-[#2C2623]">画面清晰度</span>
                  <span className="text-[10px] text-[#967C55] bg-[#FAF9F5] px-2 py-0.5 rounded font-bold uppercase">清晰度规格</span>
                </div>
                <div className="flex gap-3">
                  {[
                    { id: "1K", label: "标准清晰度" },
                    { id: "2K", label: "高清晰度" },
                    { id: "4K", label: "超高清晰度" }
                  ].map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setParams({ ...params, quality: q.id as any })}
                      className={`px-6 py-3.5 rounded-2xl border text-xs font-black transition-all ${params.quality === q.id ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061]"}`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 4: Ratio (比例) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-[#2C2623]">画布构图比例</span>
                  <span className="text-[10px] text-[#967C55] bg-[#FAF9F5] px-2 py-0.5 rounded font-bold uppercase">构图比例</span>
                </div>
                <div className="flex gap-3">
                  {[
                    { id: "4:3", name: "4:3 横构图", desc: "经典画幅" },
                    { id: "3:4", name: "3:4 竖构图", desc: "极佳手机分享构图" }
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setParams({ ...params, ratio: r.id as any })}
                      className={`px-6 py-3.5 rounded-2xl border text-xs font-bold transition-all text-left ${params.ratio === r.id ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061]"}`}
                    >
                      <p className="font-extrabold">{r.name}</p>
                      <p className="text-[9px] text-[#8C8375] mt-0.5 font-medium">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 5: Light State (开灯/关灯) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-[#2C2623]">灯具状态</span>
                  <span className="text-[10px] text-[#967C55] bg-[#FAF9F5] px-2 py-0.5 rounded font-bold uppercase">光效开关</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setParams({ ...params, lightState: "on" })}
                    className={`px-6 py-3.5 rounded-2xl border text-xs font-bold transition-all flex flex-col items-start ${params.lightState === "on" ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061]"}`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold">
                      <Sun className="w-3.5 h-3.5" />
                      <span>开启灯光</span>
                    </div>
                    <p className="text-[9px] text-[#8C8375] mt-0.5 font-medium">渲染物理光影漫反射</p>
                  </button>
                  <button
                    onClick={() => setParams({ ...params, lightState: "off" })}
                    className={`px-6 py-3.5 rounded-2xl border text-xs font-bold transition-all flex flex-col items-start ${params.lightState === "off" ? "bg-white border-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm text-[#967C55]" : "bg-white/40 border-[#EBE8DF] text-[#7A7061]"}`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold">
                      <Power className="w-3.5 h-3.5" />
                      <span>关闭灯光</span>
                    </div>
                    <p className="text-[9px] text-[#8C8375] mt-0.5 font-medium">展示自然光下材质细节</p>
                  </button>
                </div>
              </div>
            </div>

            {generationError && (
              <div className="bg-red-50 border border-red-200 text-red-950 rounded-2xl p-4 text-xs flex items-start space-x-2 mt-4">
                <Info className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span className="font-medium">{generationError}</span>
              </div>
            )}

            {/* Back & Next actions */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3.5 border border-[#EBE8DF] rounded-2xl text-sm font-bold flex items-center space-x-2 text-[#7A7061] hover:bg-[#FAF9F5] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>上一步：更换灯具</span>
              </button>

              <button
                id="btn-generate-scene"
                onClick={handleStartGeneration}
                className="px-8 py-3.5 rounded-2xl bg-[#967C55] text-white hover:bg-[#836C47] text-sm font-extrabold flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>生成试摆效果图</span>
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
                    aspectRatio: params.ratio === "4:3" ? "4/3" : "3/4"
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
        {generationHistory.length > 0 && (step === 3 || step === 4) && (
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
      <footer className="mt-20 border-t border-[#EBE8DF] py-6 text-center text-xs text-[#8C8375] space-y-2 bg-white/60">
        <p>© 2026 智能落地灯光影试摆设计工作室. 保留所有权利。</p>
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#C4BDB0]">设计精度: 100% | 智能渲染引擎: 二点五版本</p>
      </footer>
    </div>
  );
}
