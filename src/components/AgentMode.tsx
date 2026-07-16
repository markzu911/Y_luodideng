import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { 
  Upload, Sparkles, Sun, Download, Image as ImageIcon, Grid, 
  Loader2, Power, Check, Info, ZoomIn, Send, RefreshCw, X 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VIRTUAL_ROOMS, PRESET_LAMPS } from "../data";
import { VirtualRoom, PresetLamp, GenerationParams, RoomAnalysis, LampAnalysis } from "../types";

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text?: string;
  timestamp: Date;
  type?: 'room-select' | 'lamp-select' | 'generation-controls' | 'rendering' | 'result-card' | 'error' | 'text';
  image?: string; // Base64 or URL thumbnail
  isError?: boolean;
}

interface AgentModeProps {
  userId: string;
  toolId: string;
  userIntegral: number | null;
  toolRequiredIntegral: number;
  userInfo: { name: string; enterprise: string; integral: number } | null;
  fetchLaunchInfo: (uId: string, tId: string) => void;
  
  // Shared state with parent
  selectedVirtualRoom: VirtualRoom | null;
  setSelectedVirtualRoom: (room: VirtualRoom | null) => void;
  uploadedRoomBase64: string | null;
  setUploadedRoomBase64: (base64: string | null) => void;
  roomAnalysis: RoomAnalysis | null;
  setRoomAnalysis: (analysis: RoomAnalysis | null) => void;
  isRoomAnalyzing: boolean;
  setIsRoomAnalyzing: (analyzing: boolean) => void;
  
  selectedPresetLamp: PresetLamp | null;
  setSelectedPresetLamp: (lamp: PresetLamp | null) => void;
  uploadedLampBase64: string | null;
  setUploadedLampBase64: (base64: string | null) => void;
  lampAnalysis: LampAnalysis | null;
  setLampAnalysis: (analysis: LampAnalysis | null) => void;
  isLampAnalyzing: boolean;
  setIsLampAnalyzing: (analyzing: boolean) => void;

  params: GenerationParams;
  setParams: React.Dispatch<React.SetStateAction<GenerationParams>>;
  
