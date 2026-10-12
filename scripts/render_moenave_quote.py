from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from pathlib import Path
import fitz

import argparse, json, math
parser=argparse.ArgumentParser(description="Render Valiant's standard Moenave quote concept")
parser.add_argument('config', type=Path)
parser.add_argument('output', type=Path)
args=parser.parse_args()
cfg=json.loads(args.config.read_text())
for key in ['opening_width_in','opening_height_in','ceiling_height_in','door_height_in']:
 if key not in cfg or not isinstance(cfg[key], (int,float)) or not math.isfinite(cfg[key]) or cfg[key]<=0:
  raise ValueError(f'{key} must be a positive finite measurement in inches')
if cfg['ceiling_height_in']<=cfg['opening_height_in']:
 raise ValueError('Ceiling datum must be above opening; verify input')
OW,OH,CH,DH=[cfg[k] for k in ['opening_width_in','opening_height_in','ceiling_height_in','door_height_in']]
DW=cfg.get('door_width_in',OW-2)
if not isinstance(DW,(int,float)) or not math.isfinite(DW) or DW<=0:
 raise ValueError('door_width_in must be positive and finite')
def feet(n):
 f=int(n//12);i=n-f*12
 return f"{f}' - {i:g}\""
def measure(n):return f'{feet(n)}  ({n:g}\")'
for key in ['customer','project','date','revision','manufacturer','model','color','panel_style']:
 if not isinstance(cfg.get(key),str) or not cfg[key].strip():raise ValueError(f'{key} is required')
 if len(cfg[key])>65:raise ValueError(f'{key} exceeds drawing label length')
name=cfg['customer'];project=cfg['project'];date=cfg['date'];rev=cfg['revision']
face=' '.join(cfg[k] for k in ['manufacturer','model','color','panel_style'])
product=' | '.join(cfg[k] for k in ['manufacturer','model','color','panel_style'])
if (cfg['model'], cfg['color'].lower(), cfg['panel_style'].lower()) != ('4283','white','long raised panel'):
 raise ValueError('This approved face renderer supports 4283 White Long Raised Panel; adapt the face and verify for other products.')
OUT=args.output.resolve();OUT.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(OUT),pagesize=(1224,792))
c.setTitle(f'{name} | Trackless Pivot Door | Quote Concept')
ink=HexColor('#182636'); gold=HexColor('#aa8050'); pale=HexColor('#faf6ef'); grey=HexColor('#64707b')
def line(x,y,X,Y,color=ink,w=.7,dash=None):
 c.setStrokeColor(color);c.setLineWidth(w);c.setDash(dash or []);c.line(x,y,X,Y);c.setDash([])
def rect(x,y,w,h,fill=None,stroke=ink,lw=.8):
 c.setStrokeColor(stroke);c.setLineWidth(lw)
 if fill:c.setFillColor(fill)
 c.rect(x,y,w,h,stroke=1,fill=int(fill is not None))
def text(x,y,s,size=9,bold=False,color=ink):
 c.setFillColor(color);c.setFont('Helvetica-Bold' if bold else 'Helvetica',size);c.drawString(x,y,s)
def center(x,y,s,size=9,color=ink):
 c.setFillColor(color);c.setFont('Helvetica',size);c.drawCentredString(x,y,s)
def dimh(x,X,y,label,base):
 line(x,base,x,y+5,grey,.5);line(X,base,X,y+5,grey,.5);line(x,y,X,y,grey,.6)
 for xx in [x,X]:line(xx-3,y-3,xx+3,y+3,ink,1)
 c.setFont('Helvetica',10);tw=c.stringWidth(label,'Helvetica',10);c.setFillColor(white);c.rect((x+X)/2-tw/2-5,y-5,tw+10,13,fill=1,stroke=0);center((x+X)/2,y-2,label,10)
def dimv(y,Y,x,label,base):
 line(base,y,x-5,y,grey,.5);line(base,Y,x-5,Y,grey,.5);line(x,y,x,Y,grey,.6)
 for yy in [y,Y]:line(x-3,yy-3,x+3,yy+3,ink,1)
 c.saveState();c.translate(x-6,(y+Y)/2);c.rotate(90);center(0,0,label,10);c.restoreState()
