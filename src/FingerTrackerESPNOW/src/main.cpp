#include <Arduino.h>

#include <HapticGlove_ESPNOW.h>
#include <FingerTracking.h>
#include <HallEffectSensors.h>

#define PEER_MAC {0x24, 0xEC, 0x4A, 0x45, 0x23, 0x80}
//{0x3C, 0x84, 0x27, 0x14, 0x7B, 0xB0}

void sendData() {
    uint8_t fpos[SENSOR_COUNT];
    float wpos[3];
    uint8_t apos[3];
    for(int i = 0; i < SENSOR_COUNT; i++){
        fpos[i] = (uint8_t)angles[i];
    }
    //send random data for wrist position and arm position
    for(int i = 0; i < 3; i ++){
        wpos[i] = 0;
        apos[i] = random(1, 255);
    }
    //set wrist pitch position to be slightly backwards to stabilize it
    wpos[1] = -20;

    //position_packet.messages_rec = glove_messages_rcv;

    glove_sendData(fpos, wpos, apos);

    //glove_messages_send_attempt += 1;
}

void setup() {
	uint8_t mac[] = PEER_MAC;
	glove_ESPNOWsetup(mac, 115200);
	fingerTrackingSetup();
}

void loop() {
	calcFingerAngles();
	printFingerAngles();

	sendData();

}
