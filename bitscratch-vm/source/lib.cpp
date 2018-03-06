#include <stdint.h>
#include "MicroBit.h"
#include "MicroBitTicker.h"


#define flashshapes 0x31000

unsigned char directshape[5];

MicroBitDisplay display;
MicroBitButton buttona(MICROBIT_PIN_BUTTON_A, MICROBIT_ID_BUTTON_A);
MicroBitButton buttonb(MICROBIT_PIN_BUTTON_B, MICROBIT_ID_BUTTON_B);
MicroBitI2C i2c = MicroBitI2C(I2C_SDA0, I2C_SCL0); 
MicroBitAccelerometer acc = MicroBitAccelerometer(i2c); 
MicroBitFont ramshapefont((const unsigned char*)directshape, 32+2);
MicroBitTicker ticker;
MicroBitRadio radio;

extern MicroBitStorage flash;
extern MicroBitSerial pc;

void uputc(uint8_t);

void mwait(int32_t);
void setshape(int32_t);
void clear(void);
void direct_setshape(uint8_t,uint8_t,uint8_t,uint8_t,uint8_t);
int radiorecv(void);
void print(int32_t);

extern volatile uint32_t ticks;
uint32_t lastticks;
uint32_t t0;
int btna_evt, last_btna;
int btnb_evt, last_btnb;
int radio_evt;

int32_t pollphase;
int16_t xbuf[32];
int16_t ybuf[32];
int16_t zbuf[32];
int16_t accbuf[32];

char prbuf[128];
char* prptr;

int thisshape = 0;
int shapeoffh = 0;
int shapeoffv = 0;
int recvchar=-1;
int pollrecv=-1;
int pollinhibit = 0;


void lib_init(){
  microbit_seed_random();
  radio.enable();
  display.setDisplayMode(DISPLAY_MODE_BLACK_AND_WHITE);
  display.setBrightness(100);
  direct_setshape(0x00,0x00,0x04,0x00,0x00); mwait(50);
  direct_setshape(0x00,0x0e,0x04,0x0e,0x00); mwait(50);
  direct_setshape(0x1f,0x11,0x11,0x11,0x1f); mwait(50);
  direct_setshape(0x00,0x0e,0x00,0x0e,0x00); mwait(50);
  direct_setshape(0x00,0x00,0x04,0x00,0x00); mwait(50);
  clear();
}

void evt_poll(){
  if(pollinhibit>0){pollinhibit--; return;}
  int this_btna = buttona.isPressed();
  if(this_btna&!last_btna) btna_evt=1;
  last_btna = this_btna;
  int this_btnb = buttonb.isPressed();
  if(this_btnb&!last_btnb) btnb_evt=1;
  last_btnb = this_btnb;
  int c = radiorecv();
  if(c!=-1) {recvchar = c; pollrecv=c; radio_evt=1;}
}

void dev_poll(){
  if(ticks==lastticks) return;
  lastticks = ticks;
  int16_t x = acc.getX();
  int16_t y = acc.getY();
  int16_t z = acc.getZ();
  float acc = sqrt((float)(x*x+y*y+z*z));
  xbuf[pollphase] = x;
  ybuf[pollphase] = y;
  zbuf[pollphase] = z;
  accbuf[pollphase] = (int32_t)acc;
  pollphase++;
  pollphase &= 0x1f;
}

void direct_setshape(uint8_t a, uint8_t b, uint8_t c,  uint8_t d,  uint8_t e){
  directshape[0] = a;
  directshape[1] = b;
  directshape[2] = c;
  directshape[3] = d;
  directshape[4] = e;
  MicroBitFont::setSystemFont(ramshapefont); 
  display.printChar(32);
}

void ddots(uint8_t* s){
  direct_setshape(s[0],s[1],s[2],s[3],s[4]);
}

void setshape(int32_t s){
  if(s<=0) clear();
  else {
    ddots((uint8_t*)&((unsigned char*)flashshapes)[5*(s-1)]);
    thisshape = s;
    shapeoffh = 0;
    shapeoffv = 0;
  }
}

