import os
import shutil
import base64
import json
import time
import webview
from threading import Thread
import sys
import io
import datetime
from flask import Flask, send_file, request, Response
from flask_cors import CORS
from functools import lru_cache

# A PyInstaller windowed build has no console: sys.stdout/sys.stderr are either
# None or throw-away streams, so the diagnostic print() calls sprinkled through
# the pywebview bridge below would crash or vanish. Point them at a log file
# (%TEMP%\MediaSort.log); plain `python app.py` keeps using the console.
if getattr(sys, "frozen", False):
    import tempfile

    try:
        _log_stream = open(
            os.path.join(tempfile.gettempdir(), "MediaSort.log"),
            "a",
            encoding="utf-8",
            buffering=1,
        )
        sys.stdout = _log_stream
        sys.stderr = _log_stream
    except Exception:
        pass

# --- Persistent state --------------------------------------------------------
# The last session (source folder + destination folders) and the dock
# preferences live in a small JSON file, so the next launch can restore them.
STATE_DIR = os.path.join(
    os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"), "MediaSort"
)
STATE_FILE = os.path.join(STATE_DIR, "settings.json")
CARD_SIZES = ("small", "medium", "large")
DOCK_ROWS = (1, 2, 3)
DEFAULT_STATE = {
    "source": None,
    "destinations": [],
    "card_size": "medium",
    "dock_rows": 2,
}


def clean_state(raw):
    """Coerce whatever is on disk into a safe, well-formed state object."""
    state = dict(DEFAULT_STATE)
    if not isinstance(raw, dict):
        return state

    source = raw.get("source")
    if isinstance(source, str) and os.path.isdir(source):
        state["source"] = source

    destinations = []
    seen = set()
    for path in raw.get("destinations") or []:
        # Dead paths are dropped: keeping one would let a later move silently
        # recreate a folder the user deleted on purpose.
        if isinstance(path, str) and path not in seen and os.path.isdir(path):
            seen.add(path)
            destinations.append(path)
    state["destinations"] = destinations

    if raw.get("card_size") in CARD_SIZES:
        state["card_size"] = raw["card_size"]
    try:
        rows = int(raw.get("dock_rows"))
    except (TypeError, ValueError):
        rows = DEFAULT_STATE["dock_rows"]
    if rows in DOCK_ROWS:
        state["dock_rows"] = rows
    return state


# --- Flask Server for Streaming ---
server = Flask(__name__)
CORS(server)
PORT = 23456

@server.route('/view')
def serve_file():
    path = request.args.get('path')
    if not path or not os.path.exists(path):
        return "File not found", 404
        
    ext = os.path.splitext(path)[1].lower()
    # Web-safe formats that browser can render directly
    web_safe = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.mp4', '.mov', '.webm', '.ogg'}
    
    if ext in web_safe:
        return send_file(path)
    else:
        # For RAW files or others (CR2, ARW, TIFF), convert to JPEG preview
        try:
            from PIL import Image, ImageOps
            import io
            
            # Use cached converter logic if possible, or just do it here
            with Image.open(path) as img:
                img = ImageOps.exif_transpose(img)
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                else: 
                     img = img.convert('RGB')
                
                # Resize for performance (max FHD)
                img.thumbnail((1920, 1080))
                
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=85)
                buffer.seek(0)
                return send_file(buffer, mimetype='image/jpeg')
        except Exception as e:
            print(f"Error converting view for {path}: {e}")
            return str(e), 500

@server.route('/video')
def serve_video():
    path = request.args.get('path')
    if not path: return "No path", 400
    return send_file(path)

