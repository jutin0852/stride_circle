"""Trace labelled crops of the user-supplied raster sheet into genuine SVG paths.

Uses the existing pixels and closed black contours, not invented geometry.
Outputs individual SVGs, crop/trace comparisons, and a manifest. Pillow + NumPy.
"""
from pathlib import Path
from collections import defaultdict, deque
import json
import html
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SOURCE = Path(r'C:\Users\jutin\Desktop\Cute Duck Rive Animation Asset Sheet.png')
OUT = Path(__file__).resolve().parents[1] / 'assets' / 'mascot' / 'duck-sheet-traced'
PARTS = [
 ('head-base',(307,280,450,421)),
 ('eye-dot-upper',(454,302,481,334)),('eye-closed-upper',(489,302,527,334)),('eye-happy-upper',(533,301,567,333)),
 ('eye-dot-lower',(454,347,482,378)),('eye-closed-lower',(489,346,528,378)),('eye-wink',(531,341,570,378)),
 ('cheek-left',(452,382,488,409)),('cheek-right',(526,379,567,409)),
 ('beak-default',(597,299,674,344)),('beak-happy',(674,297,749,352)),('beak-small',(753,294,830,332)),
 ('beak-wide',(597,344,676,389)),('beak-oval',(677,347,747,389)),('beak-laugh',(750,343,833,408)),
 ('body-base',(868,281,1003,429)),('wing-left',(1013,293,1086,380)),('wing-right',(1099,292,1179,384)),
 ('hand-left',(995,423,1078,484)),('hand-right',(1103,408,1174,485)),
 ('leg-shoe-left',(1244,279,1338,382)),('leg-shoe-right',(1355,283,1443,382)),
 ('shoe-walk',(1210,414,1299,486)),('shoe-run',(1312,414,1398,487)),
 ('shoe-jump-left',(1404,418,1460,487)),('shoe-jump-right',(1460,410,1523,477)),
 ('hoodie',(29,508,225,651)),('shorts',(219,532,338,625)),('headband',(341,535,478,589)),
 ('crossbody-bag',(482,507,619,630)),('headphones',(627,502,811,650)),
 ('flag',(882,563,963,669)),('heart',(973,587,1044,655)),
 ('sparkle-large',(1046,576,1112,650)),('sparkle-small',(1097,618,1130,657)),
 ('excitement-marks',(1125,572,1212,642)),('sweat',(1224,570,1284,650)),
 ('rain-cloud',(1308,566,1412,651)),('sleep-marks',(1419,565,1508,647)),
]
for name, x in zip(['default','happy','smile','laugh','excited','surprised','sleepy','sad'],[323,469,615,764,917,1064,1211,1358]):
    PARTS.append(('face-'+name,(x,64,x+145,197)))
for name, box in [
 ('hero',(17,38,285,407)),('variant-basic',(16,718,179,941)),
 ('variant-hoodie',(174,731,312,941)),('variant-headband',(306,732,458,942)),
 ('variant-bag',(455,730,625,941)),('variant-headphones',(621,727,803,941)),('variant-sunglasses',(797,731,949,942)),
 ('pose-idle',(1002,716,1085,829)),('pose-walk',(1105,725,1190,833)),('pose-run',(1196,727,1313,834)),
 ('pose-jump',(1324,718,1406,834)),('pose-celebrate',(1422,711,1528,834)),
 ('pose-wave',(989,870,1099,981)),('pose-point',(1113,868,1205,983)),
 ('pose-phone',(1218,869,1305,985)),('pose-tired',(1311,882,1411,984)),('pose-sleep',(1404,892,1528,980)),
]: PARTS.append((name,box))

PALETTE = ['#080808','#fafafa','#ff9d2d','#ff603e','#ff9da6','#009af2','#0354cc','#06ab75','#087746','#ffd526','#777b7c','#303334']

def fill_holes(mask):
    a = Image.fromarray(np.pad(mask.astype('uint8')*255,1)).copy()
    ImageDraw.floodfill(a,(0,0),128)
    return np.array(a)[1:-1,1:-1] != 128

def components(mask):
    seen = np.zeros_like(mask)
    h,w = mask.shape
    for y,x in zip(*np.nonzero(mask)):
        if seen[y,x]: continue
        q=deque([(int(x),int(y))]); seen[y,x]=1; pts=[]
        while q:
            px,py=q.popleft(); pts.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=1; q.append((nx,ny))
        yield pts