void nextshape(){
  unsigned char *font = (unsigned char*)flashshapes;
  thisshape++;
  shapeoffh = 0;
  shapeoffv = 0;
  if(font[5*(thisshape-1)]==0xff) thisshape = 1;
  ddots(&font[5*(thisshape-1)]);
}

void prevshape(){
  unsigned char *font = (unsigned char*)flashshapes;
  shapeoffh = 0;
  shapeoffv = 0;
  if(thisshape>1) thisshape--;
  else {
    thisshape = 1;
    while(font[5*thisshape]!=0xff) thisshape++;
  }
  ddots(&font[5*(thisshape-1)]);
}

void doton(uint8_t a, uint8_t b){
  a%=5; b%=5;
  directshape[4-b] |= 1<<(4-a);
  display.printChar(32);
}

void dotoff(uint8_t a, uint8_t b){
  a%=5; b%=5;
  directshape[4-b] &= (0x3f^(1<<(4-a)));
  display.printChar(32);
}

void clear(){
  direct_setshape(0,0,0,0,0);
  thisshape = 0;
  shapeoffh = 0;
  shapeoffv = 0;
}

void shifthDraw(){
  uint8_t *font = (uint8_t*)flashshapes;
  uint8_t *lefts = &font[5*(thisshape-1)];
  uint8_t *rights = &font[5*(thisshape)];
  if(*rights==0xff) rights = font;
  uint8_t line1 = ((lefts[0]<<shapeoffh)&0x3f)+(rights[0]>>(5-shapeoffh));
  uint8_t line2 = ((lefts[1]<<shapeoffh)&0x3f)+(rights[1]>>(5-shapeoffh));
  uint8_t line3 = ((lefts[2]<<shapeoffh)&0x3f)+(rights[2]>>(5-shapeoffh));
  uint8_t line4 = ((lefts[3]<<shapeoffh)&0x3f)+(rights[3]>>(5-shapeoffh));
  uint8_t line5 = ((lefts[4]<<shapeoffh)&0x3f)+(rights[4]>>(5-shapeoffh));
  direct_setshape(line1,line2,line3,line4,line5);
}

void shiftl(){
  if(thisshape==0) return;
  if(shapeoffv>0) shapeoffv=0;
  shapeoffh++;
  if(shapeoffh==5) nextshape();
  else shifthDraw();
}

void shiftr(){
  if(thisshape==0) return;
  if(shapeoffv>0) shapeoffv=0;
  if(shapeoffh>0) shapeoffh--;
  else {
    if(thisshape>1) thisshape--;
    else {
      uint8_t *font = (uint8_t*)flashshapes;
      thisshape = 1;
      while(font[5*thisshape]!=0xff) thisshape++;
    }
    shapeoffh = 4;
  }
  shifthDraw();
}

void shiftvDraw(){
  uint8_t *font = (uint8_t*)flashshapes;
  uint8_t *top = &font[5*(thisshape-1)+shapeoffv];
  uint8_t line1 = *top++; if(*top==0xff) top = font;
  uint8_t line2 = *top++; if(*top==0xff) top = font;
  uint8_t line3 = *top++; if(*top==0xff) top = font;
  uint8_t line4 = *top++; if(*top==0xff) top = font;
  uint8_t line5 = *top++; if(*top==0xff) top = font;
  direct_setshape(line1,line2,line3,line4,line5);
}

void shiftu(){
  if(thisshape==0) return;
  if(shapeoffh>0) shapeoffh=0;
  shapeoffv++;
  if(shapeoffv==5) nextshape();
  else shiftvDraw();
}

void shiftd(){
  if(thisshape==0) return;
  if(shapeoffh>0) shapeoffh=0;
  if(shapeoffv>0) shapeoffv--;
  else {
    if(thisshape>1) thisshape--;
    else {
      uint8_t *font = (uint8_t*)flashshapes;
      thisshape = 1;
      while(font[5*thisshape]!=0xff) thisshape++;
    }
    shapeoffv = 4;
  }
  shiftvDraw();
}