@lru_cache(maxsize=1000)
def get_thumbnail_bytes(path):
    """Generate and cache thumbnail bytes."""
    if not path or not os.path.exists(path):
        return None
    
    img = None
    ext = os.path.splitext(path)[1].lower()
    is_video = ext in {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    
    try:
        from PIL import Image, ImageOps
        if is_video:
            # Video Thumbnail Logic
            try:
                import cv2
                cap = cv2.VideoCapture(path)
                if cap.isOpened():
                    try:
                        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    except: total = 0
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 30 if total > 60 else 0)
                    ret, frame = cap.read()
                    if ret:
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        img = Image.fromarray(frame_rgb)
                    cap.release()
            except: pass
            
            if img is None:
                # Fallback video placeholder
                img = Image.new('RGB', (150, 150), color='#334155') 
                from PIL import ImageDraw
                draw = ImageDraw.Draw(img)
                for y in range(10, 150, 20):
                    draw.rectangle([5, y, 15, y+10], fill='white')
                    draw.rectangle([135, y, 145, y+10], fill='white')
                draw.rectangle([40, 60, 110, 90], outline='white', width=2)
                draw.line([50, 65, 75, 85], fill='white', width=3)
                draw.line([75, 85, 100, 65], fill='white', width=3)
        else:
            # Image Thumbnail Logic
            with Image.open(path) as i:
                i = ImageOps.exif_transpose(i)
                if i.mode in ('RGBA', 'P'): 
                    i = i.convert('RGB')
                i.thumbnail((150, 150))
                img = i.copy()
                
        if img:
            # Ensure max size (already done for image, do for video)
            img.thumbnail((150, 150))
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=70)
            return buffer.getvalue()
            
    except Exception as e:
        print(f"Thumb Gen Error {path}: {e}")
        
    return None

@server.route('/thumbnail')
def serve_thumbnail():
    path = request.args.get('path')
    if not path: return "Missing path", 400
    
    data = get_thumbnail_bytes(path)
    if data:
        return send_file(io.BytesIO(data), mimetype='image/jpeg')
    return "Error", 500

def start_server():
    server.run(host='127.0.0.1', port=PORT, threaded=True)

# Start server in background thread
t = Thread(target=start_server, daemon=True)
t.start()

