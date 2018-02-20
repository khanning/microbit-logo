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
MicroBitFont flashshapefont((const unsigned char*)flashshapes, 32+20);
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

int thisshape = 0;
int recvchar=-1;
int pollrecv=-1;


void lib_init(){
  microbit_seed_random();
  radio.enable();
  display.setDisplayMode(DISPLAY_MODE_GREYSCALE);
  display.setBrightness(100);
  direct_setshape(0x00,0x00,0x04,0x00,0x00); mwait(50);
  direct_setshape(0x00,0x0e,0x04,0x0e,0x00); mwait(50);
  direct_setshape(0x1f,0x11,0x11,0x11,0x1f); mwait(50);
  direct_setshape(0x00,0x0e,0x00,0x0e,0x00); mwait(50);
  direct_setshape(0x00,0x00,0x04,0x00,0x00); mwait(50);
  clear();
}

void evt_poll(){
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
  }
}

void nextshape(){
  unsigned char *font = (unsigned char*)flashshapes;
  thisshape++;
  if(font[5*(thisshape-1)]==0xff) thisshape = 1;
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
}

void mwait(int32_t d){
  if(d<0) return;
  uint64_t end = system_timer_current_time()+d;
  while(system_timer_current_time()<end){};
}

int32_t lib_random(int32_t min, int32_t max){
  return min+microbit_random(max-min+1);
}

void printnum(int32_t n){
  if(n<0) {pc.printf("-"); n=-n;}
  int32_t k = (int32_t)(n/100);
  int32_t d1 = (int32_t)((n/10)%10);
  int32_t d2 = (int32_t)(n%10);
  pc.printf("%d", k);
  if(d1||d2) pc.printf(".");
  if(d1||d2) pc.printf("%d",d1);
  if(d2) pc.printf("%d",d2);
}

void print(int32_t c){printnum(c); pc.printf("\n");}

void prf(uint8_t *s, int32_t n) {
  for (; *s; s++) {
    if (*s=='%'){
      s++;
      switch (*s){
          case 'b': pc.printf("%02x", n); break;
          case 'h': pc.printf("%04x", n); break;
          case 'w': pc.printf("%08x", n); break;
          case 'd': printnum(n); break;
          case 0: return;
          default: pc.sendChar(*s,SYNC_SPINWAIT); break;
      }
    } else pc.sendChar(*s,SYNC_SPINWAIT);
  }
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
  uputc(buttona.isPressed());
  uputc(buttonb.isPressed());
  uputc(pollrecv); pollrecv=-1;
  uputc16(accx());
  uputc16(accy());
  uputc16(accz());
  uputc16(accmag());
}

