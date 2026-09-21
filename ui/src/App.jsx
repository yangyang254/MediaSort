import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  motion,
  AnimatePresence,
  useDragControls,
  useMotionValue,
  animate,
} from "framer-motion";
import {
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle,
  RefreshCw,
  Folder,
  Move,
  Settings,
  X,
  Filter,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Video,
  Play,
  ArrowUpDown,
  LayoutGrid,
} from "lucide-react";
import clsx from "clsx";

// ...

// ... (Other components)

const ZoomableImage = forwardRef(({ src, alt }, ref) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Reset function
  const resetZoom = () => {
    setScale(1);
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  useImperativeHandle(ref, () => ({
    resetZoom,
  }));

  // Reset zoom when src changes
  useEffect(() => {
    // Instant reset without animation when image changes
    setScale(1);
    x.set(0);
    y.set(0);
  }, [src]);

  const handleWheel = (e) => {
    e.stopPropagation();
    const delta = -Math.sign(e.deltaY) * 0.25;
    const newScale = Math.min(Math.max(1, scale + delta), 8);
    setScale(newScale);

    // If zooming out to 1, animate reset position
    if (newScale === 1) {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
      onWheel={handleWheel}
      onPointerDown={(e) => {
        if (scale > 1) {
          // Panning a zoomed image wins over the "drag to folder" gesture.
          e.stopPropagation();
          dragControls.start(e);
        }
      }}
      style={{ touchAction: "none" }}
    >
      {/* Controls */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 hover:opacity-100 transition-opacity z-50"
        data-no-drag
      >
        <button
          className="p-1.5 hover:text-blue-400 text-white transition active:scale-90"
          onClick={(e) => {
            e.stopPropagation();
            const newScale = Math.max(1, scale - 0.5);
            setScale(newScale);
            if (newScale === 1) {
              animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
              animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
            }
          }}
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs font-mono min-w-[3rem] text-center text-gray-300">
          {Math.round(scale * 100)}%
        </span>
        <button
          className="p-1.5 hover:text-blue-400 text-white transition active:scale-90"
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.min(8, s + 0.5));
          }}
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-4 bg-white/20 mx-1"></div>
        <button
          className="p-1.5 hover:text-blue-400 text-white transition active:scale-90"
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <motion.img
        src={src}
        alt={alt}
        className={clsx(
          "relative max-w-full max-h-full object-contain z-10 transition-shadow",
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        )}
        animate={{ scale }}
        // Bind motion values to style (framer motion handles this efficiently)
        style={{
          x,
          y,
          boxShadow:
            scale > 1 ? "0 20px 50px -12px rgba(0, 0, 0, 0.5)" : "none",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        // Native image dragging would hijack the pointer stream.
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        drag={scale > 1}
        dragListener={false}
        dragControls={dragControls}
        // Remove tight constraints, allow free movement but with friction if going far
        dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
        dragElastic={0.05}
      />
    </div>
  );
});

const MetadataPanel = ({ data, onClose }) => {
  if (!data) return null;

  const items = [
    { label: "Resolution", value: data.resolution },
    { label: "Size", value: data.size },
    { label: "Format", value: data.format },
    { label: "Date", value: data.date },
    { label: "Camera", value: data.camera },
    { label: "ISO", value: data.iso },
    { label: "Aperture", value: data.aperture },
    { label: "Shutter", value: data.shutter },
  ];

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="absolute top-16 right-0 bottom-20 w-64 bg-black/40 backdrop-blur-xl border-l border-white/10 p-6 z-20 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Info size={18} className="text-blue-400" /> Info
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {items.map(
          (item, idx) =>
            item.value && (
              <div key={idx} className="group">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  {item.label}
                </span>
                <span className="text-sm text-gray-200 font-mono break-words">
                  {item.value}
                </span>
              </div>
            ),
        )}
        <div className="pt-4 border-t border-white/10">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
            Filename
          </span>
          <span className="text-xs text-gray-400 break-all">
            {data.filename}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// --- DESTINATION SHORTCUTS & DRAG HELPERS ---

// Destination shortcuts follow keyboard reading order: the number row (1..9 then
// 0), then QWERTYUIOP, ASDFGHJKL and ZXCVBNM. Cards past this list get no key.
const DESTINATION_KEY_ORDER = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
  "q", "w", "e", "r", "t", "y", "u", "i", "o", "p",
  "a", "s", "d", "f", "g", "h", "j", "k", "l",
  "z", "x", "c", "v", "b", "n", "m",
];

// Label shown on the card badge; null means "no keyboard shortcut".
const shortcutLabelForIndex = (index) => DESTINATION_KEY_ORDER[index] ?? null;

// The printable character a key event stands for, lower-cased. Physical key
// codes are checked first, so caps lock, shift and IME state cannot change which
// folder a press selects. Numpad digits map to the same slots as the top row.
const keyCharFromEvent = (e) => {
  const code = e.code || "";
  const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  if (digit) return digit[1];
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1].toLowerCase();

  const key = e.key;
  if (typeof key === "string" && key.length === 1) {
    if (/[0-9]/.test(key)) return key;
    if (/[a-zA-Z]/.test(key)) return key.toLowerCase();
  }
  return null;
};

// Index of the destination a key press selects, or -1 for "not a folder key".
const destinationIndexForKey = (e) => {
  const char = keyCharFromEvent(e);
  return char === null ? -1 : DESTINATION_KEY_ORDER.indexOf(char);
};

// True when that key is also bound to Next/Previous/Delete in the settings.
const isKeyReservedForAction = (label, shortcuts) => {
  if (!label || !shortcuts) return false;
  return Object.values(shortcuts).some(
    (bound) =>
      typeof bound === "string" && bound.toLowerCase() === label.toLowerCase(),
  );
};

const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm"];

const isVideoFilename = (filename) =>
  !!filename &&
  VIDEO_EXTENSIONS.includes(filename.split(".").pop().toLowerCase());

// Single place that builds local Flask URLs for a media file.
const buildAssetUrl = (sourcePath, filename, endpoint) => {
  if (!sourcePath || !filename) return null;
  const sep = sourcePath.includes("\\") ? "\\" : "/";
  const fullPath = `${sourcePath}${sep}${filename}`;
  return `http://127.0.0.1:23456/${endpoint}?path=${encodeURIComponent(fullPath)}`;
};