void mwait(int32_t d){
  if(d<0) return;
  uint64_t end = system_timer_current_time()+d;
  while(system_timer_current_time()<end){};
}

int32_t lib_random(int32_t min, int32_t max){
  return min+microbit_random(max-min+1);
}

void sendprbuf(){
  int len = strlen(prbuf);
  uputc(0xf0);
  uputc(len);
  for(int i=0;i<len;i++) uputc(prbuf[i]);
  uputc(0xed);
}

void printnum(int32_t n){
  if(n<0) {*prptr++='-'; n=-n;}
  int32_t k = (int32_t)(n/100);
  int32_t d1 = (int32_t)((n/10)%10);
  int32_t d2 = (int32_t)(n%10);
  prptr+= sprintf(prbuf,"%d", (int)k);
  if(d1||d2) *prptr++='.';
  if(d1||d2) prptr+= sprintf(prbuf,"%d",(int)d1);
  if(d2) prptr+= sprintf(prbuf,"%d",(int)d2);
}

void print(int32_t c){prptr = prbuf; printnum(c); sprintf(prptr,"\n"); sendprbuf();}
void prs(uint8_t *s){sprintf(prbuf,"%s\n",s); sendprbuf();}

void prf(uint8_t *s, int32_t n) {
  prptr = prbuf;
  for (; *s; s++) {
    if (*s=='%'){
      s++;
      switch (*s){
          case 'b': prptr+= sprintf(prbuf,"%02x",(int)n); break;
          case 'h': prptr+= sprintf(prbuf,"%04x",(int)n); break;
          case 'w': prptr+= sprintf(prbuf,"%08x",(int)n); break;
          case 'd': printnum(n); break;
          case 0: return;
          default: *prptr++=*s; break;
      }
    } else *prptr++=*s;
  }
  *prptr = 0;
  sendprbuf();
}

void setbrightness(int32_t b){display.setBrightness(b);}

void flashwrite(uint32_t* addr, uint32_t data){flash.flashWordWrite(addr, data);}
void flasherase(uint32_t* addr){flash.flashPageErase(addr);}

void resett(){t0 = (uint32_t)system_timer_current_time();}
uint32_t timer(){return ((uint32_t)system_timer_current_time()) - t0;}
uint32_t get_ticks(){return ticks;}

int32_t now(){return (int32_t) system_timer_current_time();}

uint32_t get_buttona(){return buttona.isPressed();}
uint32_t get_buttonb(){return buttonb.isPressed();}

int32_t buf_ave(int16_t *buf){
  int res=0;
  for(int i=0;i<32;i++) res+=buf[i];
  return (int32_t)(res/32);
}

int32_t accx(){return buf_ave(xbuf);}
int32_t accy(){return buf_ave(ybuf);}
int32_t accz(){return buf_ave(zbuf);}
int32_t accmag(){return buf_ave(accbuf);}

void rsend(uint8_t c){radio.datagram.send(&c, 1);}
int rrecc(){int c=recvchar; recvchar=-1; return c;}
int rpeek(){return recvchar;}

int radiorecv(){
  uint8_t c;
  radio.idleTick();
  int len = radio.datagram.recv(&c, 1);
  if(len==MICROBIT_INVALID_PARAMETER) return -1;
  else return c;
}

void uputc16(int32_t n){
  uputc(n&0xff);
  uputc((n>>8)&0xff);
}

void send_io_state(){
  pollinhibit = 10;
  uputc(0xf5);
  uputc(11);
  uputc(buttona.isPressed());
  uputc(buttonb.isPressed());
  uputc(pollrecv); pollrecv=-1;
  uputc16(accx());
  uputc16(accy());
  uputc16(accz());
  uputc16(accmag());
  uputc(0xed);
}

