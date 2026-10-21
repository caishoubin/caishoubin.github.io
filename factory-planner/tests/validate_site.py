from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
class Document(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.ids=set(); self.canonical=[]; self.lang=None; self.titles=[]; self.in_title=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, f'Duplicate id: {a["id"]}'
            self.ids.add(a['id'])
        if tag=='html': self.lang=a.get('lang')
        if tag=='title': self.in_title=True
        if tag=='a' and 'href' in a: self.links.append(a['href'])
        if tag in ['script','img'] and 'src' in a: self.links.append(a['src'])
        if tag=='link' and a.get('rel')=='stylesheet': self.links.append(a['href'])
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a['href'])
    def handle_endtag(self,tag):
        if tag=='title': self.in_title=False
    def handle_data(self,data):
        if self.in_title: self.titles.append(data)
pages={}
for file in ROOT.rglob('*.html'):
    doc=Document();doc.feed(file.read_text());pages[file.resolve()]=doc
    assert doc.lang=='en', file
    assert len(doc.canonical)==1 and doc.canonical[0].startswith('https://caishoubin.github.io/factory-planner/'), file
    assert doc.titles and ' | Belt & Buffer | Belt & Buffer' not in ''.join(doc.titles), file
for file,doc in pages.items():
    for link in doc.links:
        u=urlparse(link)
        if u.scheme or u.netloc or u.path.startswith('/'): continue
        target=(file.parent/unquote(u.path)).resolve() if u.path else file
        if target.is_dir(): target=target/'index.html'
        assert target.exists(), (file,link,target)
        if u.fragment and not u.fragment.startswith('plan=') and target in pages: assert u.fragment in pages[target].ids,(file,link,'missing fragment')
ET.parse(ROOT/'sitemap.xml')
print(f'PASS: {len(pages)} English pages, canonicals, unique IDs, relative assets/links/fragments and sitemap XML.')
