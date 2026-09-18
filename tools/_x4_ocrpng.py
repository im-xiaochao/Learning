# -*- coding: utf-8 -*-
"""对一张已裁好的 PNG 跑 OCR，用于对可疑字做二次判读。

用法： python tools/_x4_ocrpng.py <png 路径> [dpi 提示]
"""
import sys

from rapidocr_onnxruntime import RapidOCR

img = sys.argv[1]
ocr = RapidOCR()
res, _ = ocr(img)
if not res:
    print("（没识别到文本）")
else:
    for item in res:
        box, text, score = item[0], item[1], item[2]
        try:
            score = float(score)
        except (TypeError, ValueError):
            score = 0.0
        print(f"{score:.3f}  {text}")
