const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const roomTarget = `                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleRoomUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      id="room-upload-input"
                      disabled={isRoomAnalyzing}
                    />`;
const roomReplacement = `                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleRoomUpload}
                      onClick={(e) => (e.target as HTMLInputElement).value = ''}
                      className="absolute inset-0 opacity-0 cursor-pointer z-30"
                      id="room-upload-input"
                      disabled={isRoomAnalyzing}
                    />`;
content = content.replace(roomTarget, roomReplacement);

const lampTarget = `                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLampUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    id="lamp-upload-input"
                    disabled={isLampAnalyzing}
                  />`;
const lampReplacement = `                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLampUpload}
                    onClick={(e) => (e.target as HTMLInputElement).value = ''}
                    className="absolute inset-0 opacity-0 cursor-pointer z-30"
                    id="lamp-upload-input"
                    disabled={isLampAnalyzing}
                  />`;
content = content.replace(lampTarget, lampReplacement);

fs.writeFileSync('src/App.tsx', content);