def leader(points,label,x,y):
 for a,b in zip(points,points[1:]):line(*a,*b,gold,.9)
 rect(points[0][0]-1.5,points[0][1]-1.5,3,3,gold,gold)
 text(x,y,label,9,color=gold)

rect(24,24,1176,744,lw=1)
rect(24,691,1176,77,ink,ink)
text(44,738,'VALIANT',24,True,white);text(45,718,'GARAGE DOOR LLC  |  valiantdoor.com',10,color=white)
text(347,738,'TRACKLESS PIVOT DOOR',22,True,white)
text(347,715,f'{name} / {project}',11,color=white)
text(991,739,'QUOTE CONCEPT',12,True,white);text(991,716,f'{date} | REV {rev}',10,color=white)
text(47,665,'01  EXTERIOR ELEVATION',12,True);text(47,648,product + ' | No windows shown',9,color=grey)

# Opening elevation at proportional 3.1 points per inch.
x,y=113,344; s=min(595.2/OW,260.0/max(OH,DH));W,H=OW*s,OH*s
rect(x-10,y,W+20,H+12,HexColor('#f2f3f4'),grey)
rect(x,y,W,H,white,lw=1.5)
# Door width defaults to opening less 2 inches; height must be explicitly provided.
dx=x+(OW-DW)*s/2;dy=y;dw=DW*s;dh=DH*s
rect(dx,dy,dw,dh,white,lw=1.1)
# Long raised panel face: four panels per row; four illustrative courses.
course=dh/4
for k in range(4):
 py=dy+k*course
 if k: line(dx,py,dx+dw,py,grey,.65)
 for j in range(4):
  px=dx+11+j*(dw/4);pw=dw/4-22;ph=course-20
  rect(px,py+10,pw,ph,HexColor('#f7f8f9'),grey,.65)
  rect(px+4,py+14,pw-8,ph-8,white,HexColor('#a5adb5'),.45)
  line(px,py+10,px+4,py+14,grey,.45)
  line(px+pw,py+10,px+pw-4,py+14,grey,.45)
  line(px,py+10+ph,px+4,py+6+ph,grey,.45)
  line(px+pw,py+10+ph,px+pw-4,py+6+ph,grey,.45)
dimh(x,x+W,617,'REPORTED OPENING  '+measure(OW),y+H)
dimv(y,y+H,73,'OPENING  '+measure(OH),x)
line(x-27,y,x+W+15,y,ink,1.4)
text(x+W-75,y-16,'FINISHED FLOOR',8,color=grey)
text(260,294,face.upper(),9,color=gold)
dimh(dx,dx+dw,324,'DOOR WIDTH  '+measure(DW),dy)
dimv(dy,dy+dh,739,'DOOR HEIGHT  '+measure(DH),dx+dw)
text(113,269,'PROPOSED TRACKLESS PIVOT CONFIGURATION',12,True)
text(113,251,'Shown closed. Four illustrative panel courses; final section layout by supplier.',9,color=grey)
text(113,234,'Door face: '+face+'; no glazing shown.',9)
text(113,217,'Section assembly / reinforcement for pivot use requires supplier approval.',9)
text(113,201,'Product basis: '+cfg.get('product_reference','supplier specification to be supplied'),8,color=grey)

# Technical area.
line(769,202,769,676,grey,.6)
text(794,665,'02  INTERIOR FIT / MOUNTING CONCEPT',12,True)
text(794,648,'Schematic only - operating envelope is not established.',9,color=grey)
ix,iy=857,423;iw,ih=252,142*OH/CH
rect(ix-9,iy,iw+18,ih+9,HexColor('#f2f3f4'),grey)
rect(ix,iy,iw,ih,None,ink,1)
# Explicit torsion shaft, spring assemblies and bearing supports (schematic).
shaft_y=iy+ih+12
line(ix-6,shaft_y,ix+iw+9,shaft_y,ink,1.7)
for bx in [ix-3, ix+iw/2, ix+iw+3]:
 rect(bx-3,shaft_y-7,6,14,HexColor('#e6e9ec'),ink,.8)
