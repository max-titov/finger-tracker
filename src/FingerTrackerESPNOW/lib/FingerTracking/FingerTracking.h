#ifndef FINGER_TRACKING_H
#define FINGER_TRACKING_H

#include <Arduino.h>
#include <stdint.h>
#include <ResponsiveAnalogRead.h>

#define SENSOR_COUNT 16

#define MCP_FLEXION_MIN 0
#define MCP_FLEXION_MAX 240

#define PIP_FLEXION_MIN 0
#define PIP_FLEXION_MAX 255

#define MCP_ABDUCTION_MIN -80
#define MCP_ABDUCTION_MAX 80

#define THUMB_CMC_FLEXION_MIN 0 
#define THUMB_CMC_FLEXION_MAX 255

#define THUMB_CMC_ABDUCTION_MIN -125
#define THUMB_CMC_ABDUCTION_MAX 125

#define THUMB_PIP_FLEXION_MIN 0
#define THUMB_PIP_FLEXION_MAX 255

extern int32_t angles[SENSOR_COUNT];

/**
 * Initializes the Hall effect sensors.
 */
void fingerTrackingSetup();

/**
 * Reads the raw angle values, adjusts them, and stores them in the angles array. Calling this function requires
 * initialize() to have already been called.
 */
void calcFingerAngles();

/**
 * Prints the contents of the angles array over Serial
 */
void printFingerAngles();

void printRawAngles();

void adjustAngles();
int32_t adjustMCPAbductionAngle(int32_t i);
int32_t adjustMCPFlexionAngle(int32_t i);
int32_t adjustPIPFlexionAngle(int32_t i);
int32_t adjustThumbCMCFlexionAngle(int32_t i);
int32_t adjustThumbCMCAbductionAngle(int32_t i);
int32_t adjustThumbPIPFlexionAngle(int32_t i);

#endif