// --- DOCK APPEARANCE ---

// Folder card sizes offered in Settings. Class strings are written out in full
// so Tailwind's scanner picks them up.
const CARD_SIZES = {
  small: {
    key: "small",
    label: "Small",
    box: "w-20 h-[76px]",
    height: 76,
    iconSize: 12,
    badge: "w-4 h-4 text-[8px]",
    name: "text-[9px] line-clamp-4",
    nameLong: "text-[8px] line-clamp-4",
    innerGap: "gap-0.5",
  },
  medium: {
    key: "medium",
    label: "Medium",
    box: "w-24 h-[88px]",
    height: 88,
    iconSize: 15,
    badge: "w-5 h-5 text-[9px]",
    name: "text-[10px] line-clamp-4",
    nameLong: "text-[9px] line-clamp-4",
    innerGap: "gap-1",
  },
  large: {
    key: "large",
    label: "Large",
    box: "w-28 h-[104px]",
    height: 104,
    iconSize: 18,
    badge: "w-5 h-5 text-[10px]",
    name: "text-[11px] line-clamp-5",
    nameLong: "text-[9px] line-clamp-5",
    innerGap: "gap-1",
  },
};
const DEFAULT_CARD_SIZE = "medium";
const DOCK_ROW_OPTIONS = [1, 2, 3];
const DEFAULT_DOCK_ROWS = 2;
const DOCK_GAP_PX = 6;
const DOCK_PADDING_PX = 24; // py-3 top and bottom
const LONG_NAME_THRESHOLD = 24;

// Pointer travel before a press turns into a drag (keeps plain clicks working).
const DRAG_THRESHOLD_PX = 6;
// Bottom strip of a <video> occupied by its native controls.
const VIDEO_CONTROLS_STRIP_PX = 48;

// Tears down the window listeners of an in-flight drag session.
const releaseDragSession = (sessionRef) => {
  const session = sessionRef.current;
  if (!session) return;
  window.removeEventListener("pointermove", session.move);
  window.removeEventListener("pointerup", session.up);
  window.removeEventListener("pointercancel", session.cancel);
  window.removeEventListener("keydown", session.key);
  if (session.raf) cancelAnimationFrame(session.raf);
  sessionRef.current = null;
  document.body.classList.remove("mediasort-dragging");
};

// --- API HANDLING ---

// pywebview injects window.pywebview only after the page has loaded, so a call
// made during the first render would silently fall back to the dev mocks (and
// the session would never be restored). Wait for 'pywebviewready', with a
// polling fallback in case the event already fired.
const waitForBridge = (timeoutMs = 5000) =>
  new Promise((resolve) => {
    if (window.pywebview?.api) {
      resolve(true);
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      resolve(!!window.pywebview?.api);
    };
    window.addEventListener("pywebviewready", finish, { once: true });
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.pywebview?.api || Date.now() - started >= timeoutMs) finish();
    }, 100);
  });

const callApi = async (method, ...args) => {
  // Check dynamically because pywebview is injected asynchronously
  if (window.pywebview) {
    try {
      return await window.pywebview.api[method](...args);
    } catch (error) {
      console.error(`API Error (${method}):`, error);
      return null;
    }
  } else {
    // Mocks for browser dev
    console.log(`Mock Call: ${method}`, args);
    if (method === "select_folder") return "C:/Users/Mock/Pictures/Vacation";
    if (method === "scan_images")
      return Array.from({ length: 5 }, (_, i) => `photo_${i + 1}.jpg`);
    if (method === "load_image")
      return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
    if (method === "move_image") return { success: true };
    if (method === "delete_image") return { success: true };
    if (method === "restore_image") return { success: true };
    // Browser dev: emulate the backend state file with localStorage, so a page
    // reload behaves like a real app restart.
    if (method === "load_state") {
      try {
        return JSON.parse(localStorage.getItem("mediasort_state") || "null");
      } catch {
        return null;
      }
    }
    if (method === "save_state") {
      try {
        localStorage.setItem("mediasort_state", JSON.stringify(args[0]));
      } catch {
        /* ignore quota errors in dev */
      }
      return { success: true };
    }
    if (method === "get_image_metadata")
      return {
        resolution: "1920x1080",
        size: "2.5 MB",
        format: "JPEG",
        date: "2023:01:01 12:00:00",
        camera: "Sony A7III",
        iso: "100",
        aperture: "f/2.8",
        shutter: "1/200",
      };
    return null;
  }
};

// --- SETTINGS POPUP ---

