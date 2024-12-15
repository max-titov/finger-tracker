#include "HallEffectSensors.h"

ResponsiveAnalogRead analog(A1, true);

int32_t rawVals[SENSOR_COUNT];
float proto_angles[SENSOR_COUNT];
float min_angles[SENSOR_COUNT];
float max_angles[SENSOR_COUNT];

float polyVals[16][3] = {
    {-0.000050156739812,0.308087774294671,-325.54858934169279}, //pinkie 0
    {-0.000204869267408,1.180238586110067,-1522.071698458919325}, //pinkie 1
    {0.00009027900176,-0.57849114376526,925.953643298021097}, //pinkie 2
    {-0.000053897180763,0.344485903814262,-417.201492537313433}, //ring 3
    {-0.000406773372404,2.026886777162145,-2364.087785492362531}, //ring 4
    {0.000020669692875,-0.186416998438648,403.233727023548938}, //ring 5
    {-0.000041474654378,0.275529953917051,-295.161290322580645}, //middle 6
    {-0.000155663598998,0.846081469596033,-994.321241823930591}, //middle 7
    {0.000170233984067,-1.128460118194487,1768.951835332448657}, //middle 8
    {-0.000005288207298,0.121258593336859,-147.245901639344262}, //pointer 9
    {-0.000135942468348,0.817456387325188,-1033.093236601650843}, //pointer 10
    {0.000101643291297,-0.646716069346575,1031.971761445997989}, //pointer 11
    {-0.000087481431887,0.549306011516565,-709.440158534950912}, //thumb 12
    {0.000043188683603,-0.288631646308703,+518.26001946236131}, //thumb 13
    {0.000081944493116,-0.48715545187493,753.215310445897971}, //thumb 14
    {0.000029299702805,-0.235958663536102,473.892439373476074}  //thumb 15
};

void hallEffectSensorsSetup(){
    analogReadResolution(12);

    //pinMode(D2, OUTPUT);

    pinMode(S0, OUTPUT);
    pinMode(S1, OUTPUT);
    pinMode(S2, OUTPUT);
    pinMode(S3, OUTPUT);

    //digitalWrite(D2, LOW);

    for (uint8_t i = 0; i < SENSOR_COUNT; i++){
        min_angles[i] = 10000;
        max_angles[i] = -10000;
    }
}

float poly(double x, double a,double b,double c){
    return a*pow(x,2)+b*x+c;
}

void calibrateHallEffectSensors(){
    for (uint8_t i = 0; i < SENSOR_COUNT; i++){
        if(proto_angles[i] < min_angles[i]){
            min_angles[i] = proto_angles[i];
        } else if(proto_angles[i] > max_angles[i]){
            max_angles[i] = proto_angles[i];
        }
    }
}

void measureHallEffectSensors()
{
    for (uint8_t i = 0; i < SENSOR_COUNT; i++){
        digitalWrite(S0, i & 0b1);
        digitalWrite(S1, (i>>1) & 0b1);
        digitalWrite(S2, (i>>2) & 0b1);
        digitalWrite(S3, (i>>3) & 0b1);

        delay(5); //not sure if this is necessary


        analog.update();
        int32_t rawVal = analog.getRawValue();
        rawVals[i] = rawVal;
     }

    for (uint8_t i = 0; i < SENSOR_COUNT; i++){
        float angle = poly(rawVals[i],polyVals[i][0],polyVals[i][1],polyVals[i][2]);
        proto_angles[i] = angle;
    }
    //jank solution to having the angles for the thumb backwards
    //TODO remove with glove v2
    // proto_angles[12] = 150-proto_angles[12];
    // proto_angles[13] = 150-proto_angles[12];
    // proto_angles[14] = 150-proto_angles[14];
    // proto_angles[15] = 150-proto_angles[15];
}

