from pathlib import Path
import json
root=Path.cwd()
data=json.loads((root/'installer/page-texts.json').read_text(encoding='utf-8'))
names={'en':'English','de':'Deutsch','fr':'Français','it':'Italiano','es':'Español','pt':'Português (Portugal)','zh-CN':'简体中文','zh-TW':'繁體中文','ja':'日本語','ko':'한국어'}
options=''.join(f'<option value="{key}">{value}</option>' for key,value in names.items())
resolver="""function matchLanguage(value){const tag=String(value||'').replaceAll('_','-').toLowerCase();if(tag.startsWith('zh'))return /hant|tw|hk|mo/.test(tag)?'zh-TW':'zh-CN';const base=tag.split('-')[0];return Object.hasOwn(texts,base)?base:'en';}
const selector=document.getElementById('language');
selector.value=matchLanguage(navigator.language);
"""
p=root/'installer/setup-guide.html';s=p.read_text(encoding='utf-8').replace('<label id="languageLabel" for="language"></label>','');start=s.index('<select id="language"');end=s.index('</select>',start)+len('</select>');s=s[:start]+'<label id="languageLabel" for="language"></label><select id="language">'+options+'</select>'+s[end:]
s=s[:s.index('<script>')]+ '<script>\nconst texts='+json.dumps(data['texts'],ensure_ascii=False)+';\nconst labels='+json.dumps({k:v[5] for k,v in data['download'].items()},ensure_ascii=False)+';\n'+resolver+"""
function render(){const lang=selector.value;document.documentElement.lang=lang;document.title='Mail AI Assist · '+texts[lang][0];document.getElementById('languageLabel').textContent=labels[lang];['title','intro','download','step2','step3','updates','uninstall'].forEach((id,i)=>document.getElementById(id).textContent=texts[lang][i]);}
selector.addEventListener('change',render);render();
</script></body></html>
"""
p.write_text(s,encoding='utf-8')
s='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mail AI Assist</title><style>body{font:16px/1.7 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#253149;background:#f7f9fc}a{color:#4856c6}.button{display:inline-block;background:#4856c6;color:white;padding:12px 20px;border-radius:10px;text-decoration:none}small{color:#626f84}select{font:inherit;padding:8px;max-width:100%}</style></head><body><label id="languageLabel" for="language"></label> <select id="language">'''+options+'''</select><h1>Mail AI Assist</h1><p id="description"></p><p><a id="msi" class="button"></a></p><p id="guide"></p><p><a id="xpi"></a></p><small>Jin Lu · <a href="mailto:it@live.cn">it@live.cn</a> · <span id="license"></span><br><span id="disclaimer"></span></small><script>
const texts='''+json.dumps(data['download'],ensure_ascii=False)+';\n'+resolver+"""function render(){const lang=selector.value;const values=texts[lang];document.documentElement.lang=lang;for(const [id,index] of Object.entries({description:0,guide:2,xpi:3,disclaimer:4,languageLabel:5,license:6}))document.getElementById(id).textContent=values[index];const suffix='';document.getElementById('msi').textContent=values[1]+' · 0.9.0';document.getElementById('msi').href='releases/0.9.0/Mail-AI-Assist-0.9.0-x64'+suffix+'.msi';document.getElementById('xpi').href='releases/0.9.0/Mail-AI-Assist-0.9.0.xpi';}
selector.addEventListener('change',render);render();
</script></body></html>
"""
(root/'installer/download-page.html').write_text(s,encoding='utf-8')
