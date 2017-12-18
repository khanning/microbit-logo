#include <stdint.h>
#include "MicroBit.h"
#include "MicroBitTicker.h"
#include "cvm.h"


#define flashshapes 0x31000

extern char shapes[];
unsigned char directshape[5];

MicroBitDisplay display;
MicroBitButton buttona(MICROBIT_PIN_BUTTON_A, MICROBIT_ID_BUTTON_A);
MicroBitButton buttonb(MICROBIT_PIN_BUTTON_B, MICROBIT_ID_BUTTON_B);
MicroBitI2C i2c = MicroBitI2C(I2C_SDA0, I2C_SCL0); 
MicroBitAccelerometer acc = MicroBitAccelerometer(i2c); 
MicroBitFont charfont;
MicroBitFont ramshapefont((const unsigned char*)directshape, 32+2);
MicroBitTicker ticker;
MicroBitRadio radio;

extern MicroBitStorage flash;
extern MicroBitSerial pc;

void mwait(SLONG);
void dshape(char);
void clear(void);
int radiorecv(void);
int serialAvail(void);

void prs(UBYTE*);

SLONG buf_ave(SSHORT*);

extern volatile uint32_t ticks;
uint32_t tick_period;
ULONG t0;
int tick_evt, radio_evt;
int btna_evt, last_btna;
int btnb_evt, last_btnb;

int thisshape = 0;
int recvchar=-1;

SSHORT xbuf[32];
SSHORT ybuf[32];
SSHORT zbuf[32];
SLONG last_ave[3];

void lib_init(){
  radio.enable();
  display.setDisplayMode(DISPLAY_MODE_GREYSCALE);
  display.setBrightness(100);
  MicroBitFont::setSystemFont(ramshapefont); 
  dshape(101); mwait(50);
  dshape(102); mwait(50);
  dshape(103); mwait(50);
  dshape(102); mwait(50);
  dshape(101); mwait(50);
  clear();
}

void evt_poll(){
  if(tick_period&&((ticks%tick_period)==0)) tick_evt = true;
  int this_btna = buttona.isPressed();
  if(this_btna&!last_btna) btna_evt=1;
  last_btna = this_btna;
  int this_btnb = buttonb.isPressed();
  if(this_btnb&!last_btnb) btnb_evt=1;
  last_btnb = this_btnb;
  int c = radiorecv();
  if(c!=-1) {recvchar = c; radio_evt=1;}
}

void dev_poll(){
  xbuf[ticks&0x1f] = acc.getX();
  ybuf[ticks&0x1f] = acc.getY();
  zbuf[ticks&0x1f] = acc.getZ();
}

void print(SLONG c){pc.printf("%d\n", c);}
void prh(SLONG c){pc.printf("%08X\n", c);}
void prhb(SLONG c){pc.printf("%02X\n", c&0xff);}
void prhh(SLONG c){pc.printf("%04X\n", c&0xffff);}
void prs(UBYTE* s){pc.printf("%s\n", s);}

void prf(char *s, int32_t n) {
  for (; *s; s++) {
    if (*s=='%'){
      s++;
      switch (*s){
          case 'b': pc.printf("%02x", n); break;
          case 'h': pc.printf("%04x", n); break;
          case 'w': pc.printf("%08x", n); break;
          case 'd': pc.printf("%d", n); break;
          case 0: return;
          default: pc.sendChar(*s); break;
      }
    } else pc.sendChar(*s);
  }
}


void direct_setshape(UBYTE a, UBYTE b, UBYTE c,  UBYTE d,  UBYTE e){
  directshape[0] = a;
  directshape[1] = b;
  directshape[2] = c;
  directshape[3] = d;
  directshape[4] = e;
  display.printChar(32);
}

void ddots(UBYTE* s){
  direct_setshape(s[0],s[1],s[2],s[3],s[4]);
}

