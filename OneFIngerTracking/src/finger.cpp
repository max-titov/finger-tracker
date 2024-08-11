#include "finger.h"
#include <Arduino.h>
#include <ResponsiveAnalogRead.h>

#include <stdlib.h> // for malloc and free
void* operator new(size_t size) { return malloc(size); }
void operator delete(void* ptr) { free(ptr); } 

ResponsiveAnalogRead* joint = NULL;

finger::finger(String _name,int _pin)
{
  name=_name;
  pin=_pin;
  maxMv = 0;
  minMv = 10000;

  joint = new ResponsiveAnalogRead(pin, true);
}

int finger::track(){
  joint->update();
  int rawVal = joint->getRawValue();

  maxMv = max(maxMv, rawVal);
  minMv = min(minMv, rawVal);

  int valueTimes256 = (rawVal-minMv)<<8;
  int rawRange = (maxMv-minMv);
  
  int adjustedRotation = 0;

  if(rawRange>0){
    adjustedRotation = valueTimes256 / rawRange;
  }
  return rawVal;
}