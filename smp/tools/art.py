"""Original pixel textures generated from drawing primitives; no reference assets copied."""
import pathlib,struct,zlib,math
R=pathlib.Path(__file__).resolve().parents[1]/'resource_pack'
P={'ink':'#332b36','gold':'#dcae53','light':'#ffe8a1','paper':'#d7bb83','brown':'#654334','steel':'#b8cfda','blue':'#568cce','green':'#80bc65','red':'#dc7959','purple':'#ac85d2','white':'#f4ecce'}
def color(c):
 c=P.get(c,c);return tuple(bytes.fromhex(c.lstrip('#')))+(255,)
class Canvas:
 def __init__(self,w,h):self.w=w;self.h=h;self.p=[(0,0,0,0)]*(w*h)
 def rect(self,x,y,w,h,c):
  c=color(c)
  for yy in range(max(0,y),min(self.h,y+h)):
   for xx in range(max(0,x),min(self.w,x+w)):self.p[yy*self.w+xx]=c
 def line(self,x1,y1,x2,y2,c,width=1):
  n=max(abs(x2-x1),abs(y2-y1),1)
  for i in range(n+1):self.rect(round(x1+(x2-x1)*i/n),round(y1+(y2-y1)*i/n),width,width,c)
 def circle(self,x,y,r,c):
  for yy in range(y-r,y+r+1):
   for xx in range(x-r,x+r+1):
    if (xx-x)**2+(yy-y)**2<=r*r:self.rect(xx,yy,1,1,c)
 def save(self,name):
  p=R/name;p.parent.mkdir(parents=True,exist_ok=True)
  rows=b''.join(b'\0'+bytes(v for pixel in self.p[y*self.w:(y+1)*self.w] for v in pixel) for y in range(self.h))
  def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
  p.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',self.w,self.h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b''))
