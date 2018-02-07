#include <stdint.h>

#define procs 0x30000
#define code ((uint8_t*)procs)
#define NSTACKS 8
#define STACKLEN 128
int32_t stacks[NSTACKS*STACKLEN];

#define OP_ONSTART 5

extern void(*prims[])();


int bleAvail(void);

void vm(void);
void resume(int32_t*);
void eol_repeat(void);
void eol_list(void);
void eol_waituntil(void);
void wait_again(void);
void eval_ufun(void);
void setup_stack(int32_t*,uint32_t,uint8_t);

int32_t now(void);
int32_t lib_random(int32_t,int32_t);
void print(int32_t);
void prf(uint8_t*,int32_t);
void resett(void);
int32_t timer(void);
int32_t get_ticks(void);
void clear();
void setshape(char);
void nextshape(void);
void doton(uint8_t, uint8_t);
void dotoff(uint8_t, uint8_t);
int32_t accx(void);
int32_t accy(void);
int32_t accz(void);
int32_t accmag(void);
int32_t get_buttona(void);
int32_t get_buttonb(void);

int32_t *stack;
int32_t *sp;
uint8_t *ip;
int32_t *fp;
int32_t eoltype;

bool yieldnow;

int32_t boxes[20];

extern volatile int32_t ticks;

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

void setup_stack(int32_t *stack, uint32_t startaddr, uint8_t type){
    if((*((uint8_t*) startaddr))!=type) return;
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
    *sp++ = *ip++;
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

void prim_repeat(){
    *sp++ = (int32_t)ip;
    *sp++ = eoltype;
    eoltype = (int32_t)eol_repeat;
    eol_repeat();
}

void eol_repeat(){
    if(*(sp-4)==0) {
        eoltype = *--sp;
        ip = (uint8_t*)(*--sp); 
        sp-=2;
        yield((int32_t)vm);
    }
    else {
        (*(sp-4))--; 
        ip=(uint8_t*)(*(sp-3));
        yield((int32_t)vm);
    }
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
void prim_multiply(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1*t0;}
void prim_divide(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1/t0;}

void prim_mod(){
    int32_t t0 = *--sp;
    int32_t res = *--sp%t0;
    if(res<0) res+= t0;
    *sp++=res;
}

void prim_equal(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1==t0;}
void prim_ne(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1!=t0;}
void prim_greater(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1>t0;}
void prim_less(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1<t0;}

void prim_and(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1&t0;}
void prim_or(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1|t0;}
void prim_xor(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1^t0;}
void prim_not(){if(*--sp) *sp++=0; else *sp++=1;}

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

void prim_wait(){
    (*(sp-1)) += now();
    yield((int32_t)wait_again);
}

void wait_again(){
    if(now()>(*(sp-1))) {sp-=1; yield((int32_t)vm);}
    else yield((int32_t)wait_again);
}

void prim_random(){
    int32_t max = *--sp;
    int32_t min = *--sp;
    if(max>min) *sp++ = lib_random(min,max);
    else *sp++ = lib_random(max,min);
}

void prim_print(){print(*--sp);}

void prim_prf(){
    int32_t val = *--sp;
    uint8_t *format = (uint8_t*)*--sp;
    prf(format,val);
}

void prim_shape(){setshape((char)*--sp);}
void prim_clear(){clear();}
void prim_nextshape(){nextshape();}
void prim_resett(){resett();}
void prim_timer(){*sp++=timer();}
void prim_ticks(){*sp++=get_ticks();}

void prim_doton(){
    uint8_t y = (uint8_t)*--sp;
    uint8_t x = (uint8_t)*--sp;
    doton(x,y);
}

void prim_dotoff(){
    uint8_t y = (uint8_t)*--sp;
    uint8_t x = (uint8_t)*--sp;
    dotoff(x,y);
}

void prim_accx(){*sp++=accx();}
void prim_accy(){*sp++=accy();}
void prim_accz(){*sp++=accz();}
void prim_acc(){*sp++=accmag();}
void prim_buttona(){*sp++=get_buttona();}
void prim_buttonb(){*sp++=get_buttonb();}

void(*prims[])() = {
    eval_done,
    eval_byte, eval_num,
    eval_list, eval_eol, 
    eval_lthing, eval_lset, eval_lchange, 
    eval_ufun, 
    prim_stop, prim_output, prim_stopall, 
    prim_repeat, prim_forever, prim_if, prim_ifelse,
    prim_waituntil,
    prim_add, prim_subtract, prim_multiply, prim_divide,
    prim_equal, prim_ne, prim_greater, prim_less,
    prim_and, prim_or, prim_xor,
    prim_not, 
    prim_setbox, prim_box, prim_changebox,
    prim_random, prim_print, prim_prf, prim_wait,
    prim_resett, prim_timer, prim_ticks,
    prim_shape, prim_clear, prim_nextshape,
    prim_doton, prim_dotoff,
    prim_accx, prim_accy, prim_accz, prim_acc,
    prim_buttona, prim_buttonb
};
