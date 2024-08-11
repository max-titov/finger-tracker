int maxMv = 0;
int minMv = 3000;

int maxValue = 255;

void setup() {
  // initialize serial communication at 115200 bits per second:
  Serial.begin(115200);
  
  //set the resolution to 12 bits (0-4096)
  analogReadResolution(12);
}

void loop() {
  // read the analog / millivolts value for pin 2:
  int analogValue = analogRead(2);
  int analogVolts = analogReadMilliVolts(2);

  maxMv = max(maxMv, analogVolts);
  minMv = min(minMv, analogVolts);

  int valueTimes256 = (analogVolts-minMv)<<8;
  int rawRange = (maxMv-minMv);
  
  int adjustedRotation = -1;

  if(rawRange>0){
    adjustedRotation = valueTimes256 / rawRange;
  }

  //Serial.printf("%d / %d \n",(analogVolts-minMv)<<8,(maxMv-minMv));
  
  // print out the values you read:
  //Serial.printf("ADC analog value = %d\n",analogValue);
  //Serial.printf("Raw millivolts = %d Adjusted 0-255: %d\n",analogVolts,adjustedRotation);
  Serial.print("Rotation:");
  Serial.print(adjustedRotation);
  Serial.print("Max Value:");
  Serial.println(maxValue);
  
  delay(100);  // delay in between reads for clear read from serial
}
