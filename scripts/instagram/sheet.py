# 한 게시물의 슬라이드를 한 장에 모아 보기(확인용). 사용: python scripts/instagram/sheet.py post-05 [저장 경로]
import glob
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
post = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'marketing', 'instagram', post, 'sheet.png')
files = sorted(glob.glob(os.path.join(ROOT, 'marketing', 'instagram', post, 'out', '*.png')))
W, H, cols = 432, 540, 4
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (W + 8) + 8, rows * (H + 8) + 8), '#666')
for i, f in enumerate(files):
    sheet.paste(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS), (8 + (i % cols) * (W + 8), 8 + (i // cols) * (H + 8)))
sheet.save(out)
print(out)