def draw(name):
 c=Canvas(32,32)
 if name in ['menu','shop','parcel','save']:
  c.rect(3,7,26,22,'ink');c.rect(5,9,22,18,'brown');c.rect(6,10,20,7,'paper');c.line(4,17,28,17,'ink',2);c.rect(14,14,4,8,'gold')
  if name=='shop':c.rect(3,5,26,7,'blue');c.rect(7,5,4,7,'white');c.rect(19,5,4,7,'white')
  if name=='save':c.rect(8,20,16,5,'white')
 elif name in ['hammer','buy','sell']:
  c.line(8,27,23,7,'brown',4);c.rect(12,5,16,8,'steel');c.rect(14,6,12,3,'white');
  if name in ['buy','sell']:c.circle(8,23,6,'gold');c.rect(5,22,6,2,'ink')
 elif name in ['coin','diamond','iron','stone']:
  if name=='coin':c.circle(16,16,12,'ink');c.circle(16,15,10,'gold');c.circle(16,15,7,'light');c.rect(14,8,4,15,'gold')
  elif name=='diamond':
   for y in range(5,28):
    w=int((11-abs(y-15))*0.9);c.rect(16-w,y,w*2+1,1,'#65d4e3' if y<17 else '#2d8bb0')
   c.line(16,7,9,16,'white',2)
  elif name=='iron':c.rect(4,15,24,10,'ink');c.rect(5,12,22,10,'steel');c.rect(8,9,16,4,'white')
  else:c.rect(4,10,24,17,'ink');c.rect(7,7,18,17,'#9599a1');c.line(9,10,22,10,'steel',2);c.line(15,17,24,17,'#666975',2)
 elif name in ['mail','send','book']:
  c.rect(3,6,26,21,'ink');c.rect(5,8,22,17,'paper')
  if name=='book':c.line(16,9,16,25,'brown',2);c.line(7,12,12,12,'brown');c.line(20,12,25,12,'brown')
  else:c.line(5,8,16,18,'brown',2);c.line(16,18,27,8,'brown',2);c.circle(17,19,3,'blue')
 elif name in ['land','home']:
  c.rect(3,25,26,5,'green');c.rect(7,13,18,13,'brown');c.rect(10,14,12,11,'paper');c.rect(14,20,4,6,'ink');
  for y in range(4,15):c.rect(16-(y-3),y,2*(y-3)+1,2,'red')
  if name=='land':c.line(27,6,27,24,'steel',2);c.rect(27,6,5,7,'blue')
 elif name=='gift':c.rect(5,11,22,18,'blue');c.rect(3,9,26,5,'steel');c.rect(14,9,4,20,'gold');c.line(16,9,9,4,'gold',3);c.line(16,9,23,4,'gold',3)
 elif name in ['previous','next','cancel','refresh']:
  if name=='cancel':c.line(7,7,24,24,'red',4);c.line(24,7,7,24,'red',4)
  elif name=='refresh':c.circle(16,16,11,'blue');c.circle(16,16,7,'ink');c.rect(20,4,7,9,'steel')
  else:
   flip=name=='next'
   def x(n):return 31-n if flip else n
   c.line(x(6),16,x(26),16,'blue',4);c.line(x(6),16,x(16),6,'steel',3);c.line(x(6),16,x(16),26,'steel',3)
 elif name=='players':c.circle(11,10,5,'paper');c.circle(23,11,4,'gold');c.rect(5,17,13,12,'blue');c.rect(20,17,9,12,'green')
 elif name=='wheat':
  c.line(15,7,15,29,'brown',2)
  for y in [7,12,17]:c.line(7,y,14,y+5,'gold',3);c.line(16,y+5,23,y,'light',3)
 elif name=='wood':c.rect(6,5,20,23,'brown');c.rect(9,7,15,18,'paper');c.rect(12,10,9,12,'brown');c.rect(14,12,5,8,'paper')
 elif name=='bread':c.rect(3,13,26,12,'brown');c.rect(5,10,22,12,'gold');c.rect(8,8,16,4,'gold');c.line(11,11,9,17,'light',2);c.line(18,11,16,17,'light',2)
 elif name in ['torch','compass']:
  if name=='torch':c.line(13,26,19,12,'brown',4);c.rect(16,5,8,12,'red');c.rect(18,7,4,7,'gold')
  else:c.circle(16,16,13,'ink');c.circle(16,16,10,'steel');c.line(12,23,20,8,'red',3)
 c.save('textures/smp/'+name+'.png')
def main():
 for name in ['empty','menu','shop','parcel','save','hammer','buy','sell','coin','diamond','iron','stone','mail','send','book','land','home','gift','previous','next','cancel','refresh','players','wheat','wood','bread','torch','compass']:draw(name)
 c=Canvas(264,208);c.rect(0,0,264,208,'ink');c.rect(2,2,260,204,'#e8e9e9');c.rect(4,4,256,200,'#a5abb2');c.rect(6,6,252,24,'#c6ccd1')
 for y in range(6):
  for x in range(9):
   xx=6+x*28;yy=34+y*28;c.rect(xx,yy,28,28,'#515962');c.rect(xx+1,yy+1,26,26,'#c2c6c9');c.rect(xx+1,yy+1,25,25,'#7d8892')
 c.save('textures/smp/chest.png')
 for name,co in [('slot','#7d8892'),('slot_hover','#b5cbd3'),('slot_pressed','#6e9fae')]:
  c=Canvas(28,28);c.rect(0,0,28,28,'#515962');c.rect(1,1,26,26,'#c2c6c9');c.rect(1,1,25,25,co);c.save('textures/smp/'+name+'.png')
 # Pack icon: upscale the newly drawn chest icon without reading/modifying reference images.
 c=Canvas(64,64);c.rect(0,0,64,64,'ink');c.rect(3,3,58,58,'blue');c.rect(8,8,48,48,'ink');c.rect(12,18,40,34,'brown');c.rect(14,20,36,13,'paper');c.line(12,33,51,33,'ink',3);c.rect(28,28,8,15,'gold');c.save('pack_icon.png')
if __name__=='__main__':main()
