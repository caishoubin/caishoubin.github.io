#!/usr/bin/env python3
"""Dependency-free structural regression checks for the maintained game tools."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
import json
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://caishoubin.github.io'
PREFIXES = ('stardew-planner', 'terraria-checklist', 'factory-planner')
PAGES = [ROOT/'index.html', ROOT/'playbook/index.html', ROOT/'404.html']
PAGES += [p for prefix in PREFIXES for p in (ROOT/prefix).rglob('*.html')]
errors, checks = [], 0

class Page(HTMLParser):
    def __init__(self, content):
        super().__init__(); self.tags=[]; self.ids=[]; self.links=[]; self.h1=0; self.scripts=[]; self.current_script=None
        self.feed(content)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); self.tags.append((tag,a))
        if 'id' in a: self.ids.append(a['id'])
        if tag=='h1': self.h1+=1
        if tag in ('a','link') and 'href' in a: self.links.append(a['href'])
        if tag in ('img','script') and 'src' in a: self.links.append(a['src'])
        if tag=='script': self.current_script=[a,'']; self.scripts.append(self.current_script)
    def handle_data(self,data):
        if self.current_script is not None: self.current_script[1]+=data
    def handle_endtag(self,tag):
        if tag=='script': self.current_script=None

def check(ok, message):
    global checks
    checks+=1
    if not ok: errors.append(message)

cache={}
for path in PAGES:
    rel=path.relative_to(ROOT); page=Page(path.read_text()); cache[path]=page
    check(page.h1==1,f'{rel}: must have one H1')
    check(len(page.ids)==len(set(page.ids)),f'{rel}: duplicate IDs')
    check(any(t=='html' and a.get('lang')=='en' for t,a in page.tags),f'{rel}: language')
    check(any(t=='meta' and a.get('name')=='viewport' for t,a in page.tags),f'{rel}: viewport')
    if rel.as_posix() != '404.html':
        check(any(t=='meta' and a.get('name')=='description' and a.get('content') for t,a in page.tags),f'{rel}: description')
        check(any(t=='link' and a.get('rel')=='canonical' and a.get('href','').startswith(ORIGIN+'/') for t,a in page.tags),f'{rel}: canonical')
        check(any(t=='meta' and a.get('name')=='google-adsense-account' and a.get('content')=='ca-pub-6637568737373692' for t,a in page.tags),f'{rel}: publisher metadata')
    for t,a in page.tags:
        if t=='img': check('alt' in a,f'{rel}: image missing alt')
        if t=='script' and a.get('src'): check(not urlsplit(a['src']).netloc,f'{rel}: unexpected remote script')
        if t=='input' and a.get('type') not in ('hidden','submit','button','reset'):
            # Wrapped labels and aria-label are valid; detailed form testing lives with each app.
            if a.get('id'): check(bool(a.get('aria-label') or a.get('aria-labelledby') or any(t2=='label' and x.get('for')==a['id'] for t2,x in page.tags) or a.get('type') in ('checkbox','radio')),f'{rel}: input {a["id"]} needs a label')
    for attrs,code in page.scripts:
        if attrs.get('type')=='application/ld+json':
            try: json.loads(code)
            except Exception: errors.append(f'{rel}: invalid JSON-LD')
        check(not re.search(r'adsbygoogle|googletagmanager|google-analytics',attrs.get('src','')+code),f'{rel}: advertising/tracking script')

for path,page in list(cache.items()):
    rel=path.relative_to(ROOT)
    for href in page.links:
        resolved=urlsplit(urljoin(ORIGIN+'/'+rel.as_posix(),href))
        if resolved.scheme not in ('http','https') or resolved.netloc != 'caishoubin.github.io': continue
        target=ROOT/unquote(resolved.path).lstrip('/')
        if resolved.path.endswith('/'): target/='index.html'
        check(target.is_file(),f'{rel}: broken local target {href}')
        if target.is_file() and resolved.fragment and target.suffix=='.html':
            other=cache.setdefault(target,Page(target.read_text())) if target not in cache else cache[target]
            plan_models = {ROOT/'stardew-planner/index.html': ROOT/'stardew-planner/assets/plan.js', ROOT/'factory-planner/index.html': ROOT/'factory-planner/plans.js'}
            if resolved.fragment.startswith('plan=') and target in plan_models:
                result = subprocess.run(['node', '-e', "const api=require(process.argv[1]); if(!(api.fromHash||api.parseHash) (process.argv[2])) process.exit(1);", str(plan_models[target]), '#'+resolved.fragment], capture_output=True, text=True)
                check(result.returncode == 0, f'{rel}: invalid shared-plan link {href}')
            else:
                check(unquote(resolved.fragment) in other.ids,f'{rel}: missing anchor {href}')

for prefix in PREFIXES:
    for path in (ROOT/prefix).rglob('*.js'):
        if 'tests' in path.parts: continue
        code=path.read_text()
        check(not re.search(r'\b(fetch\s*\(|XMLHttpRequest|WebSocket\s*\(|sendBeacon\s*\()',code),f'{path.relative_to(ROOT)}: unexpected network code')
        check(not re.search(r'\beval\s*\(|new Function\s*\(',code),f'{path.relative_to(ROOT)}: dynamic evaluation')
for path in [ROOT/'sitemap.xml',ROOT/'directory-sitemap.xml']+[ROOT/p/'sitemap.xml' for p in PREFIXES]:
    try:
        tree=ET.parse(path)
        for loc in tree.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
            u=urlsplit(loc.text); check(u.scheme=='https' and u.netloc=='caishoubin.github.io',f'{path.name}: canonical URL')
            p=ROOT/u.path.lstrip('/'); p=p/'index.html' if u.path.endswith('/') else p
            check(p.is_file(),f'{path.name}: missing sitemap destination {loc.text}')
    except Exception as e: errors.append(str(e))
check('Sitemap: '+ORIGIN+'/sitemap.xml' in (ROOT/'robots.txt').read_text(),'root robots sitemap discovery')
check((ROOT/'ads.txt').read_text().strip()=='google.com, pub-6637568737373692, DIRECT, f08c47fec0942fa0','preserve ads.txt')
if errors:
    print('\n'.join(errors)); raise SystemExit(1)
print(f'PASS: {len(PAGES)} maintained pages, {checks} structural/link/privacy checks')
