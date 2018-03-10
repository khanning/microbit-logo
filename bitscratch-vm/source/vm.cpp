#include <stdint.h>

#define procs 0x30000
#define code ((uint8_t*)procs)
#define NSTACKS 16
#define STACKLEN 128
int32_t stacks[NSTACKS*STACKLEN];

#define OP_ONSTART 5
#define FIRST_FLAG 0xf0

void dev_poll(void);
int32_t now(void);
int32_t lib_random(int32_t,int32_t);
void print(int32_t);
void prs(uint8_t*);
void prf(uint8_t*,int32_t);
void resett(void);
int32_t timer(void);
int32_t get_ticks(void);

void clear();
void setshape(int32_t);
void nextshape(void);
void prevshape(void);
void doton(uint8_t, uint8_t);
void dotoff(uint8_t, uint8_t);
void shiftl(void);
void shiftr(void);
void shiftd(void);
void shiftu(void);
void setbrightness(int32_t);

int32_t accx(void);
int32_t accy(void);
int32_t accz(void);
int32_t accmag(void);
int32_t get_buttona(void);
int32_t get_buttonb(void);
void rsend(uint8_t c);
int32_t rrecc(void);

extern void(*prims[])();

void vm(void);
void resume(int32_t*);
void eol_repeat(void);
void eol_list(void);
void eol_waituntil(void);
void eol_repeatuntil_cond(void);
void eol_repeatuntil_action(void);
void wait_again(void);
void eval_ufun(void);
void setup_stack(int32_t*,uint32_t,uint8_t);

int32_t *stack;
int32_t *sp;
uint8_t *ip;
int32_t *fp;
int32_t eoltype;

bool yieldnow;

int32_t boxes[20];
int32_t framewait = 50;

extern volatile int32_t ticks;
extern int32_t thisshape;

void vm_run(){
    int32_t *stack = stacks;
    for(int i=0;i<NSTACKS;i++){
        resume(stack);
        stack += STACKLEN;
    }
}

void vm_stop(){
    int32_t *stack = stacks;
    for(int i=0;i<NSTACKS;i++){
        *stack = 0;
        stack += STACKLEN;
    }
}

void vm_start(uint8_t type){
    int32_t *stack = stacks;
    uint32_t vector = procs;
    for(int i=0;i<NSTACKS;i++){
        setup_stack(stack, vector, type);
        stack += STACKLEN;
        vector += 4;
    }
}

void vm_runcc(uint32_t startaddr){
    setup_stack(&stacks[STACKLEN*(NSTACKS-1)], startaddr, 0);
//    setup_stack(stacks, startaddr, 0);
}

void setup_stack(int32_t *stack, uint32_t startaddr, uint8_t type){
    uint8_t firstop = *((uint8_t*) startaddr);
    if((type!=0)&&(type!=firstop)) return;
    int32_t *sp = stack;
    sp += 1;                // leave space for the sp
    *sp++ = (int32_t) vm;   // continuation
    *sp++ = startaddr;
    *sp++ = 0;              // fp
    *sp++ = 0;              // eoltype
    *stack = (int32_t) sp;
}

void resume(int32_t *newstack){
    stack = newstack;
    sp = (int32_t*)*stack;
    if(sp==0) return;
    eoltype = *--sp;
    fp = (int32_t*)*--sp;
    ip = (uint8_t*)*--sp;
    yieldnow = false;
    ((void(*)())*--sp)();
}

void yield(int32_t continuation){
    *sp++ = continuation;
    *sp++ = (int32_t) ip;
    *sp++ = (int32_t) fp;
    *sp++ = eoltype;
    *stack = (int32_t) sp;
    yieldnow = true;
}

void vm(){
    while(1){
        dev_poll();
        uint8_t token = *ip++;
        if((token==0)||(token==0xff)){
            *stack=0;
            break;
        }
        if(token<0x80){
            void(*prim)() = prims[token];
            prim();
        } else eval_ufun();
        if(yieldnow) break;
    }
}


void eval_done(){}

void eval_byte(){
    *sp++ = (*ip++)*100;
}

void eval_num(){
    int32_t t0 = *ip++;
    t0 += (*ip++<<8);
    t0 += (*ip++<<16);
    t0 += (*ip++<<24);
    *sp++ = t0;
}

void eval_list(){
    uint8_t offset = *ip++;
    offset += *ip++<<8;
    *sp++ = (int32_t)ip;
    ip+=offset;
}

void eval_eol(){
    void(*fcn)() = (void(*)())eoltype;
    fcn();
}

int32_t *get_local_address(){
    int32_t t0 = (int8_t) *ip++;
    if(t0<0) return fp-t0-1;
    else return fp-t0-5;
}

void eval_lthing(){
    *sp++ = *get_local_address();
}