const SettingsPopup = ({
  isOpen,
  onClose,
  shortcuts,
  onSave,
  cardSize,
  onCardSizeChange,
  dockRows,
  onDockRowsChange,
}) => {
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts);
  const [listening, setListening] = useState(null); // 'next', 'prev', 'delete'

  useEffect(() => {
    if (isOpen) {
      setLocalShortcuts(shortcuts);
      setListening(null); // Reset listening state when opening
    }
  }, [isOpen, shortcuts]);

  useEffect(() => {
    const handlerecord = (e) => {
      if (!listening) return;
      e.preventDefault();
      e.stopPropagation();
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
      const key = e.key;
      setLocalShortcuts((prev) => ({ ...prev, [listening]: key }));
      setListening(null);
    };

    if (listening) {
      window.addEventListener("keydown", handlerecord);
    }
    return () => window.removeEventListener("keydown", handlerecord);
  }, [listening]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-[#09090b] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Settings className="text-indigo-500" size={20} />
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Settings
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dock appearance: applies immediately, no need to hit Save. */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <LayoutGrid size={14} className="text-indigo-400" /> Folder Cards
          </h3>

          <div className="text-xs text-zinc-500 mb-1.5">Card size</div>
          <div className="flex gap-2 mb-4">
            {Object.values(CARD_SIZES).map((size) => (
              <button
                key={size.key}
                onClick={() => onCardSizeChange(size.key)}
                className={clsx(
                  "flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
                  cardSize === size.key
                    ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500",
                )}
              >
                {size.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-zinc-500 mb-1.5">
            Rows in the folder dock
          </div>
          <div className="flex gap-2">
            {DOCK_ROW_OPTIONS.map((rows) => (
              <button
                key={rows}
                onClick={() => onDockRowsChange(rows)}
                className={clsx(
                  "flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
                  dockRows === rows
                    ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500",
                )}
              >
                {rows === 1 ? "1 (scroll)" : rows}
              </button>
            ))}
          </div>
        </div>

        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 pt-6 border-t border-white/5">
          Keyboard Shortcuts
        </h3>

        <div className="space-y-1">
          {[
            { id: "prev", label: "Previous Media", icon: ArrowLeft },
            { id: "next", label: "Next Media", icon: ArrowRight },
            { id: "delete", label: "Move to Trash", icon: Trash2 },
          ].map((action) => (
            <div
              key={action.id}
              className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5"
            >
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    "p-2 rounded-md bg-zinc-900 border border-white/5 transition-colors",
                    action.id === "delete"
                      ? "text-red-400/70 group-hover:text-red-400 group-hover:bg-red-500/10 group-hover:border-red-500/20"
                      : "text-indigo-400/70 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20",
                  )}
                >
                  <action.icon size={16} />
                </div>
                <span className="text-zinc-300 group-hover:text-white transition-colors text-sm font-medium">
                  {action.label}
                </span>
              </div>

              <button
                onClick={() => setListening(action.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-md font-mono text-xs font-semibold border transition-all min-w-[100px] text-center shadow-sm",
                  listening === action.id
                    ? "bg-indigo-500 text-white border-indigo-400 ring-2 ring-indigo-500/20"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800",
                )}
              >
                {listening === action.id
                  ? "Press Key..."
                  : localShortcuts[action.id]}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3 pt-6 border-t border-white/5">
          <div className="flex-1 text-xs text-zinc-500">
            Click a key to rebind.
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-sm h-9 px-4 text-zinc-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(localShortcuts)}
            className="bg-indigo-600 text-white hover:bg-indigo-500 border-none h-9 px-6 text-sm font-semibold shadow-lg shadow-indigo-900/20 rounded-lg transition-all"
          >
            Save Changes
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// --- COMPONENTS ---

// ... (Button, IconButton, DestinationCard components remain unchanged) ...

const Button = ({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
  ...props
}) => {
  const base =
    "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20",
    secondary:
      "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/5",
    danger:
      "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};

const IconButton = ({
  icon: Icon,
  onClick,
  variant = "secondary",
  className,
  disabled,
  size = 20,
}) => {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      disabled={disabled}
      className={clsx("!p-3", className)}
    >
      <Icon size={size} />
    </Button>
  );
};

const DestinationCard = ({
  path,
  index,
  onClick,
  onRemove,
  isDropTarget,
  innerRef,
  shortcuts,
  sizeDef = CARD_SIZES[DEFAULT_CARD_SIZE],
}) => {
  const parts = path.split(/[/\\]/);
  const name = parts[parts.length - 1] || path;
  const shortcutLabel = shortcutLabelForIndex(index);
  // A key already used by Next/Previous/Delete cannot also pick a folder.
  const shortcutTaken = isKeyReservedForAction(shortcutLabel, shortcuts);
  const activeShortcut = shortcutLabel && !shortcutTaken ? shortcutLabel : null;

  return (
    <motion.div
      ref={innerRef}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: isDropTarget ? 1.05 : 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={onClick}
      className={clsx("group relative flex-shrink-0 cursor-pointer", sizeDef.box)}
    >
      <div
        className={clsx(
          "absolute inset-0 rounded-xl border shadow-lg transition-all duration-300",
          isDropTarget
            ? "bg-emerald-500/10 border-emerald-400/80 ring-2 ring-emerald-400/40 shadow-emerald-500/25"
            : "bg-[#0f0f0f] hover:bg-[#151520] border-white/5 hover:border-indigo-500/50 hover:shadow-indigo-500/20",
        )}
      ></div>

      {/* Shortcut Indicator */}
      <div
        title={
          activeShortcut
            ? `Press ${activeShortcut.toUpperCase()} to move here`
            : shortcutTaken
              ? `${shortcutLabel.toUpperCase()} is bound to another action`
              : "No keyboard shortcut"
        }
        className={clsx(
          "absolute top-1 left-1 rounded-md border flex items-center justify-center font-bold uppercase transition-colors z-10",
          sizeDef.badge,
          isDropTarget
            ? "bg-emerald-400 border-emerald-300 text-emerald-950"
            : activeShortcut
              ? "bg-white/5 border-white/5 text-gray-500 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20"
              : "bg-white/5 border-white/5 text-gray-700",
        )}
      >
        {activeShortcut ?? index + 1}
      </div>

      {/* Drop hint */}
      {isDropTarget && (
        <div className="absolute inset-x-0 bottom-0 py-1 rounded-b-xl bg-emerald-400/90 text-emerald-950 text-[9px] font-bold uppercase tracking-wider text-center z-10">
          Drop to move
        </div>
      )}

      {/* Content: the full folder name must stay readable, so it wraps and steps
          down a size for long names. */}
      <div
        className={clsx(
          "absolute inset-0 flex flex-col items-center justify-center px-1.5 py-1.5 text-center",
          sizeDef.innerGap,
        )}
      >
        <div className="p-1.5 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-lg text-gray-400 group-hover:text-white group-hover:from-indigo-500 group-hover:to-violet-500 shadow-inner group-hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-0.5 flex-shrink-0">
          <Folder size={sizeDef.iconSize} />
        </div>
        <span
          title={name}
          className={clsx(
            "font-semibold text-gray-400 group-hover:text-gray-100 leading-[1.15] break-all w-full transition-colors",
            name.length > LONG_NAME_THRESHOLD ? sizeDef.nameLong : sizeDef.name,
          )}
        >
          {name}
        </span>
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(path);
        }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1a1a1a] border border-white/10 hover:bg-red-500 hover:border-red-400 text-gray-400 hover:text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 z-10"
      >
        <X size={10} />
      </button>
    </motion.div>
  );
};

const FilterPopup = ({ filters, onToggle, onClose }) => {
  // Grouped filters for better UX
  const groups = [
    { name: "Common", exts: ["jpg", "jpeg", "png", "webp", "gif"] },
    {
      name: "RAW",
      exts: ["arw", "cr2", "cr3", "nef", "raf", "dng", "orf", "rw2"],
    },
    { name: "Video", exts: ["mp4", "mov", "avi", "mkv", "webm"] },
  ];

  // Flatten all extensions for "Toggle All" logic
  const allExts = groups.flatMap((g) => g.exts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-12 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-4 w-72 z-50 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
        <span className="text-sm font-bold text-gray-300">File Filters</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.name} className="space-y-2">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider pl-1 flex items-center gap-2">
              {group.name === "Video" && <Video size={12} />}
              {group.name === "RAW" && <Settings size={12} />}
              {group.name === "Common" && <ImageIcon size={12} />}
              {group.name}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {group.exts.map((ext) => (
                <button
                  key={ext}
                  onClick={() => onToggle(ext)}
                  className={clsx(
                    "px-2 py-1.5 text-[10px] font-mono rounded-md border transition-all text-center uppercase truncate",
                    filters.includes(ext)
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_-3px_rgba(99,102,241,0.3)]"
                      : "bg-white/5 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-400",
                  )}
                >
                  .{ext}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// --- THUMBNAIL COMPONENT ---

const Thumbnail = ({ filename, sourcePath, current, onClick, onPointerDown }) => {
  const isActive = current;

  // Flask decodes request.args exactly once, so a single encodeURIComponent suffices.
  const src = buildAssetUrl(sourcePath, filename, "thumbnail");

  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={clsx(
        "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all relative group",
        isActive
          ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105 z-10"
          : "border-white/10 hover:border-white/30 opacity-60 hover:opacity-100",
      )}
    >
      <img
        src={src}
        className="w-full h-full object-cover"
        alt={filename}
        loading="lazy"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onError={(e) => {
          e.target.style.display = "none"; // Hide if fails
          // e.target.parentElement.classList.add('bg-red-900'); // Optional visual indicator
        }}
      />
      {isActive && (
        <div className="absolute inset-0 ring-2 ring-blue-500 rounded-lg" />
      )}
    </div>
  );
};

// --- Alert Popup ---

const AlertPopup = ({ isOpen, onClose, onConfirm, title, description }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
        <div className="bg-white/5 px-6 py-4 flex justify-end gap-3">
          <Button
            onClick={onClose}
            className="bg-transparent hover:bg-white/10 text-white border border-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="danger"
            className="bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-900/20"
          >
            Delete
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Error Boundary ---

import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-black text-red-500 p-10 overflow-auto whitespace-pre-wrap font-mono relative z-50">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <p className="mb-4">{this.state.error?.toString()}</p>
          <div className="bg-gray-900 p-4 rounded text-sm text-gray-400">
            {this.state.errorInfo?.componentStack}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ... (App component)

function App() {
  // ... (State and hooks)
  const [sourcePath, setSourcePath] = useState(null);
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageSrc, setCurrentImageSrc] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [filters, setFilters] = useState([
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "arw",
    "cr2",
    "cr3",
    "nef",
    "raf",
    "dng",
    "orf",
    "rw2",
    "mp4",
    "mov",
    "avi",
    "mkv",
    "webm",
  ]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [history, setHistory] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [showMetadata, setShowMetadata] = useState(false);

  // Shortcuts State
  const DEFAULT_SHORTCUTS = {
    prev: "ArrowLeft",
    next: "ArrowRight",
    delete: "Delete",
  };
  const [shortcuts, setShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem("mediasort_shortcuts");
      return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [sortConfig, setSortConfig] = useState({ by: "name", order: "asc" }); // 'name', 'date', 'size'
  const [showSort, setShowSort] = useState(false);

  // Dock appearance, persisted together with the session.
  const [cardSize, setCardSize] = useState(DEFAULT_CARD_SIZE);
  const [dockRows, setDockRows] = useState(DEFAULT_DOCK_ROWS);
  const [stateLoaded, setStateLoaded] = useState(false);
  const cardSizeDef = CARD_SIZES[cardSize] ?? CARD_SIZES[DEFAULT_CARD_SIZE];

  useEffect(() => {
    localStorage.setItem("mediasort_shortcuts", JSON.stringify(shortcuts));
  }, [shortcuts]);

  // Restore the last session once on startup: source folder, destination
  // folders and dock preferences all come back automatically.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await waitForBridge();
      const state = await callApi("load_state");
      if (cancelled) return;
      if (state) {
        // Never clobber something the user already did while the state file was
        // still being read (the bridge call is async and can land late).
        if (state.source) setSourcePath((prev) => prev ?? state.source);
        if (Array.isArray(state.destinations) && state.destinations.length) {
          setDestinations((prev) => (prev.length ? prev : state.destinations));
        }
        if (CARD_SIZES[state.card_size]) setCardSize(state.card_size);
        if (DOCK_ROW_OPTIONS.includes(state.dock_rows)) {
          setDockRows(state.dock_rows);
        }
      }
      setStateLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist whenever the session changes. Guarded by stateLoaded, so the
  // restore pass cannot overwrite the stored state with empty defaults.
  useEffect(() => {
    if (!stateLoaded) return undefined;
    const timer = setTimeout(() => {
      callApi("save_state", {
        source: sourcePath,
        destinations,
        card_size: cardSize,
        dock_rows: dockRows,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [stateLoaded, sourcePath, destinations, cardSize, dockRows]);

  const imageRef = useRef(null);
  const thumbnailRefs = useRef([]); // Ensure initialized

  // --- Drag preview -> destination state ---
  // dragPayload: only set while a drag is actually in flight (drives the ghost).
  const [dragPayload, setDragPayload] = useState(null);
  const [dragOverPath, setDragOverPath] = useState(null);
  const destinationRefs = useRef(new Map()); // destination path -> DOM node
  const ghostRef = useRef(null);
  const dragSessionRef = useRef(null);
  const videoRef = useRef(null);
  const suppressClickUntilRef = useRef(0);

  // Abort any drag that is still listening when the app unmounts.
  useEffect(() => () => releaseDragSession(dragSessionRef), []);

  // ... (Logic methods)
  // ...

  // ... (Effects)

  // ... (Key handlers)

  // --- Render ---

  // --- Logic ---

  // Carousel window logic
  // Show 3 previous and up to 12 next images
  const carouselStartIndex = Math.max(0, currentIndex - 3);
  const carouselEndIndex = Math.min(images.length, currentIndex + 12);
  const carouselImages = images.slice(carouselStartIndex, carouselEndIndex);

  const loadRef = useRef(currentIndex);

  const scan = async () => {
    if (!sourcePath) return;
    setLoading(true);
    // Pass sort config to backend
    const imgs = await callApi(
      "scan_images",
      sourcePath,
      filters,
      sortConfig.by,
      sortConfig.order,
    );
    setImages(imgs || []);
    // Reset index if out of bounds or just 0
    setCurrentIndex(0);
    setLoading(false);
  };

  // Rescan when filters change, but only if source is selected
  useEffect(() => {
    if (sourcePath) {
      scan();
    }
  }, [filters, sourcePath, sortConfig]);

  useEffect(() => {
    loadRef.current = currentIndex; // Update ref

    if (!images.length || currentIndex >= images.length) {
      setCurrentImageSrc(null);
      setMetadata(null);
      return;
    }

    const load = async () => {
      setLoadingImage(true);
      const filename = images[currentIndex];
      const sep = sourcePath.includes("\\") ? "\\" : "/";
      const fullPath = `${sourcePath}${sep}${filename}`;

      // OPTIMIZATION: Use direct HTTP URL instead of Base64 via Bridge
      // This is much faster and lighter on memory
      const url = `http://127.0.0.1:23456/view?path=${encodeURIComponent(fullPath)}`;

      const ext = filename.split(".").pop().toLowerCase();
      const isVideo = ["mp4", "mov", "avi", "mkv", "webm"].includes(ext);

      if (isVideo) {
        // Keep video| prefix for render logic
        setCurrentImageSrc(`video|${url}`);
      } else {
        setCurrentImageSrc(url);
      }

      setLoadingImage(false);

      // Fetch metadata (keep as API call since it uses Pillow/Exif)
      const meta = await callApi("get_image_metadata", fullPath);
      if (currentIndex === loadRef.current) {
        setMetadata(meta);
      }
    };
    load();
  }, [currentIndex, images, sourcePath]);

  const handleUndo = async () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];
    let res;

    if (lastAction.type === "move") {
      res = await callApi(
        "move_image",
        lastAction.filename,
        lastAction.to,
        lastAction.from,
      );
    } else if (lastAction.type === "delete") {
      res = await callApi(
        "restore_image",
        lastAction.filename,
        lastAction.from,
      );
    }

    if (res && res.success) {
      setHistory((prev) => prev.slice(0, -1));
      const newImages = [lastAction.filename, ...images];
      setImages(newImages);
      setCurrentIndex(0);
    } else {
      alert("Undo failed: " + (res?.error || "Unknown error"));
    }
  };

  const handleSelectSource = async () => {
    const path = await callApi("select_folder");
    if (path) {
      setSourcePath(path);
      // The useEffect [filters, sourcePath] will trigger scan() automatically
    }
  };

  const handleToggleFilter = (ext) => {
    setFilters((prev) =>
      prev.includes(ext) ? prev.filter((f) => f !== ext) : [...prev, ext],
    );
  };

  const handleAddDestination = async () => {
    const path = await callApi("select_folder");
    if (path && !destinations.includes(path)) {
      setDestinations([...destinations, path]);
    }
  };

  const handleRemoveDestination = (path) => {
    setDestinations(destinations.filter((d) => d !== path));
  };

  // Moves one file into a destination folder. Works for the current preview as
  // well as for any thumbnail dragged out of the carousel.
  const moveFileToDestination = async (destPath, filename, fileIndex) => {
    if (!destPath || !filename) return;

    const index =
      typeof fileIndex === "number" && images[fileIndex] === filename
        ? fileIndex
        : images.indexOf(filename);
    if (index < 0) return;

    const res = await callApi("move_image", filename, sourcePath, destPath);

    if (res && res.success) {
      setHistory((prev) => [
        ...prev,
        { type: "move", filename, from: sourcePath, to: destPath },
      ]);
      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);
      setCurrentIndex((prev) => {
        if (index < prev) return Math.max(0, prev - 1);
        if (index === prev) return Math.max(0, Math.min(prev, newImages.length - 1));
        return prev;
      });
    } else {
      alert("Failed to move file: " + (res?.error || "Unknown error"));
    }
  };

  const handleMove = (destPath) =>
    moveFileToDestination(destPath, images[currentIndex], currentIndex);

  // --- Drag the preview (or a carousel thumbnail) onto a destination card ---

  const registerDestinationRef = (path, el) => {
    if (el) destinationRefs.current.set(path, el);
    else destinationRefs.current.delete(path);
  };

  // Returns the destination path under the given viewport point, if any.
  const findDestinationAt = (x, y) => {
    let hit = null;
    destinationRefs.current.forEach((el, path) => {
      if (hit !== null) return;
      const rect = el.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        hit = path;
      }
    });
    return hit;
  };

  const positionGhost = (x, y) => {
    const el = ghostRef.current;
    if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const startClassificationDrag = (e, filename) => {
    if (!filename || e.button !== 0 || !destinations.length) return;
    if (!images.includes(filename)) return;
    // Interactive overlays (zoom bar, info chips...) opt out via data-no-drag.
    if (e.target?.closest?.("[data-no-drag]")) return;
    // Pressing the native video control strip must not start a drag.
    if (e.target?.tagName === "VIDEO") {
      const rect = e.target.getBoundingClientRect();
      if (e.clientY > rect.bottom - VIDEO_CONTROLS_STRIP_PX) return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const session = { move: null, up: null, cancel: null, key: null, raf: 0 };
    let active = false;
    let pending = null;

    const onMove = (ev) => {
      if (!active) {
        if (
          Math.hypot(ev.clientX - startX, ev.clientY - startY) <
          DRAG_THRESHOLD_PX
        ) {
          return;
        }
        active = true;
        // Swallow the click that the browser would fire on release.
        suppressClickUntilRef.current = Date.now() + 400;
        document.body.classList.add("mediasort-dragging");
        // A playing video keeps the file locked by the media stack on Windows;
        // pause it before it has to be moved.
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        positionGhost(ev.clientX, ev.clientY);
        setDragPayload({
          filename,
          thumbUrl: buildAssetUrl(sourcePath, filename, "thumbnail"),
          isVideo: isVideoFilename(filename),
          x: ev.clientX,
          y: ev.clientY,
        });
      }

      pending = ev;
      if (session.raf) return;
      session.raf = requestAnimationFrame(() => {
        session.raf = 0;
        if (!pending) return;
        positionGhost(pending.clientX, pending.clientY);
        const over = findDestinationAt(pending.clientX, pending.clientY);
        setDragOverPath((prev) => (prev === over ? prev : over));
      });
    };

    const finish = (ev, cancelled) => {
      releaseDragSession(dragSessionRef);
      if (!active) return;
      const over = cancelled
        ? null
        : findDestinationAt(ev.clientX, ev.clientY);
      setDragPayload(null);
      setDragOverPath(null);
      if (over) moveFileToDestination(over, filename);
    };

    session.move = onMove;
    session.up = (ev) => finish(ev, false);
    session.cancel = (ev) => finish(ev, true);
    session.key = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        finish(ev, true);
      }
    };

    dragSessionRef.current = session;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", session.up);
    window.addEventListener("pointercancel", session.cancel);
    window.addEventListener("keydown", session.key);
  };

  const handleDeleteClick = () => {
    if (!images[currentIndex]) return;
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    setShowDeleteAlert(false);
    if (!images[currentIndex]) return;

    const filename = images[currentIndex];
    const res = await callApi("delete_image", filename, sourcePath);

    if (res && res.success) {
      setHistory((prev) => [
        ...prev,
        { type: "delete", filename, from: sourcePath },
      ]);
      const newImages = [...images];
      newImages.splice(currentIndex, 1);
      setImages(newImages);
      if (currentIndex >= newImages.length) {
        setCurrentIndex(Math.max(0, newImages.length - 1));
      }
    } else {
      alert("Failed to delete image: " + (res?.error || "Unknown error"));
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) setCurrentIndex((c) => c + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((c) => c - 1);
  };

  useEffect(() => {
    const handleKey = (e) => {
      // Ignore if typing in an input (if we had any) or if settings open
      if (showSettings) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ignore if no images
      if (!images.length) return;

      // Key comparisons are case-insensitive, so "W" and "w" behave the same.
      const pressedKey = typeof e.key === "string" ? e.key.toLowerCase() : "";
      const matchesAction = (bound) =>
        typeof bound === "string" && bound.toLowerCase() === pressedKey;

      if (matchesAction(shortcuts.next)) handleNext();
      if (matchesAction(shortcuts.prev)) handlePrev();
      if (matchesAction(shortcuts.delete)) handleDeleteClick();

      // Modifier combos (Ctrl+1, Alt+3...) belong to the host application.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // A key already bound to Next/Previous/Delete keeps that meaning.
      if (isKeyReservedForAction(keyCharFromEvent(e), shortcuts)) return;

      // 1..9 -> cards 1..9, 0 -> card 10, then QWERTYUIOP / ASDFGHJKL / ZXCVBNM.
      const destIndex = destinationIndexForKey(e);
      if (destIndex >= 0 && destIndex < destinations.length) {
        e.preventDefault();
        moveFileToDestination(
          destinations[destIndex],
          images[currentIndex],
          currentIndex,
        );
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [destinations, currentIndex, images, history, shortcuts, showSettings]);

  // --- Render ---

  if (!sourcePath) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-purple-600/10 rounded-full blur-[100px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center space-y-8 max-w-2xl px-6"
        >
          <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-3xl relative">
              <FolderOpen size={64} className="text-blue-500" />
            </div>
          </div>

          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              Video and Image <span className="text-blue-500">Sorter</span>
            </h1>
            <p className="text-xl text-gray-400 font-light">
              Organize your chaos. The fastest way to sort thousands of media.
            </p>
          </div>

          <Button
            onClick={handleSelectSource}
            className="mx-auto !text-lg !px-8 !py-4 shadow-blue-900/20"
          >
            <FolderOpen size={24} />
            Open Source Folder
          </Button>
        </motion.div>
      </div>
    );
  }

  const isDone = images.length === 0 && !loading;

  return (
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden relative font-sans selection:bg-indigo-500/30">
      {/* Global Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-400 font-bold tracking-widest animate-pulse">
            SCANNING FOLDER...
          </p>
        </div>
      )}
      {/* Refined Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] left-[10%] w-[70%] h-[50%] bg-indigo-900/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[60%] bg-fuchsia-900/05 rounded-full blur-[130px]" />
      </div>

      {/* Modern Glass Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#050505]/60 backdrop-blur-xl z-20 relative shadow-sm">
        <div className="flex items-center gap-5">
          <div className="group flex items-center gap-3 cursor-default">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <FolderOpen size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest leading-none mb-1">
                Source
              </span>
              <span
                className="text-sm font-semibold truncate max-w-[250px] text-gray-100"
                title={sourcePath}
              >
                {sourcePath.split(/[/\\]/).pop()}
              </span>
            </div>
          </div>
          <Button
            onClick={handleSelectSource}
            variant="ghost"
            className="!px-3 !py-1.5 text-xs gap-1.5 h-auto text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all"
          >
            <RefreshCw size={12} /> Change
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2.5 backdrop-blur-md">
            <ImageIcon size={14} className="text-indigo-400" />
            <span className="text-sm font-medium text-gray-200">
              {images.length} <span className="text-gray-500">pending</span>
            </span>
          </div>

          <div className="w-px h-6 bg-white/10 mx-2"></div>

          {/* Undo Button */}
          <Button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="!p-2.5 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white disabled:opacity-20 transition-all"
            title="Undo (Ctrl+Z)"
            variant="ghost"
          >
            <RotateCcw size={18} />
          </Button>

          {/* Delete Button */}
          <Button
            onClick={handleDeleteClick}
            className="!p-2.5 w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 text-red-500 hover:text-red-400 transition-all"
            title="Delete Image (Del)"
            variant="ghost"
          >
            <Trash2 size={18} />
          </Button>

          <div className="w-px h-6 bg-white/10 mx-2"></div>

          {/* Tools Group */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
            <Button
              onClick={() => setShowMetadata(!showMetadata)}
              variant="ghost"
              className={clsx(
                "!p-2 w-9 h-9 rounded-lg transition-all",
                showMetadata
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5",
              )}
              title="Toggle Info"
            >
              <Info size={18} />
            </Button>

            <Button
              onClick={() => setShowSettings(true)}
              variant="ghost"
              className="!p-2 w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              title="Settings"
            >
              <Settings size={18} />
            </Button>

            {/* Sort Button */}
            <div className="relative">
              <Button
                onClick={() => setShowSort(!showSort)}
                variant="ghost"
                className={clsx(
                  "!p-2 w-9 h-9 rounded-lg transition-all",
                  showSort
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
                title="Sort Files"
              >
                <ArrowUpDown size={18} />
              </Button>
              <AnimatePresence>
                {showSort && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 0 }}
                    animate={{ opacity: 1, scale: 1, y: 4 }}
                    exit={{ opacity: 0, scale: 0.95, y: 0 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-full right-0 w-56 bg-[#09090b] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 ring-1 ring-black/5"
                  >
                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 ml-1">
                      Sort Order
                    </div>
                    {[
                      { label: "Name (A-Z)", by: "name", order: "asc" },
                      { label: "Name (Z-A)", by: "name", order: "desc" },
                      { label: "Date (Newest)", by: "date", order: "desc" },
                      { label: "Date (Oldest)", by: "date", order: "asc" },
                      { label: "Size (Largest)", by: "size", order: "desc" },
                      { label: "Size (Smallest)", by: "size", order: "asc" },
                    ].map((opt) => {
                      const isActive =
                        sortConfig.by === opt.by &&
                        sortConfig.order === opt.order;
                      return (
                        <button
                          key={opt.label}
                          onClick={() => {
                            setSortConfig({ by: opt.by, order: opt.order });
                            setShowSort(false);
                          }}
                          className={clsx(
                            "text-left px-3 py-2 rounded-lg text-sm transition-all flex justify-between items-center group relative",
                            isActive
                              ? "bg-indigo-500/10 text-indigo-400 font-medium"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                          )}
                        >
                          <span className="z-10">{opt.label}</span>
                          {isActive && (
                            <motion.div
                              layoutId="sortActive"
                              className="absolute inset-0 rounded-lg bg-indigo-500/5 border border-indigo-500/10"
                            />
                          )}
                          {isActive && (
                            <CheckCircle size={14} className="z-10" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                className={clsx(
                  "!p-2 w-9 h-9 rounded-lg transition-all",
                  showFilters
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                <Filter size={18} />
                {filters.length !== 13 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#1e1e1e]"></span>
                )}
              </Button>

              <AnimatePresence>
                {showFilters && (
                  <FilterPopup
                    filters={filters}
                    onToggle={handleToggleFilter}
                    onClose={() => setShowFilters(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative z-10 flex-col">
        <AnimatePresence>
          {showMetadata && (
            <MetadataPanel
              data={metadata}
              onClose={() => setShowMetadata(false)}
            />
          )}
        </AnimatePresence>

        <div className="flex-1 flex w-full relative">
          {/* Left Nav */}
          <div className="w-20 hidden md:flex items-center justify-center">
            <IconButton
              icon={ArrowLeft}
              onClick={handlePrev}
              disabled={currentIndex === 0 || isDone}
              className="!w-12 !h-12 !rounded-full !bg-white/5 hover:!bg-white/10 !border-none"
              size={24}
            />
          </div>

          {/* Center Canvas */}
          <div
            className="flex-1 flex flex-col items-center justify-center p-4 min-h-0"
            onClick={(e) => {
              // Reset zoom if clicking the padding area (outside image container)
              if (e.target === e.currentTarget) {
                imageRef.current?.resetZoom();
              }
            }}
          >
            <div className="relative w-full h-full max-w-5xl max-h-full flex flex-col">
              {/* Image Container */}
              <div
                className="flex-1 relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-[0_0_60px_-15px_rgba(79,70,229,0.1)] flex items-center justify-center group ring-1 ring-white/5"
                onPointerDown={(e) =>
                  startClassificationDrag(e, images[currentIndex])
                }
              >
                {/* Content */}
                {isDone ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={48} className="text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">All Caught Up!</h2>
                    <p className="text-gray-400 mb-8">This folder is empty.</p>
                    <Button onClick={handleSelectSource} variant="secondary">
                      <RefreshCw size={18} /> Select New Folder
                    </Button>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-1">
                    {loadingImage ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-500 uppercase tracking-widest">
                          Loading
                        </span>
                      </div>
                    ) : currentImageSrc ? (
                      <>
                        {/* Blurred Background for Fill */}
                        {!currentImageSrc.startsWith("video|") && (
                          <div
                            className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-125 saturate-150 transition-all duration-500"
                            style={{
                              backgroundImage: `url(${currentImageSrc})`,
                            }}
                          />
                        )}

                        {currentImageSrc.startsWith("video|") ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/80 relative z-10">
                            <video
                              ref={videoRef}
                              src={currentImageSrc.substring(6)}
                              type={
                                images[currentIndex].endsWith(".mp4")
                                  ? "video/mp4"
                                  : images[currentIndex].endsWith(".webm")
                                    ? "video/webm"
                                    : images[currentIndex].endsWith(".mov")
                                      ? "video/mp4"
                                      : undefined
                              }
                              controls
                              autoPlay
                              muted
                              playsInline
                              preload="auto"
                              className="max-w-full max-h-full rounded-lg shadow-2xl"
                              onError={(e) => console.error("Video Error:", e)}
                            />
                          </div>
                        ) : (
                          <ZoomableImage
                            ref={imageRef}
                            src={currentImageSrc}
                            alt=""
                          />
                        )}
                      </>
                    ) : (
                      <div className="text-gray-600 flex flex-col items-center">
                        <ImageIcon size={48} className="mb-2 opacity-20" />
                        <p>No Preview Available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Info Overlay */}
                {!isDone && (
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20 pointer-events-none">
                    <div
                      data-no-drag
                      className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-sm font-mono text-gray-300 pointer-events-auto"
                    >
                      {images[currentIndex]}
                    </div>
                    <div
                      data-no-drag
                      className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs font-bold text-gray-400 flex items-center pointer-events-auto"
                    >
                      {currentIndex + 1} / {images.length}
                    </div>
                  </div>
                )}

                {/* Drag hint */}
                {!isDone && currentImageSrc && (
                  <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-200 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                    <Move size={12} className="text-indigo-400" />
                    Drag to a folder below
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Nav */}
          <div className="w-20 hidden md:flex items-center justify-center">
            <IconButton
              icon={ArrowRight}
              onClick={handleNext}
              disabled={currentIndex === images.length - 1 || isDone}
              className="!w-12 !h-12 !rounded-full !bg-white/5 hover:!bg-white/10 !border-none"
              size={24}
            />
          </div>
        </div>

        {/* Thumbnail Carousel */}
        {!isDone && (
          <div className="h-28 w-full border-t border-white/5 bg-black/10 backdrop-blur-sm flex items-center justify-center relative">
            <div className="flex gap-2 p-4 overflow-hidden mask-linear-fade max-w-full">
              {/* Previous Indicator */}
              {carouselStartIndex > 0 && (
                <div className="w-8 flex items-center justify-center text-gray-600">
                  ...
                </div>
              )}

              {carouselImages.map((image, idx) => {
                if (!image || typeof image !== "string") return null;
                const actualIdx = carouselStartIndex + idx;
                const isCurrent = actualIdx === currentIndex;
                const ext = image.split(".").pop().toLowerCase();
                const isVideoFile = [
                  "mp4",
                  "mov",
                  "avi",
                  "mkv",
                  "webm",
                ].includes(ext);

                return (
                  <button
                    key={image || idx}
                    ref={(el) => (thumbnailRefs.current[actualIdx] = el)}
                    onPointerDown={(e) => startClassificationDrag(e, image)}
                    onClick={() => {
                      // This click is the tail of a drag: keep the current file.
                      if (Date.now() < suppressClickUntilRef.current) return;
                      setCurrentIndex(actualIdx);
                    }}
                    className={clsx(
                      "relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all duration-300 transform group",
                      isCurrent
                        ? "ring-2 ring-indigo-500 scale-110 z-10 shadow-lg shadow-indigo-500/50"
                        : "opacity-60 hover:opacity-100 hover:scale-105 hover:ring-1 hover:ring-white/20",
                    )}
                  >
                    <Thumbnail
                      filename={image}
                      sourcePath={sourcePath}
                      current={isCurrent}
                    />

                    {isVideoFile && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                        <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center border border-white/20 shadow-md">
                          <Play
                            size={14}
                            className="fill-white text-white ml-0.5"
                          />
                        </div>
                      </div>
                    )}

                    {/* Gradient Overlay for Text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  </button>
                );
              })}
              {carouselEndIndex < images.length && (
                <div className="w-8 flex items-center justify-center text-gray-600">
                  ...
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Dock (Destinations) */}
      <footer className="border-t border-white/5 bg-[#080808]/90 backdrop-blur-2xl z-30 flex flex-col shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-3 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-gray-400">
            <Move size={14} className="text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Destinations
            </span>
          </div>

          <button
            onClick={handleAddDestination}
            className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg hover:bg-indigo-500/10"
          >
            <Plus size={14} /> Add Folder
          </button>
        </div>

        {/* One row scrolls sideways; two or more rows wrap and scroll vertically
            once the configured row count is exceeded. */}
        <div
          data-dock
          className={clsx(
            "px-4 py-3 flex gap-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
            dockRows > 1
              ? "flex-wrap content-start overflow-y-auto"
              : "flex-nowrap items-center overflow-x-auto",
          )}
          style={
            dockRows > 1
              ? {
                  maxHeight: `${
                    dockRows * cardSizeDef.height +
                    (dockRows - 1) * DOCK_GAP_PX +
                    DOCK_PADDING_PX
                  }px`,
                }
              : undefined
          }
        >
          <AnimatePresence initial={false}>
            {destinations.map((path, idx) => (
              <DestinationCard
                key={path}
                path={path}
                index={idx}
                onClick={() => handleMove(path)}
                onRemove={handleRemoveDestination}
                isDropTarget={dragOverPath === path}
                innerRef={(el) => registerDestinationRef(path, el)}
                shortcuts={shortcuts}
                sizeDef={cardSizeDef}
              />
            ))}
          </AnimatePresence>

          <button
            onClick={handleAddDestination}
            className={clsx(
              "flex-shrink-0 border border-dashed border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-indigo-400 transition-all group",
              cardSizeDef.box,
            )}
          >
            <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-indigo-500/10 transition-colors">
              <Plus size={16} />
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-center px-1">
              New Folder
            </span>
          </button>
        </div>
      </footer>

      {/* Drag ghost that follows the cursor while sorting */}
      {dragPayload && (
        <div
          ref={ghostRef}
          className="fixed top-0 left-0 z-[200] pointer-events-none"
          style={{
            transform: `translate3d(${dragPayload.x}px, ${dragPayload.y}px, 0)`,
            willChange: "transform",
          }}
        >
          <div className="-translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl bg-[#0b0b0b]/95 border border-emerald-400/40 shadow-[0_12px_40px_-12px_rgba(16,185,129,0.6)] backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/60 flex items-center justify-center flex-shrink-0">
              {dragPayload.thumbUrl ? (
                <img
                  src={dragPayload.thumbUrl}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={16} className="text-gray-500" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-gray-100 truncate max-w-[170px]">
                {dragPayload.filename}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate max-w-[170px]">
                {dragOverPath
                  ? `Move to ${dragOverPath.split(/[/\\]/).pop()}`
                  : "Drop on a folder"}
              </span>
            </div>
            {dragPayload.isVideo && (
              <Video size={14} className="text-gray-500 flex-shrink-0" />
            )}
          </div>
        </div>
      )}

      <AlertPopup
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={confirmDelete}
        title="Delete Image?"
        description={`Are you sure you want to permanently delete "${images[currentIndex] || "this image"}"? This action cannot be undone.`}
      />

      <SettingsPopup
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        shortcuts={shortcuts}
        cardSize={cardSize}
        onCardSizeChange={setCardSize}
        dockRows={dockRows}
        onDockRowsChange={setDockRows}
        onSave={(newShortcuts) => {
          setShortcuts(newShortcuts);
          setShowSettings(false);
        }}
      />
    </div>
  );
}

// Wrap Export
const AppWithBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithBoundary;
