#include "MicroBit.h"
#include "MicroBitFlash.h"

#define MAJOR_VERSION 1
#define MINOR_VERSION 1

MicroBitSerial pc(USBTX, USBRX, 200);
MicroBitStorage storage;
MicroBitFlash flash;
MicroBitMessageBus messageBus;

void lib_init(void);
void direct_setshape(uint8_t,uint8_t,uint8_t,uint8_t,uint8_t);
void setbrightness(int32_t);

uint8_t ugetc(){return pc.read(SYNC_SPINWAIT);}
int ugetcAsync(){return pc.read(ASYNC);}
void uputc(uint8_t c){pc.sendChar(c, SYNC_SPINWAIT);}

void vm_start(uint8_t);
void vm_run(void);
void vm_stop(void);
void vm_runcc(uint32_t);
int vm_run_toggle(uint8_t);

int32_t now(void);
void evt_poll(void);
void dev_poll(void);
void print(int32_t);
int rpeek(void);
void rsend(uint8_t);
void send_io_state(void);
extern int btna_evt, btnb_evt, btnab_evt, radio_evt;
extern volatile int32_t ticks;
void prs(uint8_t*);

#define OP_ONSTART 5
#define OP_ONBUTTONA 0x80
#define OP_ONBUTTONB 0x81
#define OP_ONBUTTONAB 0x82
#define OP_ONRECEIVE 0x83
#define OP_ONFLAG 0xF0

uint8_t code[128];

void init(){
    pc.baud(19200);
    scheduler_init(messageBus);
}

uint32_t read16(){
    uint8_t c1 = ugetc();
    uint8_t c2 = ugetc();
    return (c2<<8)+c1;
}

uint32_t read32(){
    uint8_t c1 = ugetc();
    uint8_t c2 = ugetc();
    uint8_t c3 = ugetc();
    uint8_t c4 = ugetc();
    return (c4<<24)+(c3<<16)+(c2<<8)+c1;
}

void sendresponse(uint8_t resp){
    uputc(resp);
    uputc(0);
    uputc(0xed);
}

void ping(){
    uputc(0xff);
    uputc(2);
    uputc(MAJOR_VERSION);
    uputc(MINOR_VERSION);
    uputc(0xed);
}

void readmemory(){
    uint32_t addr = read32();
    uint32_t count = ugetc();
    uint32_t i;
    uputc(0xfe);
    uputc(count);
    for(i=0;i<count;i++) uputc(*((uint8_t*) addr++));
    uputc(0xed);
}

void writememory(){
    uint32_t addr = read32();
    uint32_t count = ugetc();
    uint32_t i;
    uputc(0xfd);
    uputc(count);
    for(i=0;i<count;i++){
        uint8_t c = ugetc();
        *((uint8_t*) addr++)=c;
        uputc(c);
    }
    uputc(0xed);
}

void writeflash(){
    uint32_t src = read32();
    uint32_t dst = read32();
    uint32_t count = read16();
    flash.flash_write((uint32_t*)dst, (uint32_t*)src, (int)count);
    sendresponse(0xfc);
}

void eraseflash(){
    uint32_t addr = read32();
    flash.erase_page((uint32_t*)addr);
    sendresponse(0xfb);
}

void setshapecmd(){
    direct_setshape(ugetc(), ugetc(), ugetc(), ugetc(), ugetc());
}

void setbrightnesscmd(){
    setbrightness(ugetc());
}

void runcc(){
    uint32_t count = ugetc();
    uputc(0xf8);
    uputc(count);
    for(uint8_t i=0;i<count;i++){
        uint8_t c = ugetc();
        code[i] = c;
        uputc(c);
    }
    uputc(0xed);
    vm_runcc((uint32_t)code);
}

void rsendcmd(){
    uint32_t count = ugetc();
    for(uint8_t i=0;i<count;i++) rsend(ugetc());
}


void pollcmd(){
    vm_stop();
    send_io_state();
}

void dispatch(uint8_t c){
    if(c==0xff) ping();
    else if(c==0xfe) readmemory();
    else if(c==0xfd) writememory();
    else if(c==0xfc) writeflash();
    else if(c==0xfb) eraseflash();
    else if(c==0xfa) vm_start(OP_ONSTART);
    else if(c==0xf9) vm_stop();
    else if(c==0xf8) runcc();
    else if(c==0xf7) setshapecmd();
    else if(c==0xf6) setbrightnesscmd();
    else if(c==0xf5) pollcmd();
    else if(c==0xf4) rsendcmd();
    else uputc(c);
}

int main() {
    init();
    lib_init();
    prs((uint8_t*)"starting...");
    vm_stop();
    int32_t end = now()+50;
    while(1){
        while(now()<end){
            int c = ugetcAsync();
            if (c!=MICROBIT_NO_DATA) dispatch((uint8_t)c);
            dev_poll();
        }
        evt_poll();
        if(btna_evt){btna_evt=0; vm_run_toggle(OP_ONBUTTONA);}
        if(btnb_evt){btnb_evt=0; vm_run_toggle(OP_ONBUTTONB);}
        if(btnab_evt){btnab_evt=0; vm_run_toggle(OP_ONBUTTONAB);}
        if(radio_evt){
            radio_evt=0;
            vm_start(OP_ONRECEIVE);
            if(rpeek()<8) vm_start(OP_ONFLAG+rpeek());
        }
        vm_run();
        end += 50;
    }
}

