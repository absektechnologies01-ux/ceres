#include <WiFi.h>
#include <WebSocketsClient.h>

// ── WiFi credentials ────────────────────────────────────────────────────────
// Just needs real internet access now (not local reachability to any other
// device on the same network) — a phone hotspot's cellular uplink works
// fine for this.
const char* WIFI_SSID     = "ceres";
const char* WIFI_PASSWORD = "12345678";

// ── Hosted backend ───────────────────────────────────────────────────────────
// The ESP32 dials out to the backend (rather than hosting a server other
// devices dial into) since it sits behind the hotspot's NAT and can't be
// connected into from the internet.
const char* BACKEND_HOST        = "your-app.onrender.com"; // set after deploying to Render
const uint16_t BACKEND_PORT     = 443;
const char* ESP32_SHARED_SECRET = "change-me-to-a-random-string"; // must match backend's env var

// ── Motor / sensor pins ─────────────────────────────────────────────────────
#define IN1    4
#define IN2    5
#define IR_PIN 15
#define ENA    18

// ── Buzzer pins ─────────────────────────────────────────────────────────────
// Positive leg → pin 25, negative leg → pin 26 (driven LOW as GND reference)
#define BUZZER_PIN     25
#define BUZZER_GND_PIN 26

// ── WebSocket client to the hosted backend ──────────────────────────────────
WebSocketsClient webSocket;

// ── State machine ───────────────────────────────────────────────────────────
enum State {
  SPINNING,
  SCANNING,
  WAITING_FOR_APP,
  WAIT_FOR_GAP,
  WAIT_FOR_NEXT_PAPER,
  ERROR_PAUSED
};

State currentState = SPINNING;
unsigned long scanTimer = 0;
unsigned long gapTimer  = 0;
const unsigned long GAP_CONFIRM  = 200;
const unsigned long MOTOR_SETTLE = 100;

volatile bool appScanComplete = false;
volatile bool appScanFailed   = false;
volatile bool appScanFlagged  = false;

bool backendConnected = false;

// ── Buzzer helper ────────────────────────────────────────────────────────────
void beep(int times, int onMs, int offMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(onMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(offMs);
  }
}

// ── Motor helpers ────────────────────────────────────────────────────────────
void motorForward() {
  analogWrite(ENA, 150);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
}

void motorStop() {
  // L298N short-brake: both inputs HIGH with ENA driven shorts the motor
  // windings, actively killing belt momentum instead of letting the
  // H-bridge coast. Held continuously — not released — until
  // motorForward() runs next, so the belt can't drift while "stopped."
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, HIGH);
  analogWrite(ENA, 255);
}

// ── WebSocket event handler ──────────────────────────────────────────────────
void onWsEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {

    case WStype_CONNECTED:
      backendConnected = true;
      Serial.println("Connected to backend");
      break;

    case WStype_DISCONNECTED:
      Serial.println("Disconnected from backend");
      backendConnected = false;
      if (currentState == WAITING_FOR_APP) {
        appScanFailed = true;
      }
      break;

    case WStype_TEXT: {
      String msg = "";
      for (size_t i = 0; i < length; i++) msg += (char)payload[i];
      msg.trim();
      Serial.printf("Received from backend: %s\n", msg.c_str());

      if (msg == "SCAN_COMPLETE") {
        appScanComplete = true;

      } else if (msg == "SCAN_FLAGGED") {
        appScanFlagged = true;

      } else if (msg == "SCAN_FAILED") {
        appScanFailed = true;

      } else if (msg == "RESUME") {
        if (currentState == ERROR_PAUSED) {
          motorForward();
          currentState = WAIT_FOR_GAP;
          gapTimer = 0;
          Serial.println("Operator resumed. Motor forward. Waiting for gap.");
        }
      }
      break;
    }

    default:
      break;
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(IR_PIN, INPUT);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUZZER_GND_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(BUZZER_GND_PIN, LOW);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi failed. Restarting in 5s...");
    delay(5000);
    ESP.restart();
  }

  Serial.println();
  Serial.print("Connected! ESP32 IP: ");
  Serial.println(WiFi.localIP());

  String path = String("/ws/esp32?token=") + ESP32_SHARED_SECRET;
  webSocket.beginSSL(BACKEND_HOST, BACKEND_PORT, path.c_str());
  webSocket.onEvent(onWsEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("Connecting to backend WebSocket...");

  motorForward();
  Serial.println("Motor running. Ready.");
}

// ── Main loop ────────────────────────────────────────────────────────────────
void loop() {
  webSocket.loop();

  int ir = digitalRead(IR_PIN);

  switch (currentState) {

    case SPINNING:
      if (ir == LOW) {
        motorStop();
        scanTimer = millis();
        currentState = SCANNING;
        Serial.println("Paper detected. Motor stopped.");
      }
      break;

    case SCANNING:
      if (millis() - scanTimer >= MOTOR_SETTLE) {
        if (backendConnected) {
          webSocket.sendTXT("PAPER_DETECTED");
          Serial.println("Sent PAPER_DETECTED. Waiting for app...");
        } else {
          Serial.println("Backend not connected. Resuming motor.");
          motorForward();
          gapTimer = 0;
          currentState = WAIT_FOR_GAP;
          break;
        }
        currentState = WAITING_FOR_APP;
      }
      break;

    case WAITING_FOR_APP:
      if (appScanFlagged) {
        // Sheet flagged — 1 beep, belt keeps running
        appScanFlagged = false;
        beep(1, 300, 0);
        motorForward();
        gapTimer = 0;
        currentState = WAIT_FOR_GAP;
        Serial.println("Sheet flagged. Beeped. Motor forward.");

      } else if (appScanComplete) {
        appScanComplete = false;
        motorForward();
        gapTimer = 0;
        currentState = WAIT_FOR_GAP;
        Serial.println("Scan complete. Motor forward. Waiting for gap.");

      } else if (appScanFailed) {
        // Failed or WiFi dropped — 3 beeps, belt pauses
        appScanFailed = false;
        beep(3, 200, 200);
        currentState = ERROR_PAUSED;
        Serial.println("Scan failed. Motor stopped. Waiting for operator.");
      }
      break;

    case WAIT_FOR_GAP:
      if (ir == HIGH) {
        if (gapTimer == 0) gapTimer = millis();
        if (millis() - gapTimer >= GAP_CONFIRM) {
          currentState = WAIT_FOR_NEXT_PAPER;
          Serial.println("Gap confirmed. Armed for next paper.");
        }
      } else {
        gapTimer = 0;
      }
      break;

    case WAIT_FOR_NEXT_PAPER:
      if (ir == LOW) {
        motorStop();
        scanTimer = millis();
        currentState = SCANNING;
        Serial.println("Next paper detected. Motor stopped.");
      }
      break;

    case ERROR_PAUSED:
      break;
  }
}