  generatedSceneUrl: string | null;
  setGeneratedSceneUrl: (url: string | null) => void;
  generationHistory: string[];
  setGenerationHistory: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AgentMode({
  userId,
  toolId,
  userIntegral,
  toolRequiredIntegral,
  userInfo,
  fetchLaunchInfo,
  selectedVirtualRoom,
  setSelectedVirtualRoom,
  uploadedRoomBase64,
  setUploadedRoomBase64,
  roomAnalysis,
  setRoomAnalysis,
  isRoomAnalyzing,
  setIsRoomAnalyzing,
  selectedPresetLamp,
  setSelectedPresetLamp,
  uploadedLampBase64,
  setUploadedLampBase64,
  lampAnalysis,
  setLampAnalysis,
  isLampAnalyzing,
  setIsLampAnalyzing,
  params,
  setParams,
  generatedSceneUrl,
  setGeneratedSceneUrl,
  generationHistory,
  setGenerationHistory
}: AgentModeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "ai",
      text: "您好！我是您的落地灯光影智能试摆助手。我可以帮您将精美的落地灯完美融入您的房间场景中，并渲染出物理级、极其逼真的开灯光影效果。💡\n\n请问您想先选择哪种**房间场景**？您可以直接上传照片，或者在下方选择预设虚拟房间：",
      timestamp: new Date(),
      type: "room-select"
    }
  ]);

  const [inputMessage, setInputMessage] = useState<string>("");
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderingProgress, setRenderingProgress] = useState<number>(0);
  const [renderingText, setRenderingText] = useState<string>("");
  const [isChatAnalyzing, setIsChatAnalyzing] = useState<boolean>(false);

  const isOutOfCredits = userIntegral !== null && userIntegral < toolRequiredIntegral;

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const lampInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on messages or status changes without scrolling the entire page window
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isRoomAnalyzing, isLampAnalyzing, isRendering, renderingText, isChatAnalyzing]);

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

  // Image compression utility
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
          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

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

  const getLampPreview = () => {
    if (uploadedLampBase64) return uploadedLampBase64;
    if (selectedPresetLamp) return selectedPresetLamp.imageUrl;
    return null;
  };

  // Add user and bot message helper
  const appendMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  // Handle Room Selection from Predefined Grid
  const handleSelectRoom = (room: VirtualRoom) => {
    setSelectedVirtualRoom(room);
    setUploadedRoomBase64(null);
    setRoomAnalysis(room.analysis);

    // 1. Add user choice message without attaching the virtual room image
    appendMessage({
      id: `usr-rm-${Date.now()}`,
      sender: "user",
      text: `我想选择：${room.name}`,
      timestamp: new Date()
    });

    // 2. Guide to Lamp Selection after small delay
    setTimeout(() => {
      appendMessage({
        id: `ai-rm-${Date.now()}`,
        sender: "ai",
        text: `✨ 房间场景已成功加载！\n\n🔍 **空间美学分析报告**:\n• 空间风格: \`${room.name}\`\n• 软装家具: \`${room.analysis.furniture.join("、")}\`\n• 推荐摆放: \`${room.analysis.recommendation}\`\n\n下一步，请上传您心仪的**落地灯样式**：`,
        timestamp: new Date(),
        type: "lamp-select"
      });
    }, 600);
  };

  // Handle Room Image Upload inside Chat
  const handleRoomUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedVirtualRoom(null);
    setRoomAnalysis(null);
    setIsRoomAnalyzing(true);

    try {
      const base64String = await compressImage(file);
      setUploadedRoomBase64(base64String);

      // Append user message with thumbnail
      appendMessage({
        id: `usr-rm-up-${Date.now()}`,
        sender: "user",
        text: "我上传了一张专属房间场景照片 📸",
        timestamp: new Date(),
        image: base64String
      });

      // Show analyzing message
      const analyzingMsgId = `ai-rm-analyzing-${Date.now()}`;
      appendMessage({
        id: analyzingMsgId,
        sender: "ai",
        text: "正在启动 AI 空间分析。模型正在深度识别空间格局、阴影角度与软装色彩搭配，请稍候... 🔍",
        timestamp: new Date()
      });

      // Call API
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

      // Replace/Add analysis results
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== analyzingMsgId);
        return [
          ...filtered,
          {
            id: `ai-rm-done-${Date.now()}`,
            sender: "ai",
            text: `✨ 场景智能分析成功！\n\n🔍 **空间美学分析报告**:\n• 空间风格: \`${data.style}\`\n• 结构布局: \`${data.layout}\`\n• 推荐摆放: \`${data.recommendation}\`\n• 色彩色调: \`${data.colors.join("、")}\`\n\n接下来，请上传您心仪的**落地灯样式**：`,
            timestamp: new Date(),
            type: "lamp-select"
          }
        ];
      });

    } catch (err) {
      console.error(err);
      const fallbackAnalysis = {
        style: "现代简约起居空间",
        layout: "温馨明亮的室内布局",
        furniture: ["休闲沙发", "质感背景墙"],
        colors: ["米白色", "浅灰色"],
        recommendation: "建议将落地灯摆放在沙发后方拐角处，或者休闲椅旁，创造温馨的局部光照区。",
        lightSuggestion: "推荐 3000K 暖光，以增强温馨柔和的色彩氛围。"
      };
      setRoomAnalysis(fallbackAnalysis);

      setMessages(prev => [
        ...prev,
        {
          id: `ai-rm-fallback-${Date.now()}`,
          sender: "ai",
          text: `⚠️ 实拍图分析稍有延迟，已为您智配兜底高契合空间美学参数：\n• 空间风格: \`现代简约简约设计\`\n• 推荐摆放: \`建议将落地灯摆放在沙发转角，作为氛围散光\`。\n\n接下来，请上传您心仪的**落地灯样式**：`,
          timestamp: new Date(),
          type: "lamp-select"
        }
      ]);
    } finally {
      setIsRoomAnalyzing(false);
    }
  };

  // Handle Lamp Selection from Grid
  const handleSelectLamp = (lamp: PresetLamp) => {
    setSelectedPresetLamp(lamp);
    setUploadedLampBase64(null);
    setLampAnalysis(lamp.analysis);

    // 1. Add user selection bubble
    appendMessage({
      id: `usr-lp-${Date.now()}`,
      sender: "user",
      text: `我想选择灯具：${lamp.name}`,
      timestamp: new Date(),
      image: lamp.imageUrl
    });

    // 2. Guide to controls
    setTimeout(() => {
      appendMessage({
        id: `ai-lp-${Date.now()}`,
        sender: "ai",
        text: `🎨 落地灯已成功配对！\n\n🔍 **落地灯物理属性分析**:\n• 设计风格: \`${lamp.name}\`\n• 材质工艺: \`${lamp.analysis.materials.join("、")}\`\n• 专属光效: \`${lamp.analysis.lightType}\`\n\n最后，请微调您的**光影融合参数**，点击下方按钮启动高拟真度空间融合：`,
        timestamp: new Date(),
        type: "generation-controls"
      });
    }, 600);
  };

  // Handle Lamp Image Upload
  const handleLampUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPresetLamp(null);
    setLampAnalysis(null);
    setIsLampAnalyzing(true);

    try {
      const base64String = await compressImage(file);
      setUploadedLampBase64(base64String);

      // Append user upload bubble
      appendMessage({
        id: `usr-lp-up-${Date.now()}`,
        sender: "user",
        text: "我上传了落地灯背景实拍图 📸",
        timestamp: new Date(),
        image: base64String
      });

      // Show analyzing message
      const analyzingMsgId = `ai-lp-analyzing-${Date.now()}`;
      appendMessage({
        id: analyzingMsgId,
        sender: "ai",
        text: "正在启动 AI 材质结构解析。模型正在分析灯罩的漫反射率、灯体高光及金属色系，请稍候... 🔍",
        timestamp: new Date()
      });

      // Call API
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

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== analyzingMsgId);
        return [
          ...filtered,
          {
            id: `ai-lp-done-${Date.now()}`,
            sender: "ai",
            text: `✨ 落地灯精细化结构识别成功！\n\n🔍 **灯具物理属性报告**:\n• 设计风格: \`${data.style}\`\n• 灯体主色: \`${data.color}\`\n• 材质构成: \`${data.materials.join("、")}\`\n• 发光类型: \`${data.lightType}\`\n• 摆放小贴士: \`${data.placementTip}\`\n\n最后，请微调您的**光影融合参数**，并点击下方按钮启动高拟真度空间融合：`,
            timestamp: new Date(),
            type: "generation-controls"
          }
        ];
      });

    } catch (err) {
      console.error(err);
      const fallbackLamp = {
        style: "极简现代落地灯",
        materials: ["金属拉丝底座", "高透散光灯罩"],
        color: "雅致黑",
        lightType: "漫反射温柔环境光",
        lightWarmth: "推荐 3000开尔文 温馨暖光",
        cozyIndex: 8,
        placementTip: "纤细的灯柱适合靠紧墙壁放置。将灯罩角度朝向沙发，可烘托出完美的极致光影过渡。"
      };
      setLampAnalysis(fallbackLamp);

      setMessages(prev => [
        ...prev,
        {
          id: `ai-lp-fallback-${Date.now()}`,
          sender: "ai",
          text: `⚠️ 灯体识别稍有延迟，已为您加载高融合度灯具物理渲染属性。\n\n最后，请微调您的**光影融合参数**，并点击下方按钮启动高拟真度空间融合：`,
          timestamp: new Date(),
          type: "generation-controls"
        }
      ]);
    } finally {
      setIsLampAnalyzing(false);
    }
  };

  // Perform Generation with points verification
  const handleGenerate = async () => {
    // 1. Verify user's points (2nd endpoint: verify)
    try {
      const verifyRes = await fetch("/api/tool/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, toolId })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        const errorMsg = verifyData.message || "❌ 体验额度不足，无法执行该操作";
        appendMessage({
          id: `err-pts-${Date.now()}`,
          sender: "ai",
          text: `❌ 体验额度不足，无法执行该操作（当前所需：${toolRequiredIntegral}次，您的额度余额不足）。`,
          timestamp: new Date(),
          isError: true
        });
        return;
      }
    } catch (err: any) {
      console.error("Points verification failed:", err);
      appendMessage({
        id: `err-pts-${Date.now()}`,
        sender: "ai",
        text: `❌ 额度校验遇到异常，请稍后重试。`,
        timestamp: new Date(),
        isError: true
      });
      return;
    }

    // Initialize rendering state inside Agent Window
    setIsRendering(true);
    setRenderingProgress(0);

    const logMessages = [
      "正在提取房间空间三维设计美学结构...",
      "正在解析场景色调分布与光源环境...",
      "正在将落地灯置入场景空间模型中...",
      "正在匹配落地灯与房间材质、色调调和度...",
      "正在渲染真实的灯具高保真融合预览...",
      "融合完成！正在进入实时智能试摆工作室..."
    ];

    setRenderingText(logMessages[0]);

    let currentProgress = 0;
    let apiCompleted = false;
    let apiResultUrl: string | null = null;
    let apiErrorMsg: string | null = null;

    // Trigger backend API in background
    const runGeneration = async () => {
      try {
        const bgUrl = getSceneBackground();
        const lampUrl = getLampPreview();

        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        const base64Image = data.image;

        // Deduct points (SaaS consume endpoint)
        const consumeRes = await fetch("/api/tool/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, toolId })
        });
        const consumeData = await consumeRes.json();
        
        if (!consumeRes.ok || !consumeData.success) {
          throw new Error(consumeData.message || "额度扣除失败，请重试。");
        }

        // Sync points
        fetchLaunchInfo(userId, toolId);

        // Upload to OSS via SaaS proxy
        try {
          const blob = base64ToBlob(base64Image, "image/png");
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
              const uploadRes = await fetch(tokenData.uploadUrl, {
                method: tokenData.method || "PUT",
                headers: tokenData.headers || { "Content-Type": "image/png" },
                body: blob
              });

              if (uploadRes.ok) {
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
                  apiResultUrl = commitData.url || base64Image;
                } else {
                  apiResultUrl = base64Image;
                }
              } else {
                apiResultUrl = base64Image;
              }
            } else {
              apiResultUrl = base64Image;
            }
          } else {
            apiResultUrl = base64Image;
          }
        } catch (uploadErr) {
          console.error("OSS Upload failed. Fallback to local base64.", uploadErr);
          apiResultUrl = base64Image;
        }

      } catch (err: any) {
        console.error("Error generating scene:", err);
        apiErrorMsg = err.message || "由于服务端处理超时或异常，人工智能空间融合未成功。";
      } finally {
        apiCompleted = true;
      }
    };

    runGeneration();

    // Progress bar loop
    const progressInterval = setInterval(() => {
      const increment = currentProgress >= 85 && !apiCompleted ? 1 : Math.floor(Math.random() * 10) + 6;
      currentProgress = Math.min(95, currentProgress + increment);
      setRenderingProgress(currentProgress);

      const msgIdx = Math.min(
        Math.floor((currentProgress / 100) * logMessages.length),
        logMessages.length - 1
      );
      setRenderingText(logMessages[msgIdx]);

      if (apiCompleted) {
        clearInterval(progressInterval);
        setRenderingProgress(100);
        setRenderingText("融合完成！正在呈现最终的高拟真度光影画面。");

        setTimeout(() => {
          setIsRendering(false);
          if (apiErrorMsg) {
            appendMessage({
              id: `ai-gen-err-${Date.now()}`,
              sender: "ai",
              text: `⚠️ 融合渲染未成功：${apiErrorMsg}`,
              timestamp: new Date(),
              isError: true
            });
          } else if (apiResultUrl) {
            setGeneratedSceneUrl(apiResultUrl);
            setGenerationHistory(prev => [apiResultUrl!, ...prev]);

            // Append final successful result card bubble!
            appendMessage({
              id: `ai-result-${Date.now()}`,
              sender: "ai",
              text: `🎉 **空间落地灯光影无缝融合已完成！**\n\n为您呈现高保真物理渲染图。AI 物理光照引擎已重构了空间的光强分布，在周围的家具（如沙发、背景墙等）上渲染出了柔和写实的漫反射、材质高光和精密的软阴影。您可以点击放大或进行导出。`,
              timestamp: new Date(),
              type: "result-card",
              image: apiResultUrl
            });
          }
        }, 800);
      }
    }, 250);
  };

  // Local fallback parsing logic if server API fails or is not available
  const runFallbackKeywordParsing = (trimmed: string) => {
    const lowerText = trimmed.toLowerCase();

    // Check room selection
    const matchedRoom = VIRTUAL_ROOMS.find(r => 
      lowerText.includes(r.name.split(" ")[0]) || 
      r.name.split(" ")[0].split("(")[0].includes(lowerText) ||
      (lowerText.includes("极简") || lowerText.includes("minimalist") || lowerText.includes("简约") && !lowerText.includes("现代") || lowerText.includes("纯白")) && r.id === "room_7" ||
      (lowerText.includes("现代") || lowerText.includes("客厅") || lowerText.includes("modern")) && r.id === "room_1" ||
      lowerText.includes("卧室") && r.id === "room_2" ||
      lowerText.includes("中式") && r.id === "room_3" ||
      lowerText.includes("奶油") && r.id === "room_4" ||
      (lowerText.includes("侘寂") || lowerText.includes("寂宅") || lowerText.includes("寂静")) && r.id === "room_5"
    );

    if (matchedRoom) {
      setSelectedVirtualRoom(matchedRoom);
      setUploadedRoomBase64(null);
      setRoomAnalysis(matchedRoom.analysis);
      appendMessage({
        id: `ai-cmd-rm-${Date.now()}`,
        sender: "ai",
        text: `✨ 已为您智能匹配房间场景：**${matchedRoom.name}**！\n• 风格特点：\`${matchedRoom.style}\`\n• 推荐摆放：\`${matchedRoom.analysis.recommendation}\`\n\n下一步，请上传您心仪的**落地灯样式**：`,
        timestamp: new Date(),
        type: "lamp-select"
      });
      return;
    }

    // Check lamp selection mention
    if (lowerText.includes("灯") || lowerText.includes("lamp") || lowerText.includes("钓鱼灯") || lowerText.includes("和纸") || lowerText.includes("褶皱") || lowerText.includes("黄铜") || lowerText.includes("复古") || lowerText.includes("射灯")) {
      appendMessage({
        id: `ai-cmd-lp-upload-tip-${Date.now()}`,
        sender: "ai",
        text: `💡 **上传落地灯提示**：为了给您最广阔的个性化定制自由度，本项目已经去除了所有的内置预设落地灯。\n\n无论您中意的是钓鱼灯、和纸褶皱灯笼灯、黄铜复古灯，还是任何其他特殊设计，都请直接点击界面上的 **“📤 上传我的落地灯”** 按钮。上传后，AI 会自动为您分析材质特征与物理光晕并进行融合试摆！`,
        timestamp: new Date(),
        type: "lamp-select"
      });
      return;
    }

    // Check lights parameter
    if (lowerText.includes("开灯") || lowerText.includes("开启灯光")) {
      setParams(p => ({ ...p, lightState: "on" }));
      appendMessage({
        id: `ai-cmd-light-${Date.now()}`,
        sender: "ai",
        text: `💡 **已为您将灯具开关调整为 [开启灯光]**。\n模型将高保真还原灯罩亮起时的散光、边缘光晕（Atmospheric Bloom）及强力物理投影。`,
        timestamp: new Date(),
        type: "generation-controls"
      });
      return;
    }

    if (lowerText.includes("关灯") || lowerText.includes("关闭灯光")) {
      setParams(p => ({ ...p, lightState: "off" }));
      appendMessage({
        id: `ai-cmd-light-${Date.now()}`,
        sender: "ai",
        text: `🔌 **已为您将灯具开关调整为 [关闭灯光]**。\n模型将着重还原阳光或室外自然反射光下，灯体本身的材质、金属质地与倒影。`,
        timestamp: new Date(),
        type: "generation-controls"
      });
      return;
    }

    // Check view types
    if (lowerText.includes("远景")) {
      setParams(p => ({ ...p, viewType: "far" }));
      appendMessage({
        id: `ai-cmd-view-${Date.now()}`,
        sender: "ai",
        text: `🎥 **构图视角调整为 [远景]**。下一步请开始合成：`,
        timestamp: new Date(),
        type: "generation-controls"
      });
      return;
    }
    if (lowerText.includes("中景")) {
      setParams(p => ({ ...p, viewType: "mid" }));
      appendMessage({
        id: `ai-cmd-view-${Date.now()}`,
        sender: "ai",
        text: `🎥 **构图视角调整为 [中景]**。下一步请开始合成：`,
        timestamp: new Date(),
        type: "generation-controls"
      });
      return;
    }
    if (lowerText.includes("近景")) {
      setParams(p => ({ ...p, viewType: "close" }));
      appendMessage({
        id: `ai-cmd-view-${Date.now()}`,
        sender: "ai",
        text: `🎥 **构图视角调整为 [近景]**。下一步请开始合成：`,
        timestamp: new Date(),
        type: "generation-controls"
      });
      return;
    }

    // Check start action
    if (lowerText.includes("开始") || lowerText.includes("生成") || lowerText.includes("渲染") || lowerText.includes("合成")) {
      if (!getSceneBackground()) {
        appendMessage({
          id: `ai-err-rm-${Date.now()}`,
          sender: "ai",
          text: `⚠️ 您还没有选定任何房间背景，请点击预设房间或上传照片后再试哦。`,
          timestamp: new Date(),
          type: "room-select"
        });
      } else if (!getLampPreview()) {
        appendMessage({
          id: `ai-err-lp-${Date.now()}`,
          sender: "ai",
          text: `⚠️ 您还没有上传落地灯图片，请点击“📤 上传我的落地灯”按钮后再试。`,
          timestamp: new Date(),
          type: "lamp-select"
        });
      } else {
        handleGenerate();
      }
      return;
    }

    // Default helper
    appendMessage({
      id: `ai-cmd-help-${Date.now()}`,
      sender: "ai",
      text: `💡 收到您的消息。我可以智能感知多种操作指令：\n\n• 输入风格关键词（如 **「奶油风」** / **「中式」** 等）自动切换场景。\n• 落地灯无任何内置预设，支持并引导上传您自选的落地灯照片进行试摆。\n• 输入 **「开灯」** / **「关灯」** 实时调控灯效状态。\n\n您也可以在对话卡片中选择预设房间，或上传自备落地灯，并输入 **「开始渲染」** 启动光影融合。`,
      timestamp: new Date()
    });
  };

  // Chat Text Input submission
  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    // Append user text
    appendMessage({
      id: `usr-text-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date(),
      type: "text"
    });

    setInputMessage("");
    setIsChatAnalyzing(true);

    try {
      const response = await fetch("/api/chat-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          currentRoomId: selectedVirtualRoom?.id,
          currentLampId: selectedPresetLamp?.id,
          currentParams: params
        })
      });

      if (!response.ok) {
        throw new Error("Chat intent API returned error");
      }

      const result = await response.json();
      const { intent, extractedData, aiResponse } = result;

      // Apply Extracted Changes
      let roomChanged = false;
      let lampChanged = false;

      if (extractedData) {
        // 1. Room selection
        if (extractedData.roomId) {
          const room = VIRTUAL_ROOMS.find(r => r.id === extractedData.roomId);
          if (room) {
            setSelectedVirtualRoom(room);
            setUploadedRoomBase64(null);
            setRoomAnalysis(room.analysis);
            roomChanged = true;
          }
        }

        // 2. Lamp selection
        if (extractedData.lampId) {
          const lamp = PRESET_LAMPS.find(l => l.id === extractedData.lampId);
          if (lamp) {
            setSelectedPresetLamp(lamp);
            setUploadedLampBase64(null);
            setLampAnalysis(lamp.analysis);
            lampChanged = true;
          }
        }

        // 3. Light state
        if (extractedData.lightState) {
          setParams(prev => ({ ...prev, lightState: extractedData.lightState }));
        }

        // 4. View type
        if (extractedData.viewType) {
          setParams(prev => ({ ...prev, viewType: extractedData.viewType }));
        }

        // 5. Need model
        if (extractedData.needModel !== null && extractedData.needModel !== undefined) {
          setParams(prev => ({ ...prev, needModel: extractedData.needModel }));
        }
      }

      // Determine smart bubble card category to show next
      let bubbleType: ChatMessage["type"] = undefined;
      const hasRoom = !!(selectedVirtualRoom || roomChanged);
      const hasLamp = !!(selectedPresetLamp || lampChanged);

      if (!hasRoom) {
        bubbleType = "room-select";
      } else if (!hasLamp) {
        bubbleType = "lamp-select";
      } else {
        bubbleType = "generation-controls";
      }

      // If user intent was to generate the scene
      if (intent === "generate_scene") {
        setIsChatAnalyzing(false);
        // We still output the assistant's confirmation response first
        appendMessage({
          id: `ai-cmd-res-${Date.now()}`,
          sender: "ai",
          text: aiResponse || "好的，正在为您开启空间光影深度融合试摆渲染...",
          timestamp: new Date(),
          type: "generation-controls"
        });

        // Trigger rendering
        setTimeout(() => {
          const roomBg = getSceneBackground();
          const lampPreview = getLampPreview();
          if (!roomBg) {
            appendMessage({
              id: `ai-err-rm-${Date.now()}`,
              sender: "ai",
              text: `⚠️ 您还没有选定任何房间背景，请点击预设房间或上传照片后再试哦。`,
              timestamp: new Date(),
              type: "room-select"
            });
          } else if (!lampPreview) {
            appendMessage({
              id: `ai-err-lp-${Date.now()}`,
              sender: "ai",
              text: `⚠️ 您还没有选定落地灯样式，请点击预设落地灯或上传图片后再试。`,
              timestamp: new Date(),
              type: "lamp-select"
            });
          } else {
            handleGenerate();
          }
        }, 500);

        return;
      }

      // Normal response
      appendMessage({
        id: `ai-cmd-res-${Date.now()}`,
        sender: "ai",
        text: aiResponse || "好的，已为您完成参数调整。",
        timestamp: new Date(),
        type: bubbleType
      });

    } catch (err) {
      console.warn("Gemini chat-intent parsing failed or unavailable, running fallback keyword system:", err);
      // Run the local keyword matcher as a secure fallback
      runFallbackKeywordParsing(trimmed);
    } finally {
      setIsChatAnalyzing(false);
    }
  };

  const handleExportResultLocal = (url: string) => {
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      exportCanvas.width = img.width;
      exportCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = exportCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `落地灯智能空间融合_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        window.open(url, "_blank");
      }
    };
  };

  const handleRestartChat = () => {
    setSelectedVirtualRoom(null);
    setUploadedRoomBase64(null);
    setRoomAnalysis(null);
    setSelectedPresetLamp(null);
    setUploadedLampBase64(null);
    setLampAnalysis(null);
    setGeneratedSceneUrl(null);

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        text: "您好！我是您的落地灯光影智能试摆助手。我已经为您清空了历史操作状态，让我们重新开启一次高保真试摆设计之旅。💡\n\n请问您想先选择哪种**房间场景**？您可以直接上传照片，或者在下方选择预设虚拟房间：",
        timestamp: new Date(),
        type: "room-select"
      }
    ]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-3xl border border-[#EBE8DF] shadow-xl overflow-hidden flex flex-col flex-1 min-h-0">
      
      {/* Hidden file inputs for chat uploads */}
      <input 
        type="file" 
        accept="image/*" 
        ref={roomInputRef}
        onChange={handleRoomUpload}
        onClick={(e) => (e.target as HTMLInputElement).value = ''}
        className="hidden"
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={lampInputRef}
        onChange={handleLampUpload}
        onClick={(e) => (e.target as HTMLInputElement).value = ''}
        className="hidden"
      />

      {/* Chat Header */}
      <div className="bg-gradient-to-r from-[#FAF9F5] to-white px-6 py-4 border-b border-[#EBE8DF] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#967C55]/10 flex items-center justify-center text-[#967C55] shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1C1715] flex items-center gap-1.5">
              <span>智能光影分析助理</span>
              <span className="text-[9px] bg-amber-100 text-[#836C47] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90">Active</span>
            </h3>
            <p className="text-[10px] text-[#8C8375]">正在通过大语言模型与多模态物理渲染引擎为您提供设计服务</p>
          </div>
        </div>

        <button 
          onClick={handleRestartChat}
          className="px-3.5 py-2 hover:bg-[#FAF9F5] text-[#8C8375] hover:text-[#967C55] rounded-xl border border-[#EBE8DF] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>重置并重新试摆</span>
        </button>
      </div>

      {/* Message List area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF9F5]/40 scrollbar-thin scrollbar-thumb-gray-200"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3.5`}
            >
              {/* Profile Avatar */}
              {!isUser && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#967C55] to-[#D4C2A3] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm mt-0.5">
                  AI
                </div>
              )}

              {/* Bubble Body */}
              <div className={`max-w-[85%] flex flex-col space-y-2`}>
                <div 
                  className={`rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                    isUser 
                      ? "bg-[#967C55] text-white rounded-tr-none font-medium" 
                      : msg.isError 
                        ? "bg-red-50 border border-red-200 text-red-900 rounded-tl-none"
                        : "bg-white text-[#2C2623] border border-[#EBE8DF] rounded-tl-none"
                  }`}
                >
                  {/* Message Text with simple rich paragraph format */}
                  {msg.text && renderFormattedText(msg.text, isUser)}

                  {/* Thumbnail attachment */}
                  {msg.image && msg.type !== "result-card" && (
                    <div className="mt-3.5 overflow-hidden rounded-xl border border-[#EBE8DF] max-w-xs bg-white/40 p-1 shadow-sm">
                      <img 
                        src={msg.image} 
                        alt="Attached Graphic" 
                        className="w-full h-auto max-h-[140px] object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* CUSTOM RICH INTERACTIVE COMPONENT: Room Selection */}
                  {msg.type === "room-select" && (
                    <div className="mt-4 space-y-4 pt-1 border-t border-[#FAF9F5]">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {VIRTUAL_ROOMS.map((room) => {
                          const isSelected = selectedVirtualRoom?.id === room.id;
                          return (
                            <button
                              key={room.id}
                              onClick={() => handleSelectRoom(room)}
                              disabled={isRoomAnalyzing}
                              className={`group text-left rounded-xl border p-3.5 bg-[#FAF9F5] hover:bg-white transition-all relative flex flex-col justify-between ${
                                isSelected 
                                  ? "border-[#967C55] ring-2 ring-[#967C55]/10 bg-white" 
                                  : "border-[#EBE8DF] hover:border-[#967C55]/40"
                              }`}
                            >
                              <div className="flex items-start justify-between w-full gap-2">
                                <span className="text-xs font-extrabold text-[#2C2623]">{room.name}</span>
                                {isSelected && (
                                  <span className="bg-[#967C55] text-white p-0.5 rounded-full shadow shrink-0">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#8C8375] block mt-2 font-medium line-clamp-2 leading-normal">{room.analysis.style}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => roomInputRef.current?.click()}
                        disabled={isRoomAnalyzing}
                        className="w-full py-3.5 px-4 rounded-xl border border-dashed border-[#D6CFC1] hover:border-[#967C55] bg-[#FAF9F5]/60 hover:bg-white text-xs font-extrabold text-[#967C55] flex items-center justify-center gap-2 transition-all shadow-inner"
                      >
                        {isRoomAnalyzing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#967C55]" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#967C55]" />
                        )}
                        <span>{isRoomAnalyzing ? "空间深度智能分析中..." : "📤 上传我自家的房间照片 (点击上传)"}</span>
                      </button>
                    </div>
                  )}

                  {/* CUSTOM RICH INTERACTIVE COMPONENT: Lamp Selection */}
                  {msg.type === "lamp-select" && (
                    <div className="mt-4 space-y-4 pt-1 border-t border-[#FAF9F5]">
                      <div className="bg-[#FAF9F5]/80 rounded-2xl p-4 border border-[#EBE8DF] space-y-2">
                        <p className="text-xs text-[#5C5346] leading-relaxed">
                          ✨ **全新升级**：本项目已去除了所有固定的预设落地灯。我们为您保留了无限的选择自由，支持您上传任何心仪的落地灯图片进行智能试摆。
                        </p>
                        <p className="text-[11px] text-[#967C55] font-extrabold leading-normal">
                          💡 您可以直接上传从电商平台（淘宝、京东、得物、拼多多等）保存的商品主图、实拍图、或任何您中意的落地灯抠图。AI 物理光照引擎将自动提取灯具体态，并高拟真融合进您选择的房间场景中。
                        </p>
                      </div>

                      <button
                        onClick={() => lampInputRef.current?.click()}
                        disabled={isLampAnalyzing}
                        className="w-full py-4 px-4 rounded-xl border border-dashed border-[#D6CFC1] hover:border-[#967C55] bg-gradient-to-r from-amber-50/20 to-orange-50/10 hover:bg-white text-xs font-extrabold text-[#967C55] flex items-center justify-center gap-2 transition-all shadow-inner"
                      >
                        {isLampAnalyzing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#967C55]" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#967C55]" />
                        )}
                        <span>{isLampAnalyzing ? "灯具精密材质提取中..." : "📤 上传我的落地灯背景实拍图 / 抠图照片"}</span>
                      </button>
                    </div>
                  )}

                  {/* CUSTOM RICH INTERACTIVE COMPONENT: Parameter Control Toggle Grid */}
                  {msg.type === "generation-controls" && (
                    <div className="mt-4 pt-4 border-t border-[#FAF9F5] space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Control 1: Light state */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#8C8375] uppercase tracking-wider">灯具状态</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setParams({ ...params, lightState: "on" })}
                              className={`flex-1 py-2 px-3 rounded-xl border text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                                params.lightState === "on" 
                                  ? "bg-white border-[#967C55] text-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm" 
                                  : "bg-[#FAF9F5] border-[#EBE8DF] text-[#7A7061]"
                              }`}
                            >
                              <Sun className="w-3.5 h-3.5" />
                              <span>开启灯光</span>
                            </button>
                            <button
                              onClick={() => setParams({ ...params, lightState: "off" })}
                              className={`flex-1 py-2 px-3 rounded-xl border text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                                params.lightState === "off" 
                                  ? "bg-white border-[#967C55] text-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm" 
                                  : "bg-[#FAF9F5] border-[#EBE8DF] text-[#7A7061]"
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>关闭灯光</span>
                            </button>
                          </div>
                        </div>

                        {/* Control 2: Camera perspective */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#8C8375] uppercase tracking-wider">相机透视</label>
                          <div className="flex gap-2">
                            {[
                              { id: "far", label: "远景" },
                              { id: "mid", label: "中景" },
                              { id: "close", label: "近景" }
                            ].map((v) => (
                              <button
                                key={v.id}
                                onClick={() => setParams({ ...params, viewType: v.id as any })}
                                className={`flex-1 py-2 px-1.5 rounded-xl border text-[11px] font-extrabold transition-all ${
                                  params.viewType === v.id 
                                    ? "bg-white border-[#967C55] text-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm" 
                                    : "bg-[#FAF9F5] border-[#EBE8DF] text-[#7A7061]"
                                }`}
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Control 3: Ratio */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#8C8375] uppercase tracking-wider">构图比例</label>
                          <div className="flex gap-2">
                            {[
                              { id: "4:3", label: "4:3 横构图" },
                              { id: "3:4", label: "3:4 竖构图" }
                            ].map((v) => (
                              <button
                                key={v.id}
                                onClick={() => setParams({ ...params, ratio: v.id as any })}
                                className={`flex-1 py-2 px-2 rounded-xl border text-[11px] font-extrabold transition-all ${
                                  params.ratio === v.id 
                                    ? "bg-white border-[#967C55] text-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm" 
                                    : "bg-[#FAF9F5] border-[#EBE8DF] text-[#7A7061]"
                                }`}
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Control 4: Quality */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#8C8375] uppercase tracking-wider">画面质量</label>
                          <div className="flex gap-2">
                            {[
                              { id: "1K", label: "1K" },
                              { id: "2K", label: "2K" },
                              { id: "4K", label: "4K" }
                            ].map((v) => (
                              <button
                                key={v.id}
                                onClick={() => setParams({ ...params, quality: v.id as any })}
                                className={`flex-1 py-2 px-1.5 rounded-xl border text-[11px] font-extrabold transition-all ${
                                  params.quality === v.id 
                                    ? "bg-white border-[#967C55] text-[#967C55] ring-2 ring-[#967C55]/10 shadow-sm" 
                                    : "bg-[#FAF9F5] border-[#EBE8DF] text-[#7A7061]"
                                }`}
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Launch trigger action block */}
                      <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-[#EBE8DF] flex flex-col sm:flex-row items-center justify-between gap-3.5">
                        <div className="flex items-center gap-2 text-xs text-[#665D4F] font-bold">
                          <Sparkles className="w-4 h-4 text-[#967C55]" />
                          <span>
                            {userIntegral !== null 
                              ? `所需额度: ${toolRequiredIntegral} | 当前可用: ${userIntegral}`
                              : `所需额度: ${toolRequiredIntegral}`}
                          </span>
                        </div>
                        <button
                          onClick={handleGenerate}
                          disabled={isRendering || isOutOfCredits}
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all ${
                            isOutOfCredits ? "bg-[#D6CFC1] cursor-not-allowed hover:shadow-none" : "bg-[#967C55] hover:bg-[#836C47]"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                          <span>一键智能试摆合成 🚀</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* CUSTOM COMPONENT: Result High-fidelity Image Card */}
                  {msg.type === "result-card" && msg.image && (
                    <div className="mt-4 pt-1 border-t border-[#FAF9F5] space-y-4">
                      
                      <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-[#1C1715] shadow-lg group">
                        <img 
                          src={msg.image} 
                          alt="AI Space Synthesis result" 
                          className="w-full h-auto max-h-[380px] object-cover transition-transform duration-700 group-hover:scale-102"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                      </div>

                      {/* Action Triggers in results card */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleExportResultLocal(msg.image!)}
                          className="flex-1 py-3 bg-[#967C55] hover:bg-[#836C47] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-200" />
                          <span>导出高保真效果图</span>
                        </button>

                        <button
                          onClick={handleRestartChat}
                          className="px-4 py-3 bg-[#F2EFE9] border border-[#EBE8DF] hover:bg-[#EBE8DF] text-[#7A7061] hover:text-[#1C1715] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>重新试摆</span>
                        </button>
                      </div>

                    </div>
                  )}

                </div>

                {/* Timestamp & Meta info */}
                <span className={`text-[9px] text-[#C4BDB0] font-medium self-start px-1`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-9 h-9 rounded-xl bg-[#FAF9F5] border border-[#EBE8DF] flex items-center justify-center text-[#967C55] font-bold text-xs shrink-0 shadow-sm mt-0.5">
                  我
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Dynamic Chat Intent Parsing Indicator */}
        {isChatAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start items-start gap-3.5"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#967C55] to-[#D4C2A3] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm mt-0.5">
              AI
            </div>
            <div className="max-w-[85%] flex flex-col space-y-1">
              <div className="bg-white border border-[#EBE8DF] rounded-2xl rounded-tl-none p-4 shadow-sm text-sm flex items-center gap-2.5 text-[#8C8375]">
                <Loader2 className="w-4 h-4 animate-spin text-[#967C55]" />
                <span className="font-bold text-xs animate-pulse">正在倾听并理解您的设计意图...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Dynamic Rendering Progress Card directly in scroll list */}
        {isRendering && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start items-start gap-3.5"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#967C55] to-[#D4C2A3] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm mt-0.5 animate-pulse">
              AI
            </div>
            <div className="max-w-[85%] flex flex-col space-y-1">
              <div className="bg-white border border-[#EBE8DF] rounded-2xl rounded-tl-none p-4 shadow-md w-full sm:min-w-[320px]">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 flex items-center justify-center bg-[#967C55] text-white rounded-xl shadow">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#2C2623]">物理光影引擎融合渲染中...</h4>
                    <p className="text-[10px] text-[#8C8375] font-medium mt-0.5 animate-pulse truncate max-w-[200px] sm:max-w-none">{renderingText}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="w-full h-1.5 bg-[#FAF9F5] border border-[#EBE8DF] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#967C55] to-[#D4C2A3] rounded-full transition-all duration-150"
                      style={{ width: `${renderingProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-black tracking-wider uppercase">
                    <span className="text-[#967C55]">正在混合多光源通道...</span>
                    <span className="text-[#8C8375]">{renderingProgress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Chat bottom Input container */}
      <div className="shrink-0 p-4 bg-white border-t border-[#EBE8DF] flex flex-col gap-2">
        {isOutOfCredits ? (
          <div className="bg-amber-50 border border-amber-200 text-[#7A5B35] rounded-2xl p-4 text-xs font-bold flex items-start gap-3 shadow-inner">
            <Info className="w-4 h-4 text-[#967C55] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-[13px] text-[#2C2623]">⚠️ 您的体验额度已用尽</p>
              <p className="text-[#8C8375] text-[11px] font-medium leading-relaxed">
                当前的体验额度余额不足以支持下一次渲染或对话。由于目前额度已全部用完，对话已自动终止。
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-stretch gap-2.5">
            <input
              type="text"
              value={inputMessage}
              disabled={isOutOfCredits}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="输入如「我想看开灯效果」、「中式风格」、「远景视角」或输入想说的话..."
              className="flex-1 px-4 py-3 bg-[#FAF9F5] border border-[#EBE8DF] rounded-2xl text-xs text-[#2C2623] placeholder-[#8C8375] focus:outline-none focus:ring-2 focus:ring-[#967C55]/30 focus:bg-white transition-all shadow-inner disabled:opacity-50"
            />

            <button
              onClick={handleSendMessage}
              disabled={isOutOfCredits}
              className="px-5 bg-[#967C55] hover:bg-[#836C47] text-white rounded-2xl flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0 disabled:bg-[#D6CFC1]"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

function renderFormattedText(text: string, isUser: boolean) {
  if (isUser) {
    return <div className="whitespace-pre-line font-sans">{text}</div>;
  }

  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="space-y-3 font-sans text-sm text-[#2C2623]">
      {paragraphs.map((p, pIdx) => {
        const trimmedP = p.trim();
        if (!trimmedP) return null;

        const lines = trimmedP.split("\n");
        const isList = lines.every(line => {
          const l = line.trim();
          return l.startsWith("•") || l.startsWith("*") || l.startsWith("-") || l.match(/^\d+\./);
        });

        if (isList) {
          return (
            <ul key={pIdx} className="space-y-2.5 my-2">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^[•*\-]\s*/, "").replace(/^\d+\.\s*/, "");
                return (
                  <li key={lIdx} className="flex items-start gap-2 text-[13px] leading-relaxed">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-100 text-[#967C55] text-[9px] font-bold shrink-0 mt-0.5">
                      ✦
                    </span>
                    <span className="flex-1">{parseInlineStyles(cleanLine)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div key={pIdx} className="space-y-1.5 leading-relaxed text-[13px]">
            {lines.map((line, lIdx) => {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith("•") || trimmedLine.startsWith("*") || trimmedLine.startsWith("-")) {
                const cleanLine = trimmedLine.replace(/^[•*\-]\s*/, "");
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1 py-0.5 text-[13px]">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-100 text-[#967C55] text-[9px] font-bold shrink-0 mt-0.5">
                      ✦
                    </span>
                    <span className="flex-1">{parseInlineStyles(cleanLine)}</span>
                  </div>
                );
              }

              const isHeader = trimmedLine.startsWith("🔍") || trimmedLine.startsWith("✨") || trimmedLine.startsWith("💡") || (trimmedLine.startsWith("**") && trimmedLine.endsWith("**"));
              if (isHeader) {
                return (
                  <div key={lIdx} className="text-sm font-extrabold text-[#1C1715] pt-1.5 pb-0.5 flex items-center gap-1.5">
                    {parseInlineStyles(trimmedLine)}
                  </div>
                );
              }

              return (
                <p key={lIdx} className="text-[13px] leading-relaxed">
                  {parseInlineStyles(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function parseInlineStyles(text: string) {
  const parts: React.ReactNode[] = [];
  let currentKey = 0;

  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const tokens = text.split(regex);

  tokens.forEach(token => {
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={currentKey++} className="font-extrabold text-[#1C1715]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={currentKey++} className="mx-1 bg-[#FAF9F5] border border-[#EBE8DF] text-[#967C55] px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(<React.Fragment key={currentKey++}>{token}</React.Fragment>);
    }
  });

  return parts;
}
