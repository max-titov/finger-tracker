#include <Arduino.h>
#ifndef FINGER_H
#define FINGER_H

class finger
{
  String name;
  int pin;
  int maxMv;
  int minMv;

public:
  finger(String _name,int _pin);
  int track();

};

#endif