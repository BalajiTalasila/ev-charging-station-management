from pathlib import Path
import re
import shutil

p = Path("src/AIChatbot.js")
s = p.read_text(encoding="utf-8")
original = s

if "const [chatSize, setChatSize]" in s:
    raise SystemExit("Resize state already exists. No changes made.")

required = [
    "import React, { useState } from 'react';",
    "const [isOpen, setIsOpen] = useState(false);",
    "width: '390px'",
    "height: '570px'",
    'aria-label="Close AI Assistant"',
    "{/* Header */}",
]
for anchor in required:
    if anchor not in s:
        raise SystemExit(f"Missing anchor: {anchor}. No changes made.")

backup = p.with_name("AIChatbot.js.before_maximize_resize_final")
shutil.copy2(p, backup)

s = s.replace(
    "import React, { useState } from 'react';",
    "import React, { useRef, useState } from 'react';",
    1,
)

state_anchor = "  const [isOpen, setIsOpen] = useState(false);"
state_code = '''
  const [chatSize, setChatSize] = useState({ width: 460, height: 650 });
  const [isMaximized, setIsMaximized] = useState(false);
  const resizeStart = useRef(null);

  const startChatResize = (event) => {
    if (isMaximized) return;
    event.preventDefault();
    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: chatSize.width,
      height: chatSize.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveChatResize = (event) => {
    if (!resizeStart.current || isMaximized) return;
    const start = resizeStart.current;
    setChatSize({
      width: Math.min(window.innerWidth - 32, Math.max(320, start.width + start.x - event.clientX)),
      height: Math.min(window.innerHeight - 48, Math.max(360, start.height + start.y - event.clientY)),
    });
  };

  const endChatResize = () => {
    resizeStart.current = null;
  };
'''
s = s.replace(state_anchor, state_anchor + state_code, 1)

# Target the popup style only, not the floating launcher.
popup_start = s.find("{/* Chat Popup */}")
if popup_start < 0:
    raise SystemExit("Popup marker not found.")

popup_end = s.find("{/* Header */}", popup_start)
if popup_end < 0:
    raise SystemExit("Header marker not found.")

before = s[:popup_start]
popup = s[popup_start:popup_end]
after = s[popup_end:]

popup = re.sub(r"right: '24px',", "right: isMaximized ? '16px' : '24px',", popup, count=1)
popup = re.sub(r"bottom: '24px',", "bottom: isMaximized ? '16px' : '24px',", popup, count=1)
popup = re.sub(r"width: '390px',", "left: isMaximized ? '16px' : 'auto',\\n            top: isMaximized ? '16px' : 'auto',\\n            width: isMaximized ? 'auto' : `${chatSize.width}px`,", popup, count=1)
popup = re.sub(r"minWidth: '320px',", "minWidth: isMaximized ? 0 : '320px',", popup, count=1)
popup = re.sub(r"height: '570px',", "height: isMaximized ? 'auto' : `${chatSize.height}px`,", popup, count=1)
popup = re.sub(r"minHeight: '360px',", "minHeight: isMaximized ? 0 : '360px',", popup, count=1)
popup = re.sub(r"maxHeight: 'calc\\(100vh - 48px\\)',", "maxHeight: 'calc(100vh - 32px)',", popup, count=1)
popup = re.sub(r"\\s*resize: 'both',", "", popup, count=1)
s = before + popup + after

# Replace the existing close button only.
button_start = s.find('<button', s.find('{/* Header */}'))
if button_start < 0:
    raise SystemExit("Header button not found.")

button_end = s.find('</button>', button_start)
if button_end < 0:
    raise SystemExit("Header button closing tag not found.")
button_end += len('</button>')

buttons = '''
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setIsMaximized((value) => !value)}
                aria-label={isMaximized ? 'Restore AI Assistant' : 'Maximize AI Assistant'}
                title={isMaximized ? 'Restore' : 'Maximize'}
                style={{ width: '34px', height: '34px', border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
              >
                {isMaximized ? '❐' : '□'}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsMaximized(false); }}
                aria-label="Close AI Assistant"
                title="Close"
                style={{ width: '34px', height: '34px', border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '22px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>'''
s = s[:button_start] + buttons + s[button_end:]

handle = '''
          {!isMaximized && (
            <div
              role="separator"
              aria-label="Drag to resize chatbot"
              title="Drag to resize"
              onPointerDown={startChatResize}
              onPointerMove={moveChatResize}
              onPointerUp={endChatResize}
              onPointerCancel={endChatResize}
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                width: '18px',
                height: '18px',
                zIndex: 10,
                cursor: 'nwse-resize',
                touchAction: 'none',
                borderTop: '3px solid #94a3b8',
                borderLeft: '3px solid #94a3b8',
                borderTopLeftRadius: '7px',
              }}
            />
          )}
'''
s = s.replace("{/* Header */}", handle + "{/* Header */}", 1)

checks = [
    "const [chatSize, setChatSize]",
    "const [isMaximized, setIsMaximized]",
    "width: isMaximized ? 'auto'",
    "aria-label={isMaximized ? 'Restore AI Assistant'",
    "Drag to resize chatbot",
]
for check in checks:
    if check not in s:
        raise SystemExit(f"Validation failed: {check}. Original file was not written.")

p.write_text(s, encoding="utf-8")
print("Patch saved successfully.")
print(f"Backup: {backup}")
