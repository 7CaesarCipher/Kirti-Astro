"""Render installed PyJHora chakra widgets offscreen; no birth-data files."""
import os,sys,json,io,contextlib,base64
os.environ['QT_QPA_PLATFORM']='offscreen'
def main(data):
 from PyQt6.QtWidgets import QApplication
 from PyQt6.QtCore import QBuffer,QIODevice
 from jhora import utils
 from jhora.panchanga import drik
 from jhora.ui import chakra
 app=QApplication([]);utils.set_language(data['language'])
 pp=data['positions'];retro=data['retrograde'];base=data['base_star'];star,pada=data['birth_star'],data['birth_pada']
 classes=[('KotaChakra','Kota Chakra'),('KaalaChakra','Kaala Chakra'),('Sarvatobadra','Sarvatobhadra Chakra'),('SuryaKalanala','Surya Kalanala'),('ChandraKalanala','Chandra Kalanala'),('Shoola','Shoola Chakra'),('Tripataki','Tripataki Chakra'),('SapthaShalaka','Saptha Shalaka / Rahu Kalanala'),('PanchaShalaka','Pancha Shalaka'),('SapthaNaadi','Saptha Naadi')]
 result=[]
 for cls,title in classes:
  widget=None
  try:
   widget=getattr(chakra,cls)()
   kwargs={'planet_positions':pp,'planets_in_retrograde':retro,'label_font_size':10}
   if cls=='KotaChakra':kwargs.update(birth_star=star,birth_star_padha=pada)
   if cls in ['KaalaChakra','SuryaKalanala','ChandraKalanala','Shoola']:kwargs['base_star']=base
   widget.setData(**kwargs)
   if cls=='KaalaChakra':widget.resize(1400,1000)
   widget.setStyleSheet('background:white; color:black;')
   widget.ensurePolished();widget.show();app.processEvents()
   image=widget.grab();buffer=QBuffer();buffer.open(QIODevice.OpenModeFlag.WriteOnly)
   if not image.save(buffer,'PNG'):raise ValueError('Image rendering failed')
   item={'id':cls,'name':title,'status':'calculated','image':'data:image/png;base64,'+base64.b64encode(bytes(buffer.data())).decode()}
   if cls=='KotaChakra':item['details']={'Kota lord':widget._kota_lord,'Kota paala':widget._kota_paala}
   result.append(item)
  except Exception as error:result.append({'id':cls,'name':title,'status':'not_calculated','reason':type(error).__name__})
  finally:
   if widget is not None:widget.close();widget.deleteLater();app.processEvents()
 return result
if __name__=='__main__':
 data=json.loads(sys.stdin.read())
 with contextlib.redirect_stdout(io.StringIO()):result=main(data)
 sys.stdout.write(json.dumps(result,ensure_ascii=False))
