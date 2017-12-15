#include "MicroBitConfig.h"
#include "MicroBitTicker.h"
#include "MicroBitSystemTimer.h"
#include "MicroBitRadio.h"

volatile uint32_t ticks = 0;

extern MicroBitRadio radio;

MicroBitTicker::MicroBitTicker(){
    system_timer_add_component(this);
}

void MicroBitTicker::systemTick(){
  radio.idleTick();
	ticks++;
}

MicroBitTicker::~MicroBitTicker(){
    system_timer_remove_component(this);
}
