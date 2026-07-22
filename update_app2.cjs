const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update click on main image
const mainClickTarget = `onClick={() => generatedSceneUrl && setIsPreviewOpen(true)}`;
const mainClickReplacement = `onClick={() => {
                    if (generatedSceneUrl) {
                      setPreviewImageUrl(generatedSceneUrl);
                      setIsPreviewOpen(true);
                    }
                  }}`;
content = content.replace(mainClickTarget, mainClickReplacement);

// Update Modal 
const modalTarget = `      <AnimatePresence>
        {isPreviewOpen && generatedSceneUrl && (
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
              src={generatedSceneUrl} 
              alt="Enlarged Preview" 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>`;

const modalReplacement = `      <AnimatePresence>
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
                <img src={url} alt={\`History \${idx}\`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>`;
content = content.replace(modalTarget, modalReplacement);

fs.writeFileSync('src/App.tsx', content);