# Define the API class that will be exposed to JavaScript
class Api:
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def load_state(self):
        """Return the persisted session and UI preferences.

        Called once on startup so the previous source folder, destination
        folders and dock settings come back automatically.
        """
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as handle:
                raw = json.load(handle)
        except FileNotFoundError:
            print("API: load_state -> no state file yet")
            return dict(DEFAULT_STATE)
        except Exception as e:
            print(f"API: Could not read {STATE_FILE}: {e}")
            return dict(DEFAULT_STATE)
        state = clean_state(raw)
        print(
            "API: load_state -> "
            f"source={state['source']} destinations={len(state['destinations'])} "
            f"card={state['card_size']} rows={state['dock_rows']}"
        )
        return state

    def save_state(self, state):
        """Persist the session and UI preferences. Written atomically so a crash
        cannot leave a half-written file behind."""
        try:
            cleaned = clean_state(state)
            os.makedirs(STATE_DIR, exist_ok=True)
            tmp_path = STATE_FILE + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as handle:
                json.dump(cleaned, handle, ensure_ascii=False, indent=2)
            os.replace(tmp_path, STATE_FILE)
            print(
                "API: save_state <- "
                f"source={cleaned['source']} destinations={len(cleaned['destinations'])} "
                f"card={cleaned['card_size']} rows={cleaned['dock_rows']}"
            )
            return {"success": True}
        except Exception as e:
            print(f"API: Could not write {STATE_FILE}: {e}")
            return {"success": False, "error": str(e)}

    def select_folder(self):
        """Open a folder selection dialog and return the path."""
        print("API: select_folder called (using Native PyWebView)")
        try:
            if self._window:
                # Returns a tuple of file paths
                result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
                if result and len(result) > 0:
                    folder_path = result[0]
                    print(f"API: Selected path: {folder_path}")
                    return folder_path
            else:
                 print("API: No window attached for dialog")
            return None
        except Exception as e:
            print(f"API: Error opening dialog: {e}")
            return None

    def scan_images(self, folder_path, allowed_extensions=None, sort_by="name", order="asc"):
        """
        Return a list of image and video filenames in the folder.
        sort_by: name, date, size
        order: asc, desc
        """
        if not folder_path or not os.path.exists(folder_path):
            return []
        
        # Default extensions if none provided
        if not allowed_extensions:
            # Added video extensions
            valid_exts = {
                ".png", ".jpg", ".jpeg", ".gif", ".webp", 
                ".arw", ".cr2", ".cr3", ".nef", ".raf", ".dng", ".orf", ".rw2",
                ".mp4", ".mov", ".avi", ".mkv", ".webm"
            }
        else:
            # Ensure extensions start with dot and are lowercase
            valid_exts = {f".{ext.lower().lstrip('.')}" for ext in allowed_extensions}
            
        try:
            # Collect file entries first to allow sorting
            entries_list = []
            with os.scandir(folder_path) as entries:
                for entry in entries:
                    if entry.is_file():
                        ext = os.path.splitext(entry.name)[1].lower()
                        if ext in valid_exts:
                            entries_list.append(entry)
            
            # Sort Logic
            reverse = (order == "desc")
            if sort_by == "date":
                # Mtime
                entries_list.sort(key=lambda e: e.stat().st_mtime, reverse=reverse)
            elif sort_by == "size":
                # Size
                entries_list.sort(key=lambda e: e.stat().st_size, reverse=reverse)
            else:
                # Name (Natural Sort)
                import re
                def natural_keys(text):
                    return [int(c) if c.isdigit() else c for c in re.split(r'(\d+)', text)]
                entries_list.sort(key=lambda e: natural_keys(e.name), reverse=reverse)
            
            # Return filenames only
            return [e.name for e in entries_list]

        except Exception as e:
            print(f"Error scanning folder: {e}")
            return []

    def load_image(self, path, is_thumbnail=False):
        """
        Read an image file, resize if needed, and return as base64 string.
        For videos:
         - if is_thumbnail: return a generated placeholder image.
         - else: return the absolute file path prefixed with 'video|' for the frontend to handle.
        """
        if not path or not os.path.exists(path):
            return None
        
        ext = os.path.splitext(path)[1].lower()
        is_video = ext in {".mp4", ".mov", ".avi", ".mkv", ".webm"}

        if is_video and not is_thumbnail:
            # Return Streaming URL via Flask
            import urllib.parse
            quoted_path = urllib.parse.quote(path) # Quote safely
            # Note: 127.0.0.1 is safer than localhost for some windows setups
            return f"video|http://127.0.0.1:{PORT}/video?path={quoted_path}"

        try:
            if is_video and is_thumbnail:
                img = None
                try:
                    # Try to generate real thumbnail using OpenCV
                    import cv2
                    # print(f"DEBUG: Generating thumb for {path}")
                    cap = cv2.VideoCapture(path)
                    if cap.isOpened():
                        # Try to read a frame from the middle or at least 1 second in (approx 30 frames)
                        # to avoid black fading in
                        try:
                            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                        except:
                            total_frames = 0
                            
                        if total_frames > 60:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 30)
                        else:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            
                        ret, frame = cap.read()
                        if ret:
                            # Convert BGR (OpenCV) to RGB (PIL)
                            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                            img = Image.fromarray(frame_rgb)
                        else:
                            print(f"Warning: Could not read frame from {path}")
                        
                        cap.release()
                    else:
                        print(f"Warning: Could not open video file for thumbnail: {path}")
                except ImportError as e:
                    print(f"OpenCV Import Error: {e}")
                except Exception as e:
                    print(f"Error generating video thumbnail: {e}")

                if img is None:
                    # Fallback: Generate a placeholder for video thumbnail using PIL
                    # Lighter background to be visible
                    img = Image.new('RGB', (150, 150), color='#334155') 
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(img)
                    
                    # Draw film strip holes on left and right
                    for y in range(10, 150, 20):
                        draw.rectangle([5, y, 15, y+10], fill='white')
                        draw.rectangle([135, y, 145, y+10], fill='white')
                    
                    # Draw a text-like rect in center
                    draw.rectangle([40, 60, 110, 90], outline='white', width=2)
                    # Maybe just a "V" shape
                    draw.line([50, 65, 75, 85], fill='white', width=3)
                    draw.line([75, 85, 100, 65], fill='white', width=3)
                
                # Ensure resize happens for both cases
                img.thumbnail((150, 150))

                
            else:
                # Use PIL to load and resize image
                from PIL import Image, ImageOps
                with Image.open(path) as img:
                    # Handle orientation metadata
                    img = ImageOps.exif_transpose(img)
                    
                    # Convert to RGB to avoid alpha channel issues with JPEG
                    if img.mode in ('RGBA', 'P'):
                        img = img.convert('RGB')
                    
                    # Resize logic
                    if is_thumbnail:
                        img.thumbnail((150, 150)) # Efficient resize
                    else:
                        img.thumbnail((1920, 1080))
            
            # Save to buffer (common for both image and video thumbnail)
            buffer = io.BytesIO()
            # If it was a PIL image (either loaded or generated)
            img.save(buffer, format="JPEG", quality=80 if is_thumbnail else 90)
            b64_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/jpeg;base64,{b64_data}"
                
        except Exception as e:
            print(f"API: Error loading asset {path}: {e}")
            return None

    def get_image_metadata(self, path):
        """Get resolution, size, and EXIF data."""
        try:
            # path is now the full path passed from frontend
            if not os.path.exists(path):
                return {}
            
            filename = os.path.basename(path)
            # File size
            stats = os.stat(path)
            size_mb = stats.st_size / (1024 * 1024)
            
            width = 0
            height = 0
            img_format = "Unknown"
            exif_data = {}

            # Check if video
            ext = os.path.splitext(filename)[1].lower()
            is_video = ext in {".mp4", ".mov", ".avi", ".mkv", ".webm"}
            
            if is_video:
                img_format = f"Video ({ext.strip('.')})"
                # For now getting video resolution is complex without ffmpeg/opencv dependency
                # which we want to avoid if possible for simplicity or handle gracefully
                # We can just leave width/height 0 or generic
            else:
                try:
                    from PIL import Image, ExifTags
                    with Image.open(path) as img:
                        width, height = img.size
                        img_format = img.format or "Unknown"
                        
                        if hasattr(img, '_getexif') and img._getexif():
                            exif = img._getexif()
                            for tag, value in exif.items():
                                decoded = ExifTags.TAGS.get(tag, tag)
                                if decoded in ['DateTimeOrigin', 'DateTimeOriginal', 'DateTime', 'DateTimeDigitized', 'Make', 'Model', 'ISOSpeedRatings', 'ExposureTime', 'FNumber']:
                                    exif_data[decoded] = str(value)
                except Exception as read_err:
                    print(f"Error reading metadata from image: {read_err}")
                
            # Proceed with basic file stats

            # Format specific values
            iso = exif_data.get('ISOSpeedRatings', '')
            
            aperture = ""
            if 'FNumber' in exif_data:
                try:
                    aperture = f"f/{exif_data['FNumber']}"
                except: pass

            # Date Logic with fallbacks
            date_str = exif_data.get('DateTimeOriginal') or exif_data.get('DateTime') or exif_data.get('DateTimeDigitized')
            if not date_str or date_str == 'Unknown':
                # Fallback to file modification time
                try:
                    mtime = os.path.getmtime(path)
                    date_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
                except:
                    date_str = "Unknown"

            return {
                "filename": filename,
                "resolution": f"{width} x {height}",
                "size": f"{size_mb:.2f} MB",
                "format": img_format,
                "date": date_str,
                "camera": f"{exif_data.get('Make', '')} {exif_data.get('Model', '')}".strip() or "Unknown",
                "iso": iso,
                "aperture": aperture,
                "shutter": exif_data.get('ExposureTime', '')
            }
        except Exception as e:
            return {"error": str(e)}

    def move_image(self, filename, src_folder, dest_folder):
        """Move an image from src to dest."""
        try:
            src_path = os.path.join(src_folder, filename)
            dest_path = os.path.join(dest_folder, filename)
            
            # Ensure dest folder exists
            if not os.path.exists(dest_folder):
                os.makedirs(dest_folder)

            # Windows keeps a file locked while the viewer (or the Flask
            # streaming thread) still reads it, so a move can transiently fail
            # with a sharing violation. Retry briefly instead of giving up.
            last_err = None
            for _ in range(8):
                try:
                    shutil.move(src_path, dest_path)
                    return {"success": True}
                except OSError as e:
                    last_err = e
                    if getattr(e, "winerror", 32) != 32:
                        break
                    time.sleep(0.35)
            return {"success": False, "error": str(last_err)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_image(self, filename, src_folder):
        """Soft delete: Move image to a .trash folder inside src_folder."""
        try:
            trash_path = os.path.join(src_folder, '.trash')
            if not os.path.exists(trash_path):
                os.makedirs(trash_path)
            
            src_path = os.path.join(src_folder, filename)
            dest_path = os.path.join(trash_path, filename)
            
            if os.path.exists(src_path):
                shutil.move(src_path, dest_path)
                return {"success": True}
            else:
                return {"success": False, "error": "File not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def restore_image(self, filename, src_folder):
        """Restore image from .trash folder."""
        try:
            trash_path = os.path.join(src_folder, '.trash')
            src_path = os.path.join(trash_path, filename) # It is now in trash
            dest_path = os.path.join(src_folder, filename) # Moving back to original source
            
            if os.path.exists(src_path):
                shutil.move(src_path, dest_path)
                return {"success": True}
            else:
                return {"success": False, "error": "File in trash not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}

def start_app():
    api = Api()
    
    # Determine if we are running in dev mode (npm run dev running separate) or prod
    # specific logic can be added. for now let's assume dev mode usually ports 5173
    # OR we point to the built index.html
    
    # Function to get the correct path for resources
    def resource_path(relative_path):
        """ Get absolute path to resource, works for dev and for PyInstaller """
        try:
            # PyInstaller creates a temp folder and stores path in _MEIPASS
            base_path = sys._MEIPASS
        except Exception:
            base_path = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(base_path, relative_path)

    # Check if 'dist' exists, if so use it, else try localhost
    url = "http://localhost:5173"
    
    # Check for the built UI file
    # In PyInstaller, we will likely bundle it into 'ui/dist' folder inside the executable
    ui_path = resource_path(os.path.join("ui", "dist", "index.html"))
    
    if os.path.exists(ui_path):
        url = ui_path

    # If an argument is passed, use it as URL (e.g. for dev)
    if len(sys.argv) > 1:
        url = sys.argv[1]

    # Enable File Access (Attempt to fix video playback)
    # Note: These flags depend on the underlying browser engine (CEF/WebView2/etc)
    # pywebview's settings dict only accepts keys it already exposes (assigning
    # private_mode there raises), so persistent storage has to be requested
    # through webview.start() below. Without this the WebView2 profile - and
    # with it localStorage - is thrown away on exit.
    try:
        webview.settings['ALLOW_FILE_ACCESS_FROM_FILES'] = True
        webview.settings['ALLOW_UNIVERSAL_ACCESS_FROM_FILES'] = True
    except Exception as e:
        print(f"API: Could not relax local file access: {e}")

    window = webview.create_window(
        'MediaSort', 
        url, 
        js_api=api,
        width=1000,
        height=800,
        background_color='#0f172a' # Match the theme
    )
    api.set_window(window)
    # private_mode=False keeps cookies/localStorage between runs; the storage
    # path lives next to the state file so everything MediaSort persists is in
    # one place.
    webview.start(
        debug=False,
        private_mode=False,
        storage_path=os.path.join(STATE_DIR, "webview"),
    )

if __name__ == '__main__':
    start_app()
