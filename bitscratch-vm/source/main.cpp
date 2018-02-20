#include "MicroBit.h"
#include "MicroBitFlash.h"

MicroBitSerial pc(USBTX, USBRX, 200); 
MicroBitStorage storage;
MicroBitFlash flash;
MicroBitMessageBus messageBus;

void lib_init(void);
void direct_setshape(uint8_t a, uint8_t b, uint8_t c,  uint8_t d,  uint8_t e);

uint8_t ugetc(){return pc.read(SYNC_SPINWAIT);}
int ugetcAsync(){return pc.read(ASYNC);}
void uputc(uint8_t c){pc.sendChar(c, SYNC_SPINWAIT);}

void vm_start(uint8_t);
void vm_run(void);
void vm_stop(void);
void vm(void);

int32_t now(void);
void evt_poll(void);
void dev_poll(void);
void print(int32_t);
int rpeek(void);
void send_io_state(void);
extern int btna_evt, btnb_evt, radio_evt;
extern volatile int32_t ticks;
extern int32_t stacks[];

#define OP_ONSTART 5
#define OP_ONBUTTONA 0x80
#define OP_ONBUTTONB 0x81
#define OP_ONRECEIVE 0x82
#define OP_ONFLAG 0xF0

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

void readmemory(){
    uint32_t addr = read32();
    uint32_t count = read16();
    uint32_t i;
    for(i=0;i<count;i++) uputc(*((uint8_t*) addr++));
}

void writememory(){
    uint32_t addr = read32();
    uint32_t count = read16();
    uint32_t i;
    for(i=0;i<count;i++){
        uint8_t c = ugetc();
        *((uint8_t*) addr++)=c;
        uputc(c);
    }
}

void writeflash(){
    uint32_t src = read32();
    uint32_t dst = read32();
    uint32_t count = read16();
    flash.flash_write((std::uint32_t*)dst, (std::uint32_t*)src, (int)count);
    uputc(0xbf);
}

void eraseflash(){
    uint32_t addr = read32();
    flash.erase_page((std::uint32_t*)addr);
    uputc(0xaf);
}

void setshapecmd(){
    direct_setshape(ugetc(), ugetc(), ugetc(), ugetc(), ugetc());
}

void getaddrs(){
    int32_t addrs[2];
    int8_t* bytes = (int8_t*) addrs;
    addrs[0] = (int32_t) stacks;
    addrs[1] = (int32_t) vm;
    for(int i=0;i<8;i++) uputc(bytes[i]);
}

void dispatch(uint8_t c){
    if(c==0xff) uputc(23);
    else if(c==0xfe) readmemory();
    else if(c==0xfd) writememory();
    else if(c==0xfc) vm_start(OP_ONSTART);
    else if(c==0xfb) writeflash();
    else if(c==0xfa) eraseflash();
    else if(c==0xf9) setshapecmd();
    else if(c==0xf8) vm_stop();
    else if(c==0xf7) getaddrs();
    else if(c==0xf6) send_io_state();
    else uputc(c);
}

int main() {
    init();
    lib_init();
    pc.printf("starting...\n");
    vm_stop();
    int32_t end = now()+25;
    while(1){
        while(now()<end){
            int c = ugetcAsync();
            if (c!=MICROBIT_NO_DATA) dispatch((uint8_t)c);
            dev_poll();
        }
        evt_poll();
        if(btna_evt){btna_evt=0; vm_start(OP_ONBUTTONA);}
        if(btnb_evt){btnb_evt=0; vm_start(OP_ONBUTTONB);}
        if(radio_evt){
            radio_evt=0; 
            vm_start(OP_ONRECEIVE);
            if(rpeek()<8) vm_start(OP_ONFLAG+rpeek());
        }
        vm_run();
        end += 25;
    }
}

