#ifndef HAPTIC_GLOVE_ESPNOW_H
#define HAPTIC_GLOVE_ESPNOW_H

#include "General_ESPNOW.h"
// Start HapticGlove_ESPNOW.h: 

// Create an instance of the struct to be sent/received
// Create it in public space so general glove code can access values
extern position_packet glove_outData;
extern haptic_packet glove_inData;

// remove when not monitoring success rate:
extern int glove_messages_send_attempt;
extern int glove_messages_send_success;
extern int glove_messages_rcv;

// general glove code needs to initialize ESPNOW
void glove_ESPNOWsetup(uint8_t mac_in[], int baud_rate); // Starts UART0
void glove_ESPNOWsetup(uint8_t mac_in[]); // UART0 already started

// general glove code has access to sendData function
void glove_sendData(uint8_t fpos[], float wpos[], uint8_t apos[]);

// receive data function will call general arm code

void glove_monitorSuccess();

// End HapticGlove_ESPNOW.h
#endif