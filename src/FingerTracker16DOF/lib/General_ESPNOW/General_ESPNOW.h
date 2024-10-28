#ifndef GENERAL_ESPNOW_H
#define GENERAL_ESPNOW_H

#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>  // Required for using ESP32-specific WiFi functions
#include <stdint.h>

#define ESPNOW_WIFI_CHANNEL 5            // WiFi channel to be used by ESP-NOW. The available channels will depend on your region.
#define ESPNOW_WIFI_MODE    WIFI_STA     // WiFi mode to be used by ESP-NOW. Any mode can be used.
#define ESPNOW_WIFI_IF      WIFI_IF_STA  // WiFi interface to be used by ESP-NOW. Any interface can be used.
#define DATA_RATE           100          // In Hz
#define SYNC_DELAY          10           // delay (in sec) between setting up ESPNOW and sending packets
#define PEER_MAC_1          {0x3C, 0x84, 0x27, 0x14, 0x7B, 0xB0} // MAC for board 1
#define PEER_MAC_2          {0x3C, 0x84, 0x27, 0xE1, 0xC2, 0x30} // MAC for board 2

// Define the data packets
typedef struct position_packet {
  // remove when not monitoring success rate:
  int messages_rec;
  // end remove
  uint8_t finger_pos[16];
  uint8_t wrist_pos[3];
  uint8_t arm_pos[3];
} position_packet;

typedef struct haptic_packet {
  // remove when not monitoring success rate:
  int messages_rec;
  // end remove
  uint8_t force_index;
  uint8_t force_middle;
  uint8_t force_ring;
  uint8_t force_pinky;
  uint8_t force_thumb;
} haptic_packet;

#endif