void eval_lset(){
    *get_local_address() = *--sp;
}

void eval_lchange(){
    *get_local_address() += *--sp;
}

void eval_ufun(){
    uint32_t newip = *ip++;
    newip += *ip++<<8;
    *sp++ = (int32_t)ip;
    ip = (uint8_t*)(newip+code);
    *sp++ = *ip++;
    *sp++ = (int32_t)fp;
    *sp++ = eoltype;
    fp = sp;
}

void prim_stop(){
    int32_t t0;
    if(fp==0) return;
    sp = fp;
    eoltype = *--sp;
    fp = (int32_t*) *--sp;
    t0 = *--sp;
    ip = (uint8_t*)*--sp;
    sp-= t0;
}

void prim_output(){
    int32_t t0;
    int32_t res = *--sp;
    sp = fp;
    eoltype = *--sp;
    fp = (int32_t*) *--sp;
    t0 = *--sp;
    ip = (uint8_t*)*--sp;
    sp-= t0;
    *sp++ = res;
}

void prim_stopall(){
    vm_stop();
    yieldnow = true;
}

void prim_stopothers(){
    vm_stop();
}


void prim_repeat(){
    *sp++ = (int32_t)ip;
    *sp++ = eoltype;
    eoltype = (int32_t)eol_repeat;
    eol_repeat();
}

void eol_repeat(){
    if(*(sp-4)<=50) {
        eoltype = *--sp;
        ip = (uint8_t*)(*--sp);
        sp-=2;
    }
    else {
        (*(sp-4))-=100;
        ip=(uint8_t*)(*(sp-3));
        yield((int32_t)vm);
    }
}

void prim_repeatuntil(){
    *sp++ = (int32_t) ip;
    *sp++ = eoltype;
    eoltype = (int32_t)eol_repeatuntil_cond;
    ip=(uint8_t*)(*(sp-4));
}

void eol_repeatuntil_cond(){
    int32_t res = *--sp;
    if(!res){
        eoltype = (int32_t)eol_repeatuntil_action;
        ip=(uint8_t*)(*(sp-3));
//        yield((int32_t)vm);
    } else {
        eoltype = *--sp;
        ip = (uint8_t*)(*--sp);
        sp-=2;
        yield((int32_t)vm);
    }
}

void eol_repeatuntil_action(){
    eoltype = (int32_t)eol_repeatuntil_cond;
    ip=(uint8_t*)(*(sp-4));
    yield((int32_t)vm);
}

void prim_waituntil(){
    *sp++ = (int32_t) ip;
    *sp++ = eoltype;
    eoltype = (int32_t)eol_waituntil;
    ip=(uint8_t*)(*(sp-3));
}

void eol_waituntil(){
    int32_t res = *--sp;
    if(!res){
        ip=(uint8_t*)(*(sp-3));
        yield((int32_t)vm);
    } else {
        eoltype = *--sp;
        ip = (uint8_t*)(*--sp);
        sp-=1;
        yield((int32_t)vm);
    }
}

void prim_forever(){
    eoltype = (int32_t)prim_forever;
    ip=(uint8_t*)(*(sp-1));
    yield((int32_t)vm);
}

void prim_if(){
    int32_t addr = *--sp;
    if(!*--sp) return;
    *sp++ = eoltype;
    *sp++ = (int32_t)ip;
    eoltype = (int32_t)eol_list;
    ip = (uint8_t*)addr;
}

void prim_ifelse(){
    int32_t addr;
    int32_t faddr = *--sp;
    int32_t taddr = *--sp;
    if(*--sp) addr = taddr;
    else addr = faddr;
    *sp++ = eoltype;
    *sp++ = (int32_t)ip;
    eoltype = (int32_t)eol_list;
    ip = (uint8_t*)addr;
}

void eol_list(){
    ip = (uint8_t*)(*--sp);
    eoltype = *--sp;
}

void prim_add(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1+t0;}
void prim_subtract(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1-t0;}
void prim_multiply(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (int32_t)(((double)t1)*((double)t0)/100);}
void prim_divide(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (int32_t)(((double)t1)/((double)t0)*100);}

void prim_mod(){
    int32_t t0 = (int32_t)(((float)*--sp)/100);
    int32_t t1 = (int32_t)(((float)*--sp)/100);
    int32_t res = t1%t0;
    if(res<0) res+= t0;
    *sp++=res*100;
}

void prim_equal(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (t1==t0)*100;}
void prim_ne(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (t1!=t0)*100;}
void prim_greater(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (t1>t0)*100;}
void prim_less(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (t1<t0)*100;}

void prim_and(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1&t0;}
void prim_or(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1|t0;}
void prim_xor(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1^t0;}
void prim_not(){if(*--sp) *sp++=0; else *sp++=100;}

