#!/usr/bin/env python3
"""Validate public identity, published credentials, metadata, links and assets.

Follows production redirects and exempts intentionally noindexed records and
private tools from search-page assertions. A real media link remains a link.
"""
import json
import re
import sys
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
SITE = 'https://www.valiantdoor.com'
BID = SITE + '/#business'
PRIVATE = ('/authority-dashboard', '/listings-admin', '/settings/', '/address-selection-hidden')
CONFIG = json.loads((ROOT / 'vercel.json').read_text())
REDIRECTS = {r['source']: r['destination'] for r in CONFIG['redirects'] if 'has' not in r and ':' not in r['source']}
ERRORS = []

class Page(HTMLParser):
    def __init__(self, file):
        super().__init__(); self.file=file; self.title=''; self.description=''; self.canonical=''; self.robots=''; self.h1=0; self.blocks=[]; self.links=[]; self.assets=[]; self.ids=[]; self.collect=''; self.buffer=''
        self.html=file.read_text(); self.feed(self.html)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        if tag=='meta':
            if a.get('name')=='description': self.description=a.get('content','')
            if a.get('name')=='robots': self.robots=a.get('content','')
        if tag=='link' and a.get('rel')=='canonical': self.canonical=a.get('href','')
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        if tag=='h1': self.h1+=1
        if tag=='script' and a.get('src'): self.assets.append(a['src'])
        if tag=='link' and a.get('rel')=='stylesheet': self.assets.append(a.get('href',''))
        if tag=='title': self.collect='title'; self.buffer=''
        if tag=='script' and a.get('type')=='application/ld+json': self.collect='ld'; self.buffer=''
    def handle_data(self,data):
        if self.collect: self.buffer+=data
    def handle_endtag(self,tag):
        if tag=='title' and self.collect=='title': self.title=self.buffer; self.collect=''
        if tag=='script' and self.collect=='ld':
            try: self.blocks.append(json.loads(self.buffer))
            except ValueError as e: ERRORS.append(f'{self.file}: invalid JSON-LD: {e}')
            self.collect=''

def route(file):
    if file.name=='blog-index.html': return '/blog'
    name=file.relative_to(PUBLIC).as_posix()
    return '/' + re.sub(r'(^|/)index\.html$','',name).removesuffix('.html').rstrip('/')
def nodes(data):
    if isinstance(data,dict):
        yield data
        for value in data.values(): yield from nodes(value)
    elif isinstance(data,list):
        for value in data: yield from nodes(value)
def types(node):
    value=node.get('@type',[])
    return value if isinstance(value,list) else [value]
def exists(target):
    pathname=unquote(urlsplit(target).path).rstrip('/') or '/'
    seen=set()
    while pathname in REDIRECTS and pathname not in seen:
        seen.add(pathname); pathname=urlsplit(REDIRECTS[pathname]).path.rstrip('/') or '/'
    if pathname=='/blog' or pathname=='/sitemap-blog.xml': return True
    if pathname.startswith('/api/'):
        rel=pathname.removeprefix('/api/')
        return (ROOT/'api'/(rel+'.js')).is_file() or (ROOT/'api'/rel/'index.js').is_file()
    f=PUBLIC/pathname.lstrip('/')
    return f.is_file() or f.with_suffix('.html').is_file() or (f/'index.html').is_file()

pages=[Page(f) for f in sorted(PUBLIC.rglob('*.html'))]+[Page(ROOT/'lib/blog-index.html')]
descriptions=defaultdict(list); titles=defaultdict(list); incoming=defaultdict(set); public=[]
for p in pages:
    r=route(p.file)
    if r.startswith(PRIVATE): continue
    is_public=bool(p.h1) and 'noindex' not in p.robots and r!='/404' and r not in REDIRECTS
    for href in p.links:
        u=urlsplit(urljoin(SITE+r,href))
        if u.hostname in ('valiantdoor.com','www.valiantdoor.com'):
            incoming[u.path.rstrip('/') or '/'].add(r)
            if not exists(u.geturl()): ERRORS.append(f'{r}: missing link target {href}')
    for href in p.assets:
        u=urlsplit(urljoin(SITE+r,href))
        if u.hostname in ('valiantdoor.com','www.valiantdoor.com') and not u.path.startswith('/_vercel/') and not exists(u.geturl()): ERRORS.append(f'{r}: missing stylesheet/script {href}')
    if not is_public: continue
    public.append(p)
    if p.h1!=1: ERRORS.append(f'{r}: {p.h1} H1 headings')
    if not p.title or len(p.title)>70: ERRORS.append(f'{r}: missing or overlong title ({len(p.title)})')
    if not p.description: ERRORS.append(f'{r}: missing description')
    if p.canonical!=SITE+(r if r!='/' else '/'):
        ERRORS.append(f'{r}: canonical mismatch {p.canonical}')
    titles[p.title].append(r); descriptions[p.description].append(r)
    business=[n for n in nodes(p.blocks) if any(t in ['LocalBusiness','HomeAndConstructionBusiness','GarageDoorService'] for t in types(n))]
    if len(business)!=1: ERRORS.append(f'{r}: {len(business)} typed business definitions')
    for b in business:
        if b.get('@id')!=BID or b.get('address',{}).get('streetAddress')!='3588 Pimlico Dr': ERRORS.append(f'{r}: wrong or incomplete business identity/address')
        if b.get('hasCredential',{}).get('identifier')!='1160068': ERRORS.append(f'{r}: missing CSLB credential')
        if b.get('hasCertification',{}).get('certificationIdentification')!='2953': ERRORS.append(f'{r}: missing Diamond certificate')
        props=json.dumps(b.get('additionalProperty',[]))
        if not all(value in props for value in ['101085976','ACC006A003914','CSG0050855800','July 5, 2027']): ERRORS.append(f'{r}: incomplete bond/insurance facts')
    if 'data-valiant-credential-details' not in p.html: ERRORS.append(f'{r}: credentials not visible in page content')
    scripts=[a for a in p.assets if '/js/global-chrome.' in a]
    if len(scripts)!=1: ERRORS.append(f'{r}: {len(scripts)} shared measurement scripts')
for kind, values in [('title',titles),('description',descriptions)]:
    for value, routes in values.items():
        if len(routes)>1: ERRORS.append(f'duplicate public {kind}: {routes}')
for p in public:
    r=route(p.file)
    if r.startswith('/videos/') and len(incoming[r])<2: ERRORS.append(f'{r}: fewer than two referring pages')
for f in PUBLIC.glob('sitemap*.xml'):
    for match in re.finditer(r'<loc>(.*?)</loc>',f.read_text()):
        value=match.group(1)
        if urlsplit(value).hostname in ('www.valiantdoor.com','valiantdoor.com') and not exists(value): ERRORS.append(f'{f.name}: missing target {value}')
print(json.dumps({'pagesInspected':len(pages),'publicCanonicalPages':len(public),'videoPages':sum(route(p.file).startswith('/videos/') for p in public),'errors':ERRORS},indent=2))
sys.exit(bool(ERRORS))
