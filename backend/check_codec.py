import os

video_dir = r"C:\Users\abhis\Desktop\SecureElearning\backend\app\uploads\videos"
files = [f for f in os.listdir(video_dir) if f.endswith(".mp4")]
if not files:
    print("No files found!")
    exit()
    
file_path = os.path.join(video_dir, files[0])
print("Inspecting file path (bytes):", file_path.encode('ascii', errors='replace'))

with open(file_path, "rb") as f:
    data = f.read(1024 * 1024 * 5) # Read first 5MB
    
# Check for codecs
found = False
for codec in [b"mp4a", b"opus", b"vorb", b"mp3", b"ac-3", b"dvh1", b"hvc1", b"avc1"]:
    pos = data.find(codec)
    if pos != -1:
        print(f"Found track format tag: '{codec.decode()}' at byte offset {pos}")
        found = True

if not found:
    print("No common track tags found in the first 5MB.")
