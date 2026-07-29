from pathlib import Path

root = Path(__file__).resolve().parent.parent
target = root / "HealingMart_Converter_Blogger_v3.55.1.html"
legacy_source = root / "HealingMart_Converter_Blogger_v3.55.0.html"
template = legacy_source if legacy_source.exists() else target

if not template.exists():
    raise FileNotFoundError("Blogger HTML 템플릿을 찾을 수 없습니다.")

app = (root / "dist/js/hm-converter-app.v3.34.1.js").read_text(encoding="utf-8").strip()
html = template.read_text(encoding="utf-8")
html = html.replace('data-tool-version="3.55.0"', 'data-tool-version="3.55.1"')
html = html.replace('version:"3.55.0"', 'version:"3.55.1"')
html = html.replace('Embedded converter app core v3.34.0', 'Embedded converter app core v3.34.1')
html = html.replace('/Healing Mart Converter v3.55.0', '/Healing Mart Converter v3.55.1')

marker = '<!-- ===== Embedded converter app core v3.34.1 ===== -->'
start = html.find(marker)
if start < 0:
    raise ValueError("Blogger app marker가 없습니다.")
script_open_marker = '//<![CDATA['
script_close_marker = '//]]>'
script_open = html.find(script_open_marker, start)
if script_open < 0:
    raise ValueError("Blogger app 시작 마커가 없습니다.")
script_open += len(script_open_marker)
script_close = html.find(script_close_marker, script_open)
if script_close < 0:
    raise ValueError("Blogger app 종료 마커가 없습니다.")

html = html[:script_open] + "\n\n" + app + "\n" + html[script_close:]
target.write_text(html, encoding="utf-8")
(root / "blogger-converter.html").write_text(html, encoding="utf-8")
print(target)