def loops(mask):
    # Oriented pixel boundaries preserve holes through SVG's even-odd rule.
    edges=defaultdict(list)
    h,w=mask.shape
    for y,x in zip(*np.nonzero(mask)):
        x=int(x);y=int(y)
        if y==0 or not mask[y-1,x]: edges[(x,y)].append((x+1,y))
        if x==w-1 or not mask[y,x+1]: edges[(x+1,y)].append((x+1,y+1))
        if y==h-1 or not mask[y+1,x]: edges[(x+1,y+1)].append((x,y+1))
        if x==0 or not mask[y,x-1]: edges[(x,y+1)].append((x,y))
    result=[]
    while edges:
        start=next(iter(edges)); p=start; ring=[p]
        for _ in range(h*w*4+1):
            candidates=edges.get(p)
            if not candidates: break
            nxt=candidates.pop()
            if not candidates: del edges[p]
            p=nxt
            if p==start: break
            ring.append(p)
        if len(ring)>3:
            # Remove straight-line middle points while keeping source contour.
            clean=[]
            for i,p in enumerate(ring):
                a=ring[i-1];b=ring[(i+1)%len(ring)]
                if (p[0]-a[0])*(b[1]-p[1]) != (p[1]-a[1])*(b[0]-p[0]): clean.append(p)
            if len(clean)>2: result.append(clean)
    return result

def svg_path(rings):
    return ' '.join('M'+' L'.join(f'{x},{y}' for x,y in ring)+' Z' for ring in rings)

