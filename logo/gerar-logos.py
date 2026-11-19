# Gera todas as logos do site a partir de src.png (logo sem fundo enviada pelo dono).
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage as nd
src=Image.open('src.png').convert('RGBA'); A=np.asarray(src).astype(float); al=A[...,3]
lab,n=nd.label(al>8)            # 1 = "3D", 2 = tartaruga (+ "n" encostado), 3..11 = letras
lum=A[...,:3].mean(2)
T=lab==2
dark=T&(lum<90)&(al>8); light=T&(lum>=90)&(al>200)
# --- separa o "n" da perna: o n é traço grosso, o contorno tem ~7 px ---
yy,xx=np.mgrid[-8:9,-8:9]; disk=(xx**2+yy**2)<=64
region=np.zeros_like(T); region[700:800,655:775]=True
nbody=nd.binary_opening(dark&region,structure=disk)
zone=nd.binary_dilation(nbody,iterations=4)&T
dist=nd.distance_transform_edt(~light)
ramp=np.clip(7.28+0.5-dist,0,1)
am=al.copy(); am[zone]=np.minimum(al[zone],ramp[zone]*255); am[~((lab==1)|T)]=0; am=am/255.0
nmask=zone&dark   # forma do n (inclusive a parte sob o contorno da perna)
def clean(arr): arr=arr.copy(); arr[...,:3][arr[...,3]<0.5]=0; return arr
ys,xs=np.where(al>0); P=6; box=(xs.min()-P,ys.min()-P,xs.max()+1+P,ys.max()+1+P)
def crop(arr,b): 
    H,W=arr.shape[:2]; c=np.zeros((b[3]-b[1],b[2]-b[0],4)); 
    sx0,sy0=max(b[0],0),max(b[1],0); sx1,sy1=min(b[2],W),min(b[3],H)
    c[sy0-b[1]:sy1-b[1],sx0-b[0]:sx1-b[0]]=arr[sy0:sy1,sx0:sx1]; return Image.fromarray(np.round(c).astype(np.uint8),'RGBA')
# claro
crop(clean(A),box).save('logo-c3d.png',optimize=True)
# escuro: letras brancas atrás, tartaruga/3D na frente
la=np.zeros_like(al); la[lab>=3]=al[lab>=3]/255.0
nreg=zone&(al>0)&~light
la[nreg]=(al[nreg]/255.0)*np.clip(dist[nreg]-7.28,0,1)   # o n termina exatamente embaixo do contorno da perna
near=nreg&(dist<10)&(la<0.65); la[near]=0                    # sem fiapos claros na emenda com o contorno
tm=am; Wc=np.array([244,247,242],float)
oa=tm+la*(1-tm)
orgb=(A[...,:3]*tm[...,None]+Wc*(la*(1-tm))[...,None])/np.maximum(oa,1e-6)[...,None]
crop(clean(np.dstack([orgb,oa*255])),box).save('logo-c3d-dark.png',optimize=True)
# marca
tur=A.copy(); tur[...,3]=am*255; tur=clean(tur)
def trim(arr):
    ys,xs=np.where(arr[...,3]>0); return Image.fromarray(np.round(arr).astype(np.uint8),'RGBA').crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
Tm=trim(tur)
def square(im,S,fill,bg=(0,0,0,0)):
    s=fill*S/max(im.size); r=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    c=Image.new('RGBA',(S,S),bg); c.alpha_composite(r,((S-r.width)//2,(S-r.height)//2)); return c
square(Tm,512,0.90).save('mark-c3d-512.png',optimize=True)
square(Tm,192,0.90).save('mark-c3d-192.png',optimize=True)
square(Tm,180,0.80,(255,255,255,255)).convert('RGB').save('apple-touch-c3d.png',optimize=True)
to=tur.copy(); to[lab==1]=0; To=trim(to)
for S in (32,48):
    im=square(To,S*4,0.98).resize((S,S),Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=0.6,percent=60,threshold=0))
    im.save(f'favicon-c3d-{S}.png',optimize=True)
Image.open('logo-c3d.png').save('logo-900.png',optimize=True)
print('ok', Image.open('logo-c3d.png').size, Image.open('logo-c3d-dark.png').size, Tm.size)
