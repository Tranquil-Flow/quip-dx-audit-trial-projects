from PIL import Image, ImageOps, ImageEnhance, ImageFilter
p='/private/tmp/qbrowse/web-836798/shots/0284.png'
im=Image.open(p).convert('RGB').crop((290,143,995,356))
# Red text on pink: retain pixels with significantly more red than green.
pix=im.load()
for y in range(im.height):
    for x in range(im.width):
        r,g,b=pix[x,y]
        v = 0 if (r > 90 and r > g*1.32 and r > b*1.2 and g < 220) else 255
        pix[x,y]=(v,v,v)
im.resize((im.width*4,im.height*4)).save('ocr-error.png')