def trace(im,name):
    rgb=np.array(im.convert('RGB')).astype(float)
    r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    border_rgb=np.concatenate((rgb[0],rgb[-1],rgb[:,0],rgb[:,-1]))
    black_threshold=min(32,float(np.median(border_rgb.max(axis=1)))*.45)
    dark=rgb.max(axis=2)<black_threshold
    # Saturated blue marks without a black outline also need extraction.
    colored=((b>r*1.7)&(b>130)&(g>50))|((r>175)&(g>130)&(b<80))|((r>180)&(r>g*1.3)&(r>b*1.2))
    if name.startswith(('eye-','cheek-')):
        seed=dark if name.startswith('eye-') else (r>150)&(r>g*1.15)&(r>b*1.08)
    elif name in ['sweat','sleep-marks','excitement-marks']:
        seed=colored | (dark if name=='excitement-marks' else False)
        if name=='sleep-marks': seed=(r<12)&(g<36)&(b>95)
    else:
        white=(rgb.min(axis=2)>180)&((rgb.max(axis=2)-rgb.min(axis=2))<55)
        bright_blue=(b>180)&(b>r*1.8)&(g>65)
        bright_green=(g>120)&(g>r*1.6)&(g>b*1.2)
        seed=dark|white|bright_blue|bright_green
        if name=='rain-cloud':seed|=(r<25)&(g<55)&(b>65)
    good=np.zeros_like(seed)
    for pts in components(seed):
        if len(pts)<8: continue
        # Remove crop-edge background contamination.
        border=sum(x==0 or y==0 or x==im.width-1 or y==im.height-1 for x,y in pts)
        if border>10: continue
        for x,y in pts: good[y,x]=True
    silhouette=fill_holes(good)
    colors=np.zeros_like(r,dtype=np.uint8)
    colors[silhouette]=11
    colors[(r>150)&(g>150)&(b>150)&silhouette]=1
    colors[(r>120)&(r>g*1.14)&(g>b*1.3)&silhouette]=2
    colors[(r>160)&(g<r*.5)&(g>b*.8)&silhouette]=3
    colors[(r>150)&(r>g*1.12)&(b>g*.9)&silhouette]=4
    colors[(b>r*1.5)&(b>g*1.1)&silhouette]=5
    colors[(b>r*1.5)&(g<b*.42)&silhouette]=6
    colors[(g>r*1.35)&(g>b*1.12)&silhouette]=7
    colors[(g>r*1.35)&(g>b*1.12)&(g<110)&silhouette]=8
    colors[(r>150)&(g>115)&(b<100)&(r<g*1.35)&silhouette]=9
    colors[(np.abs(r-g)<22)&(np.abs(g-b)<22)&(r>72)&(r<150)&silhouette]=10
    colors[dark&silhouette]=0
    groups=[]; render=Image.new('RGBA',im.size)
    # A binary silhouette matte prevents the sheet background from being embedded.
    rgba=np.zeros((im.height,im.width,4),dtype=np.uint8)
    for i,color in enumerate(PALETTE):
        mask=(colors==i)&silhouette
        if not mask.any(): continue
        paths=loops(mask)
        if not paths: continue
        d=svg_path(paths)
        groups.append(f'<path id="{name}-color-{i}" fill="{color}" fill-rule="evenodd" d="{d}"/>')
        rgba[mask,:3]=tuple(int(color[j:j+2],16) for j in (1,3,5))
        rgba[mask,3]=255
    render=Image.fromarray(rgba)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{im.width}" height="{im.height}" viewBox="0 0 {im.width} {im.height}"><title>{name}</title><desc>Pixel-contour vector trace from the supplied duck sheet. Flat palette, editable paths; review before rigging.</desc><g id="{name}">'+''.join(groups)+'</g></svg>'
    return svg,render,int(silhouette.sum()),len(groups)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    original=Image.open(SOURCE).convert('RGB'); manifest=[]; cards=[]
    for name,box in PARTS:
        # Rig pieces and expression references are the requested deliverable.
        # The composite character/pose studies need further tracing cleanup.
        if name=='hero' or name.startswith(('variant-','pose-')):
            drafts=OUT/'unreviewed-pose-drafts';drafts.mkdir(exist_ok=True)
            for suffix in ['.svg','-comparison.png']:
                previous=OUT/(name+suffix)
                if previous.exists(): previous.replace(drafts/previous.name)
            continue
        crop=original.crop(box); svg,render,pixels,n=trace(crop,name)
        (OUT/(name+'.svg')).write_text(svg,encoding='utf-8')
        # Comparison image is derived from original crop + same color masks as SVG.
        card=Image.new('RGB',(440,250),'#eef1f3'); draw=ImageDraw.Draw(card)
        draw.text((12,8),name,fill='black');draw.text((12,28),'Original crop',fill='black');draw.text((230,28),'Vector trace',fill='black')
        for x,src in [(10,crop.convert('RGBA')),(230,render)]:
            src.thumbnail((200,180),Image.Resampling.LANCZOS)
            card.paste(src,(x+(200-src.width)//2,52+(180-src.height)//2),src)
        card.save(OUT/(name+'-comparison.png'));cards.append(card)
        manifest.append(dict(name=name,source_box=box,svg=name+'.svg',filled_pixels=pixels,color_paths=n))
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    contact=Image.new('RGB',(440*3,250*((len(cards)+2)//3)),'white')
    for i,card in enumerate(cards):contact.paste(card,((i%3)*440,(i//3)*250))
    contact.save(OUT/'all-components-comparison.png')
    cards_html=''.join(f'<article><h2>{html.escape(p["name"])}</h2><img src="{p["name"]}-comparison.png" alt="Original and trace of {p["name"]}"><p><a href="{p["svg"]}">Open editable SVG</a></p></article>' for p in manifest)
    (OUT/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Duck sheet component traces</title><style>body{font:16px system-ui;background:#e9edf0;color:#182431;margin:32px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:16px}article{background:white;padding:16px;border-radius:12px}h2{font-size:17px}img{width:100%}</style><h1>Duck sheet: original crops and SVG traces</h1><p>Each SVG uses vector paths traced from your image. Colors are simplified. Facial sets and full poses remain grouped; separate further before rigging.</p><main>'+cards_html+'</main></html>',encoding='utf-8')
    beaks=[cards[i] for i,p in enumerate(manifest) if p['name'].startswith('beak-')]
    preview=Image.new('RGB',(880,750),'white')
    for i,card in enumerate(beaks):preview.paste(card,((i%2)*440,(i//2)*250))
    preview.save(OUT/'beaks-comparison.png')
    print(json.dumps(dict(output=str(OUT),count=len(manifest),empty=[p['name'] for p in manifest if p['filled_pixels']==0])))

if __name__=='__main__':main()