for sx in [ix+26, ix+iw/2+16]:
 rect(sx,shaft_y-4,70,8,HexColor('#e0e5ea'),ink,.6)
 for coil in range(0,70,3):line(sx+coil,shaft_y-4,sx+coil+2,shaft_y+4,grey,.55)
for hx in [ix+4,ix+iw-4]:
 rect(hx-5,shaft_y-6,10,12,white,ink,.6)
line(ix+iw+9,shaft_y,ix+iw+19,shaft_y,ink,1.7)
rect(ix+iw+16,shaft_y-10,9,20,HexColor('#e0e5ea'),ink,.7)
text(830,609,'TORSION SHAFT / SPRING ASSEMBLY',9,True)
text(830,594,'Bearing supports + drive-side hardware (schematic)',8,color=grey)
leader([(ix+65,shaft_y+5),(822,582)],'',822,582)

rect(ix-12,iy+35,7,99,None,ink,1)
rect(ix+iw+5,iy+35,17,99,None,ink,1)
for xx in [ix-8,ix+iw+13]:
 c.setStrokeColor(ink);c.circle(xx,iy+83,5,stroke=1,fill=0)
line(ix-8,iy+83,ix+26,iy+48,ink,1.3);line(ix+iw+13,iy+83,ix+iw-26,iy+48,ink,1.3)
line(823,iy,1152,iy,ink,1)
line(823,565,1152,565,grey,.8,[4,3])
text(850,576,'REPORTED CEILING DATUM: '+feet(CH),9,True)
dimv(iy,565,819,feet(CH),857)
dimv(iy+ih,565,1144,f'{CH-OH:g}\"*',1117)
text(840,406,'INSIDE FACE MOUNT / SIDE PIVOT HARDWARE',8,True)
text(799,389,f'*{CH-OH:g}\" above opening at reported ceiling datum; verify vault profile.',8,color=grey)
text(799,373,'Spring count, wire, length and torque: supplier to size.',8,color=grey)

text(794,346,'DIMENSION BASIS',11,True)
rows=[('Reported clear opening',f'{feet(OW)} W x {feet(OH)} H'),('Reported floor to ceiling',feet(CH)+'; verify vault'),('Proposed door leaf*',f'{feet(DW)} W x {feet(DH)} H'),('Side clearance reference','4" non-drive / 14" drive'),('Mounting reference','Inside face; 2x6 wood bucks')]
for n,(a,b) in enumerate(rows):
 yy=324-n*23;line(794,yy-8,1177,yy-8,HexColor('#dce0e4'),.5);text(799,yy,a,9);text(966,yy,b,9,True)
text(799,204,f'*Width reduction {OW-DW:g} in. Height specified independently; field verify.',8,color=grey)

# Notes and title block.
line(24,187,1200,187,ink,1)
text(44,165,'QUOTE / DESIGN COORDINATION NOTES',10,True)
notes=[
'1. Dimensions are customer-reported. Field verify opening, jambs, header, floor level, vault profile and garage depth.',
'2. Confirm complete pivot travel, headroom, side room and golf simulator clearance with Moenave before ordering.',
'3. Supplied Moenave sheet lists maximum door size 18\' x 10\' and maximum weight 500 lb; final leaf weight must be verified.',
'4. Torsion system shown schematically. Spring sizing, shaft, bearings, drive, backing and geometry by supplier.',
'5. Sectional-product pivot use: rigid assembly, weight, reinforcement and compatibility require supplier approval.'
]
for n,t in enumerate(notes):text(44,147-15*n,t,9)
line(24,67,1200,67,ink,.8)
text(44,48,'PROJECT: '+name.upper()+' - TRACKLESS PIVOT',9,True);text(44,34,cfg.get('site_contact_label','Site/contact: pending'),8)
text(525,48,'PRELIMINARY - FOR QUOTING ONLY',10,True,color=gold);text(525,34,'Not a fabrication or installation drawing. Dimensions govern; do not scale.',8)
text(1054,47,'SHEET Q-01',12,True);text(1054,33,'17 x 11 in  |  NTS',8)
c.showPage();c.save()
d=fitz.open(str(OUT));d[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(str(OUT.with_suffix('.png')))
print(OUT)
