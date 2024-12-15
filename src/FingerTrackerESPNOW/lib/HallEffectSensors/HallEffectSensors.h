#ifndef HALL_EFFECT_SENSORS_H
#define HALL_EFFECT_SENSORS_H

#include <Arduino.h>
#include <stdint.h>
#include <ResponsiveAnalogRead.h>

//TODO define multiplexer input pins
#define S0 5
#define S1 6
#define S2 7
#define S3 21

#define SENSOR_COUNT 16

extern int32_t rawVals[SENSOR_COUNT];
extern float proto_angles[SENSOR_COUNT];
extern float min_angles[SENSOR_COUNT];
extern float max_angles[SENSOR_COUNT];

/**
 * Initializes the Hall effect sensors.
 */
void hallEffectSensorsSetup();

/**
 * Sends the current angle data to the robotic hand. Calling this function requires an ESPNow
 * connection to have already been established with the hand.
 */
void sendData();

/**
 * Reads the raw angle values, adjusts them, and stores them in the proto_angles array
 */
void measureHallEffectSensors();
void calibrateHallEffectSensors();

float poly(double x, double a,double b,double c);

#endif