void dshape(char s){
  thisshape = s;
  if(s<100){
    ddots((UBYTE*)&((unsigned char*)flashshapes)[5*s]);
    thisshape = s;
  }
  else {
    ddots((UBYTE*)&shapes[5*(s-100)]);
    thisshape = 0;
  }
}

void nextshape(){
  unsigned char *font = (unsigned char*)flashshapes;
  thisshape++;
  if(font[5*thisshape]==0xff) thisshape = 0;
  ddots(&font[5*thisshape]);
}

void doton(UBYTE a, UBYTE b){
  directshape[4-b] |= 1<<(4-a);
  display.printChar(32);
}

void dotoff(UBYTE a, UBYTE b){
  directshape[4-b] &= (0x3f^(1<<(4-a)));
  display.printChar(32);
}

void dchar(char c){
  const unsigned char* chars = charfont.characters;
  ddots((UBYTE*)&chars[5*(c-32)]);
}


void clear(){
  direct_setshape(0,0,0,0,0);
  thisshape = 0;
}

void dprint(char* s, ULONG d){display.print(s, d);}
void setbrightness(int b){display.setBrightness(b);}



void startticker(uint32_t n){tick_period = n;}
void stopticker(){tick_period = 0;}


void flashwrite(uint32_t* addr, ULONG data){flash.flashWordWrite(addr, data);}
void flasherase(uint32_t* addr){flash.flashPageErase(addr);}

void resett(){t0 = (ULONG)system_timer_current_time();}
ULONG timer(){return ((ULONG)system_timer_current_time()) - t0;}
ULONG get_ticks(){return ticks;}

void mwait(SLONG d){
    if(d<0) return;
    uint64_t end = system_timer_current_time()+d;
    while(system_timer_current_time()<end){
      if (serialAvail()) return;
    };
}
 
ULONG get_buttona(){return buttona.isPressed();}
ULONG get_buttonb(){return buttonb.isPressed();}

SLONG buf_ave(SSHORT *buf){
  int res=0;
  for(int i=0;i<32;i++) res+=buf[i];
  return (SLONG)(res/32);
}

SLONG getx(){return buf_ave(xbuf);}
SLONG gety(){return buf_ave(ybuf);}
SLONG getz(){return buf_ave(zbuf);}

void rsend(uint8_t c){radio.datagram.send(&c, 1);}
int rrecc(){int c=recvchar; recvchar=-1; return c;}

int radiorecv(){
  uint8_t c;
  int len = radio.datagram.recv(&c, 1);
  if(len==MICROBIT_INVALID_PARAMETER) return -1;
  else return c;
}


void *fcns[] = {
    (void*) 1, (void*) print,  
    (void*) 1, (void*) prh,  
    (void*) 1, (void*) prhb,  
    (void*) 1, (void*) prhh,  
    (void*) 1, (void*) prs,  
    (void*) 2, (void*) prf,  
    (void*) 1, (void*) ddots,  
    (void*) 2, (void*) dprint,  
    (void*) 1, (void*) dchar,  
    (void*) 1, (void*) dshape,  
    (void*) 0, (void*) clear,  
    (void*) 1, (void*) setbrightness,  
    (void*) 2, (void*) flashwrite,  
    (void*) 1, (void*) flasherase,  
    (void*) 0, (void*) resett,  
    (void*) 0, (void*) timer,  
    (void*) 0, (void*) get_ticks,  
    (void*) 1, (void*) mwait,  
    (void*) 0, (void*) get_buttona,  
    (void*) 0, (void*) get_buttonb,  
    (void*) 0, (void*) getx,  
    (void*) 0, (void*) gety,  
    (void*) 0, (void*) getz,  
    (void*) 1, (void*) startticker,
    (void*) 0, (void*) stopticker,
    (void*) 1, (void*) rsend,
    (void*) 0, (void*) rrecc,
    (void*) 0, (void*) nextshape,
    (void*) 2, (void*) doton,
    (void*) 2, (void*) dotoff,
};