void prim_setbox(){
    int32_t t0 = *--sp;
    int32_t t1 = *--sp;
    boxes[t1] = t0;
}

void prim_box(){
    int32_t t0 = *--sp;
    *sp++ = boxes[t0];
}

void prim_changebox(){
    int32_t t0 = *--sp;
    int32_t t1 = *--sp;
    boxes[t1] += t0;
}

void prim_random(){
    int32_t max = (int32_t)(((float)*--sp)/100);
    int32_t min = (int32_t)(((float)*--sp)/100);
    if(max>min) *sp++ = lib_random(min,max)*100;
    else *sp++ = lib_random(max,min)*100;
}

void prim_broadcast(){
    int32_t n = (int32_t)(((float)*--sp)/100);
    vm_start(FIRST_FLAG+n);
    rsend(n);
}

void prim_print(){print(*--sp);}
void prim_prs(){prs((uint8_t*)*--sp);}

void prim_prf(){
    int32_t val = *--sp;
    uint8_t *format = (uint8_t*)*--sp;
    prf(format,val);
}

void frameWait(){
    if(framewait<=2) return;
    *sp++ = now()+framewait*10;
    wait_again();
}

void shiftWait(){
    if(framewait<=2) return;
    *sp++ = now()+framewait*2-51;
    wait_again();
}

void prim_wait(){
    if((*(sp-1))>2){
        *(sp-1) *= 10;
        (*(sp-1)) += now();
        wait_again();
    } else sp--;
}

void wait_again(){
    int32_t delta = (*(sp-1))-now();
    if(delta<80) {sp-=1; yield((int32_t)vm);}
    else yield((int32_t)wait_again);
}


void prim_setshape(){setshape((int32_t)(((float)*--sp)/100)); frameWait();}
void prim_shape(){*sp++=thisshape*100;}
void prim_clear(){clear(); frameWait();}
void prim_nextshape(){nextshape(); frameWait();}
void prim_prevshape(){prevshape(); frameWait();}
void prim_resett(){resett();}
void prim_timer(){*sp++=(timer()+5)/10;}
void prim_ticks(){*sp++=get_ticks()*100;}
void prim_setframewait(){framewait = *--sp;}

void prim_brightness(){
    int32_t n = (int32_t)(((float)*--sp)/100);
    if(n<1) n=1;
    if(n>100) n=100;
    setbrightness(n*255/100);
}


void prim_doton(){
    uint8_t y = (uint8_t)(((float)*--sp)/100);
    uint8_t x = (uint8_t)(((float)*--sp)/100);
    doton(x,y);
}

void prim_dotoff(){
    uint8_t y = (uint8_t)(((float)*--sp)/100);
    uint8_t x = (uint8_t)(((float)*--sp)/100);
    dotoff(x,y);
}

void prim_shiftl(){shiftl(); shiftWait();}
void prim_shiftr(){shiftr(); shiftWait();}
void prim_shiftd(){shiftd(); shiftWait();}
void prim_shiftu(){shiftu(); shiftWait();}

void prim_accx(){*sp++=accx()*100;}
void prim_accy(){*sp++=accy()*100;}
void prim_accz(){*sp++=accz()*100;}
void prim_acc(){*sp++=accmag()*100;}
void prim_buttona(){*sp++=get_buttona()*100;}
void prim_buttonb(){*sp++=get_buttonb()*100;}
void prim_rsend(){rsend((uint8_t)(((float)*--sp)/100));}
void prim_rrecc(){*sp++=rrecc()*100;}


void(*prims[])() = {
    eval_done,
    eval_byte, eval_num,
    eval_list, eval_eol,
    eval_lthing, eval_lset, eval_lchange,
    eval_ufun,
    prim_stop, prim_output,
    prim_stopall, prim_stopothers,
    prim_repeat, prim_forever, prim_if, prim_ifelse,
    prim_waituntil, prim_repeatuntil,
    prim_add, prim_subtract, prim_multiply, prim_divide,
    prim_mod,
    prim_equal, prim_ne, prim_greater, prim_less,
    prim_and, prim_or, prim_xor,
    prim_not,
    prim_setbox, prim_box, prim_changebox,
    prim_broadcast,
    prim_random, prim_print, prim_prs, prim_prf,
    prim_wait, prim_resett, prim_timer, prim_ticks,
    prim_setshape, prim_shape, prim_clear,
    prim_nextshape, prim_prevshape,
    prim_doton, prim_dotoff, prim_brightness,
    prim_accx, prim_accy, prim_accz, prim_acc,
    prim_buttona, prim_buttonb,
    prim_rsend, prim_rrecc,
    prim_shiftl, prim_shiftr, prim_shiftd, prim_shiftu,
    prim_setframewait
};
