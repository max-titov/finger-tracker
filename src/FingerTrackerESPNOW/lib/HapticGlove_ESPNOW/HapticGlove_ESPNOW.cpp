#include "HapticGLove_ESPNOW.h"
// Start HapticGlove_ESPNOW.c:

uint8_t peer_mac[6];
position_packet glove_outData;
haptic_packet glove_inData;
int glove_messages_send_attempt = 0;
int glove_messages_send_success = 0;
int glove_messages_rcv = 0;

// Function to handle the result of data send
void GloveOnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  // Serial.print("\r\nLast Packet Send Status:\t");
  // Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
}

// Callback function that will be executed when data is received
void GloveOnDataRecv(const uint8_t *mac_addr, const uint8_t *incomingData, int len) {  // Changed signature to match expected esp_now_recv_cb_t type
  if (len == sizeof(glove_inData)) {
      memcpy(&glove_inData, incomingData, sizeof(glove_inData));
      // Proceed with processing
  } else {
      Serial.println("Received data length does not match expected size.");
  }
  // Serial.print("Bytes received: ");
  // Serial.println(len);
  // Serial.print("Message: ");
  // Serial.println(inData.str);
  // Serial.print("finger_sensor_1: ");
  // Serial.println(inData.finger_sensor_1);
  // Serial.print("finger_sensor_2: ");
  // Serial.println(inData.finger_sensor_2);
  // Serial.print("finger_sensor_3: ");
  // Serial.println(inData.finger_sensor_3);
  // Serial.println();
  // sendData();
  glove_messages_send_success = glove_inData.messages_rec;
  glove_messages_rcv++;
}

void glove_ESPNOWsetup(uint8_t mac_in[], int baud_rate){
  Serial.begin(baud_rate);

  glove_messages_send_attempt = 0;
  glove_messages_send_success = 0;
  glove_messages_rcv = 0;

  for(int i=0; i<6; i++){
    peer_mac[i] = mac_in[i];
  }

  // Set the WiFi to the mode and channel to be used by ESP-NOW
  Serial.println("Setting up WiFi...");
  WiFi.mode(ESPNOW_WIFI_MODE);
  // WiFi.setChannel(ESPNOW_WIFI_CHANNEL, WIFI_SECOND_CHAN_NONE);  // Replaced this line
  esp_wifi_set_channel(ESPNOW_WIFI_CHANNEL, WIFI_SECOND_CHAN_NONE);  // Correct method to set channel on ESP32

  // Wait for the WiFi to start
  while (!WiFi.status() == WL_CONNECTED) {  // Replaced STA check with WiFi.status() for general WiFi check
    delay(100);
  }

  // Print the MAC address of this device
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());

  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }

  // Register the send callback function
  esp_now_register_send_cb(GloveOnDataSent);

  // Register the receive callback function
  esp_now_register_recv_cb(GloveOnDataRecv);

  // Add the peer (receiver) device
  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));  // Clear the peer info
  memcpy(peerInfo.peer_addr, peer_mac, 6); // Set peer MAC address
  peerInfo.channel = ESPNOW_WIFI_CHANNEL;  // Same WiFi channel as sender
  peerInfo.encrypt = false;  // No encryption
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Failed to add peer");
    return;
  }

  // DELAY: enter delay if trying to sync up MAC addresses
  delay(SYNC_DELAY*1000);
}

void glove_ESPNOWsetup(uint8_t mac_in[]){
  glove_messages_send_attempt = 0;
  glove_messages_send_success = 0;
  glove_messages_rcv = 0;

  for(int i=0; i<6; i++){
    peer_mac[i] = mac_in[i];
  }

  // Set the WiFi to the mode and channel to be used by ESP-NOW
  Serial.println("Setting up WiFi...");
  WiFi.mode(ESPNOW_WIFI_MODE);
  // WiFi.setChannel(ESPNOW_WIFI_CHANNEL, WIFI_SECOND_CHAN_NONE);  // Replaced this line
  esp_wifi_set_channel(ESPNOW_WIFI_CHANNEL, WIFI_SECOND_CHAN_NONE);  // Correct method to set channel on ESP32

  // Wait for the WiFi to start
  while (!WiFi.status() == WL_CONNECTED) {  // Replaced STA check with WiFi.status() for general WiFi check
    delay(100);
  }

  // Print the MAC address of this device
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());

  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }

  // Register the send callback function
  esp_now_register_send_cb(GloveOnDataSent);

  // Register the receive callback function
  esp_now_register_recv_cb(GloveOnDataRecv);

  // Add the peer (receiver) device
  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));  // Clear the peer info
  memcpy(peerInfo.peer_addr, peer_mac, 6); // Set peer MAC address
  peerInfo.channel = ESPNOW_WIFI_CHANNEL;  // Same WiFi channel as sender
  peerInfo.encrypt = false;  // No encryption
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Failed to add peer");
    return;
  }

  // DELAY: enter delay if trying to sync up MAC addresses
  delay(SYNC_DELAY*1000);
}

void glove_sendData(uint8_t fpos[], float wpos[], uint8_t apos[]){
  // Set values to send
  for(int j=0; j<16; j++){
    glove_outData.finger_pos[j] = fpos[j];
  }
  for(int j=0; j<3; j++){
    glove_outData.wrist_pos[j] = wpos[j];
    glove_outData.arm_pos[j] = apos[j];
  }
  glove_outData.messages_rec = glove_messages_rcv;

  // Send struct message via ESP-NOW
  esp_err_t result = esp_now_send(peer_mac, (uint8_t *)&glove_outData, sizeof(glove_outData));

  glove_messages_send_attempt += 1;

  if (result == ESP_OK) {
    // Serial.println("Sent with success");
  } else if (0) {
    Serial.println("Error sending the data");
  }
}

void glove_monitorSuccess(){
  Serial.println();
  Serial.print("Messages Sent: ");
  Serial.println(glove_messages_send_attempt);
  Serial.print("Messages Delivered: ");
  Serial.println(glove_messages_send_success);
  Serial.print("Success rate: ");
  Serial.print(glove_messages_send_success*100/glove_messages_send_attempt);
  Serial.println(" %");
  Serial.println();
}

// End HapticGlove_ESPNOW.c