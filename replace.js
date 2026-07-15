const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {VIRTUAL_ROOMS.map((room) => (
                      <div
                        key={room.id}
                        id={\`virtual-room-card-\${room.id}\`}
                        onClick={() => handleSelectVirtualRoom(room)}
                        className={\`group relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 \${selectedVirtualRoom?.id === room.id ? "border-[#967C55] ring-4 ring-[#967C55]/10 scale-[1.01]" : "border-[#EBE8DF] hover:border-[#967C55]/60 hover:shadow-md"}\`}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-[#EBE8DF]">
                          <img 
                            src={room.imageUrl} 
                            alt={room.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-4">
                          <span className="text-[10px] text-[#D4C2A3] font-bold tracking-wider">{room.style}</span>
                          <h4 className="text-white text-sm font-bold mt-0.5">{room.name}</h4>
                        </div>
                        {selectedVirtualRoom?.id === room.id && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#967C55] text-white flex items-center justify-center shadow-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}`;

const replacement = `                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    {VIRTUAL_ROOMS.map((room) => (
                      <div
                        key={room.id}
                        id={\`virtual-room-card-\${room.id}\`}
                        onClick={() => handleSelectVirtualRoom(room)}
                        className={\`group relative rounded-3xl overflow-hidden cursor-pointer border-2 transition-all duration-300 p-6 flex flex-col \${selectedVirtualRoom?.id === room.id ? "bg-white border-[#967C55] ring-4 ring-[#967C55]/10 shadow-sm" : "bg-white border-[#EBE8DF] hover:border-[#967C55]/60 hover:shadow-md"}\`}
                      >
                        <div className={\`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors \${selectedVirtualRoom?.id === room.id ? "bg-[#967C55]/10 text-[#967C55]" : "bg-[#FAF9F5] text-[#967C55]/60 group-hover:bg-[#967C55]/10 group-hover:text-[#967C55]"}\`}>
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
                )}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
