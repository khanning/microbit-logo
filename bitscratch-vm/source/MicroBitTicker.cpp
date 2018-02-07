#include "MicroBitConfig.h"
#include "MicroBitTicker.h"
#include "MicroBitSystemTimer.h"

volatile int32_t ticks = 0;

void dev_poll(void);

MicroBitTicker::MicroBitTicker(){
    system_timer_add_component(this);
}

void MicroBitTicker::systemTick(){
	dev_poll();
	ticks++;
}

MicroBitTicker::~MicroBitTicker(){
    system_timer_remove_component(this);
}
