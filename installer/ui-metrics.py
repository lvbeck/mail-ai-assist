"""Measure localized labels with Windows fonts without opening installer UI."""
import ctypes as c
import math
import re
from ctypes import wintypes as w

gdi = c.WinDLL('gdi32')
gdi.CreateCompatibleDC.restype = w.HDC
gdi.CreateFontW.restype = w.HFONT
gdi.CreateFontW.argtypes = [c.c_int] * 5 + [w.DWORD] * 8 + [w.LPCWSTR]
gdi.SelectObject.argtypes = [w.HDC, w.HGDIOBJ]
gdi.SelectObject.restype = w.HGDIOBJ
gdi.GetTextExtentPoint32W.argtypes = [w.HDC, w.LPCWSTR, c.c_int, c.POINTER(w.SIZE)]
gdi.DeleteObject.argtypes = [w.HGDIOBJ]
gdi.DeleteDC.argtypes = [w.HDC]

def button_width(text, language):
    face = {'zh-CN': 'Microsoft YaHei UI', 'zh-TW': 'Microsoft JhengHei UI', 'ja': 'Yu Gothic UI', 'ko': 'Malgun Gothic'}.get(language, 'Segoe UI')
    text = re.sub(r'\{[\\&][^}]*\}', '', text).replace('&', '').strip()
    dc = gdi.CreateCompatibleDC(None)
    font = gdi.CreateFontW(-14, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 5, 0, face)
    previous = gdi.SelectObject(dc, font)
    try:
        size = w.SIZE()
        if not gdi.GetTextExtentPoint32W(dc, text, len(text), c.byref(size)):
            raise RuntimeError('Cannot measure installer button text')
        # Conservative 96-DPI conversion plus horizontal padding and shield space.
        return max(56, math.ceil(size.cx * .75) + 22)
    finally:
        gdi.SelectObject(dc, previous)
        gdi.DeleteObject(font)
        gdi.DeleteDC(dc)
