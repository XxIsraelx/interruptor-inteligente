/** Configuração MQTT compartilhada (API, broker embutido e simulador de demonstração). */
export const embeddedBrokerEnabled = () => process.env.MQTT_EMBEDDED_BROKER === 'true';
export const embeddedBrokerPort = () => Number(process.env.MQTT_BROKER_PORT ?? 1883);
export const topicPrefix = () => process.env.MQTT_TOPIC_PREFIX ?? 'interruptor';

/** Com broker embutido e sem MQTT_URL, conecta na própria API. */
export const brokerUrl = () =>
  process.env.MQTT_URL ||
  (embeddedBrokerEnabled() ? `mqtt://127.0.0.1:${embeddedBrokerPort()}` : 'mqtt://localhost:1883');

export const brokerAuth = () => ({
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
});
