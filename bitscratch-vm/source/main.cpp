#include "MicroBit.h"
#include "MicroBitUARTService.h"
#include "MicroBitFlash.h"

#define MAJOR_VERSION 2
#define MINOR_VERSION 0

MicroBitSerial usb_uart(USBTX, USBRX, 200);
MicroBitStorage storage;
MicroBitFlash flash;
MicroBitMessageBus messageBus;

MicroBitBLEManager bleManager(storage);
BLEDevice ble;
MicroBitUARTService *ble_uart;

void lib_init(void);
void direct_setshape(uint8_t,uint8_t,uint8_t,uint8_t,uint8_t);
void setbrightness(int32_t);
void boot_flash(void);

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
void usb_io_state(void);
void ble_io_state(void);
extern int btna_evt, btnb_evt, btnab_evt, radio_evt;
extern volatile int32_t ticks;
extern int pollinhibit;
void prs(uint8_t*);

#define OP_ONSTART 5
#define OP_ONBUTTONA 0x80
#define OP_ONBUTTONB 0x81
#define OP_ONBUTTONAB 0x82
#define OP_ONRECEIVE 0x83
#define OP_ONFLAG 0xF0

uint8_t code[128];
int usb_comms=0, ble_comms=0;

uint8_t usb_getc(){return usb_uart.read(SYNC_SPINWAIT);}
int ugetcAsync(){return usb_uart.read(ASYNC);}
void usb_putc(uint8_t c){usb_uart.sendChar(c, SYNC_SPINWAIT);}
void ble_putc(uint8_t c){ble_uart->putc(c);}


uint8_t ble_getc(){
    while(1){
        int c = ble_uart->getc(ASYNC);
        if (c!=MICROBIT_NO_DATA) return(c);
    }
}

void putc(uint8_t c){
	if(usb_comms) usb_putc(c);
	else if(ble_comms) ble_putc(c);
}

uint8_t getc(){
	if(usb_comms) return usb_getc();
	else if(ble_comms) return ble_getc();
	return 0;
}

void init(){
    usb_uart.baud(19200);
    scheduler_init(messageBus);
    microbit_create_heap(MICROBIT_SD_GATT_TABLE_START + MICROBIT_SD_GATT_TABLE_SIZE, MICROBIT_SD_LIMIT);
    ManagedString BLEName("art:bit v2");
    ManagedString BLESerial("00003");
    bleManager.init(BLEName, BLESerial, messageBus, false);
    ble_uart = new MicroBitUARTService(ble, 32, 32);
}

uint32_t read16(){
    uint8_t c1 = getc();
    uint8_t c2 = getc();
    return (c2<<8)+c1;
}

uint32_t read32(){
    uint8_t c1 = getc();
    uint8_t c2 = getc();
    uint8_t c3 = getc();
    uint8_t c4 = getc();
    return (c4<<24)+(c3<<16)+(c2<<8)+c1;
}

void sendresponse(uint8_t resp){
    putc(resp);
    putc(0);
    putc(0xed);
}

void ping(){
    putc(0xff);
    putc(2);
    putc(MAJOR_VERSION);
    putc(MINOR_VERSION);
    putc(0xed);
}

void readmemory(){
    uint32_t addr = read32();
    uint32_t count = getc();
    uint32_t i;
    putc(0xfe);
    putc(count);
    for(i=0;i<count;i++) putc(*((uint8_t*) addr++));
    putc(0xed);
}

void writememory(){
    uint32_t addr = read32();
    uint32_t count = getc();
    uint32_t i;
    putc(0xfd);
    putc(count);
    for(i=0;i<count;i++){
        uint8_t c = getc();
        *((uint8_t*) addr++)=c;
        putc(c);
    }
    putc(0xed);
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
    direct_setshape(getc(), getc(), getc(), getc(), getc());
}

void setbrightnesscmd(){
    setbrightness(getc());
}

void runcc(){
    uint32_t count = getc();
    putc(0xf8);
    putc(count);
    for(uint8_t i=0;i<count;i++){
        uint8_t c = getc();
        code[i] = c;
        putc(c);
    }
    putc(0xed);
    vm_runcc((uint32_t)code);
}

void rsendcmd(){
    uint32_t count = getc();
    for(uint8_t i=0;i<count;i++) rsend(getc());
}


void pollcmd(){
    vm_stop();
    usb_io_state();
}

void serial_dispatch(uint8_t c){
	usb_comms = 1;
	pollinhibit = 40;  // about 2 seconds
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
    else putc(c);
	usb_comms = 0;
}

void ble_dispatch(uint8_t c){
	ble_comms = 1;
    pollinhibit = 1000000;
    if(c==0xf7) setshapecmd();
    else if(c==0xf6) setbrightnesscmd();
    else if(c==0xf5) ble_io_state();
    else if(c==0xf3) boot_flash();
	ble_comms = 0;
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
            if (c!=MICROBIT_NO_DATA) serial_dispatch((uint8_t)c);
            c = ble_uart->getc(ASYNC);
            if (c!=MICROBIT_NO_DATA) ble_dispatch(c);
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

