import glob
import os

try:
    from PIL import Image
except ImportError:
    import sys
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image

files = glob.glob('slide*.jpeg')

for f in files:
    try:
        img = Image.open(f)
        # Convert to RGB to ensure no alpha channel issues when saving as JPEG
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        
        # Resize if width > 1920
        max_width = 1920
        if img.width > max_width:
            ratio = max_width / img.width
            new_h = int(img.height * ratio)
            img = img.resize((max_width, new_h), Image.Resampling.LANCZOS)
        
        # Save compressed
        out_name = f
        img.save(out_name, "JPEG", quality=75, optimize=True)
        print(f"Compressed {f}")
    except Exception as e:
        print(f"Failed to compress {f}: {e}")

print("Done compressing images.")
