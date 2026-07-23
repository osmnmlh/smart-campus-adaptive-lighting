import { Injectable } from '@nestjs/common';
import { connect, type IClientOptions, type MqttClient } from 'mqtt';

export interface MqttJsClientFactoryPort {
  create(brokerUrl: string, options: IClientOptions): MqttClient;
}

@Injectable()
export class MqttJsClientFactory implements MqttJsClientFactoryPort {
  create(brokerUrl: string, options: IClientOptions): MqttClient {
    return connect(brokerUrl, options);
  }
}
