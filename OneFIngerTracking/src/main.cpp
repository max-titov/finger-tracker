#include <Arduino.h>
#include "finger.h"

#include <ResponsiveAnalogRead.h>

int maxMv = 0;
int minMv = 3000;

int maxValue = 255;
int minValue = 0;

finger pointer("pointer", A1);
finger pointer2("pointer2", A2);

ResponsiveAnalogRead analog(A1, true);

void setup() {

  

  // initialize serial communication at 115200 bits per second:
  Serial.begin(115200);
  


  //set the resolution to 12 bits (0-4096)
  analogReadResolution(12);
}

void loop() {

  int joint1 = pointer.track();
  int joint2 = pointer2.track();

  analog.update();
  //joint1 = analog.getRawValue();



  //Serial.printf("%d / %d \n",(analogVolts-minMv)<<8,(maxMv-minMv));
  
  // print out the values you read:
  //Serial.printf("ADC analog value = %d\n",analogValue);
  //Serial.printf("Raw millivolts = %d Adjusted 0-255: %d\n",analogVolts,adjustedRotation);
  Serial.print(">Joint_1:");
  Serial.println(joint1);
  Serial.print(">Joint_2:");
  Serial.println(joint2);
  Serial.print(">Max_Value:");
  Serial.println(maxValue);
  Serial.print(">Min_Value:");
  Serial.println(minValue);
  
  
  delay(100);  // delay in between reads for clear read from serial
}