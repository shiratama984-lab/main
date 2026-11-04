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
def icon(name):
 c=Canvas(32,32)
 if name in ['book','quest','map','magic']:
  c.rect(4,4,24,25,'ink');c.rect(5,5,22,22,'brown');c.rect(7,5,18,20,'paper');c.line(15,6,15,24,'brown');
  for y in [9,13,17,21]:c.line(8,y,12,y,'brown');c.line(18,y,23,y,'brown')
  if name=='quest':c.rect(13,8,5,10,'red');c.rect(13,20,5,4,'red')
  if name=='magic':c.circle(16,15,8,'purple');c.line(16,8,16,22,'light');c.line(9,15,23,15,'light');c.rect(14,13,5,5,'white')
  if name=='map':c.line(8,20,22,8,'green',2);c.line(19,7,24,12,'red',2);c.line(24,7,19,12,'red',2)
 elif name in ['sword','staff','arrow']:
  if name=='sword':
   c.line(9,24,25,8,'ink',5);c.line(10,23,25,8,'steel',3);c.line(11,23,25,9,'white');c.line(5,19,13,27,'gold',3);c.line(3,28,8,23,'brown',3);c.rect(2,28,4,3,'gold')
  if name=='staff':c.line(7,28,22,7,'ink',4);c.line(8,27,23,6,'brown',2);c.circle(23,7,6,'gold');c.circle(23,7,4,'purple');c.rect(22,4,2,3,'white')
  if name=='arrow':c.line(6,26,23,8,'brown',2);c.line(21,7,27,5,'steel',3);c.line(25,6,26,13,'steel',2);c.line(4,20,9,25,'white',2);c.line(7,17,12,22,'white',2)
 elif name in ['coin','crown']:
  if name=='coin':c.circle(16,16,12,'ink');c.circle(16,15,11,'gold');c.circle(16,15,8,'light');c.rect(14,8,4,15,'gold');c.rect(10,12,12,3,'gold')
  else:
   c.rect(5,15,22,11,'ink');c.rect(6,16,20,8,'gold');
   for x,y in [(6,10),(14,6),(22,10)]:c.rect(x,y,4,12,'gold');c.rect(x+1,y+1,2,3,'light')
   for x in [9,15,21]:c.rect(x,19,3,3,'red')
 elif name in ['flame','frost','heal']:
  if name=='flame':
   for x,y,w,h,co in [(8,14,16,13,'red'),(11,8,11,15,'red'),(16,3,4,19,'red'),(12,16,8,10,'gold'),(15,20,4,7,'light')]:c.rect(x,y,w,h,co)
  if name=='frost':
   for a in [0,math.pi/3,math.pi*2/3]:c.line(int(16-12*math.cos(a)),int(16-12*math.sin(a)),int(16+12*math.cos(a)),int(16+12*math.sin(a)),'steel',2)
   c.rect(13,13,7,7,'blue')
  if name=='heal':c.circle(16,16,13,'green');c.rect(13,7,6,18,'white');c.rect(7,13,18,6,'white')
 elif name=='back':c.line(7,16,25,16,'gold',4);c.line(6,16,14,7,'light',3);c.line(6,16,14,25,'light',3)
 elif name=='wheat':
  c.line(15,7,15,29,'brown',2)
  for y in [7,12,17]:c.line(7,y,14,y+5,'gold',3);c.line(16,y+5,23,y,'light',3)
 elif name=='wood':c.rect(6,5,20,23,'brown');c.rect(9,7,15,18,'paper');c.rect(12,10,9,12,'brown');c.rect(14,12,5,8,'paper')
 elif name=='stone':c.rect(5,9,22,17,'ink');c.rect(7,7,18,16,'#8d929c');c.line(8,10,20,10,'steel',2);c.line(13,17,24,17,'#555665',2)
 elif name=='iron':c.rect(4,15,23,10,'ink');c.rect(5,12,21,10,'steel');c.rect(8,9,15,5,'white');c.line(7,22,24,22,'blue',2)
 elif name=='bread':c.rect(3,13,26,12,'brown');c.rect(5,10,22,12,'gold');c.rect(8,8,16,4,'gold');c.line(11,11,9,17,'light',2);c.line(18,11,16,17,'light',2)
 c.save('textures/arpg/'+name+'.png')
def main():
 for name in ['book','quest','map','magic','sword','staff','arrow','coin','crown','flame','frost','heal','back','wheat','wood','stone','iron','bread']:icon(name)
 c=Canvas(288,210);c.rect(0,0,288,210,'ink');c.rect(2,2,284,206,'gold');c.rect(4,4,280,202,'brown');c.rect(9,9,270,192,'paper');
 for y in range(11,199):
  for x in range(11,277):
   if (x*17+y*31)%89<3:c.rect(x,y,1,1,'#ceb17c')
 for x in [5,279]:
  for y in [5,201]:c.rect(x-2,y-2,6,6,'ink');c.rect(x-1,y-1,4,4,'gold');c.rect(x,y,1,1,'light')
 c.line(18,40,268,40,'brown');c.save('textures/arpg/parchment.png')
 for name,skin,cloth in [('raider','#84995e','#645142'),('shade','#657790','#393a63')]:
  c=Canvas(64,32);c.rect(0,0,32,16,skin);c.rect(32,0,32,16,cloth);c.rect(0,16,64,16,cloth)

  for yy in range(10,16):
   for xx in range(40,48):c.p[yy*64+xx]=(0,0,0,0)
  c.rect(8,8,8,8,skin);c.rect(9,10,2,2,'ink');c.rect(13,10,2,2,'ink');c.rect(10,14,4,1,'ink');c.rect(8,8,8,2,cloth)
  c.rect(20,20,8,12,cloth);c.rect(20,28,8,2,'gold');c.rect(22,21,4,5,'steel');c.rect(44,28,4,4,skin);c.rect(4,28,4,4,'ink');c.save('textures/entity/'+name+'.png')
 c=Canvas(64,64);c.rect(0,0,64,64,'ink');c.rect(3,3,58,58,'gold');c.rect(5,5,54,54,'brown');c.rect(12,12,40,40,'paper');c.line(32,15,32,50,'brown',2);c.line(16,22,26,22,'gold',2);c.line(38,22,48,22,'gold',2);c.line(16,32,26,32,'brown',2);c.line(38,32,48,32,'brown',2);c.save('pack_icon.png')
if __name__=='__main__':main()
