"""Isolated offline renderer for package chakra widgets."""
import os,sys,json,base64,contextlib,io
os.environ['QT_QPA_PLATFORM']='offscreen'
def render(data):
 from PyQt6.QtWidgets import QApplication
 from PyQt6.QtCore import QBuffer,QIODevice,QSize,QRect
 from PyQt6.QtSvg import QSvgGenerator
 from PyQt6.QtGui import QPainter
 from jhora import utils
 from jhora.ui import chakra
 utils.set_language(data.get('language','en'))
 app=QApplication([])
 allowed=['SapthaNaadi','PanchaShalaka','SapthaShalaka','ChandraKalanala','Tripataki','SuryaKalanala','Shoola','Sarvatobadra','KaalaChakra','KotaChakra']
 name=data['name']
 if name not in allowed:raise ValueError('Unsupported chakra')
 pp=data['positions'];kwargs={'planet_positions':pp,'planets_in_retrograde':data.get('retrograde',[])}
 if name=='KaalaChakra':
  widget=getattr(chakra,name)()
  widget.setData(**kwargs,base_star=data['sun_star'])
 else:
  if name in ['ChandraKalanala','Shoola']:kwargs['base_star']=data['moon_star']
  if name=='SuryaKalanala':kwargs['base_star']=data['sun_star']
  if name=='KotaChakra':kwargs.update(birth_star=data['moon_star'],birth_star_padha=data['moon_pada'])
  widget=getattr(chakra,name)(**kwargs)
 if name=='Tripataki':widget._update_with_planet_labels()
 widget.resize(750,750);widget.show();app.processEvents()
 buffer=QBuffer();buffer.open(QIODevice.OpenModeFlag.WriteOnly)
 generator=QSvgGenerator();generator.setOutputDevice(buffer);generator.setSize(QSize(750,750));generator.setViewBox(QRect(0,0,750,750))
 painter=QPainter(generator);widget.render(painter);painter.end()
 value={'svg':bytes(buffer.data()).decode(),'name':name}
 widget.close();return value
if __name__=='__main__':
 data=json.load(sys.stdin)
 with contextlib.redirect_stdout(io.StringIO()):result=render(data)
 print(json.dumps(result))
