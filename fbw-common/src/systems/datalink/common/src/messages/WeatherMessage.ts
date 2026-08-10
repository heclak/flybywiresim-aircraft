// @ts-strict-ignore
//  Copyright (c) 2021 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { AtsuMessageType, AtsuMessageDirection, AtsuMessageSerializationFormat, AtsuMessage } from './AtsuMessage';
import { wordWrap } from '../components/Convert';
import { AircraftType, SerializationLineLengthConfig, SerializationOptions } from '../components/SerializationConfig';

/**
 * Defines the general weather message format
 */
export class WeatherMessage extends AtsuMessage {
  public Reports: { airport: string; report: string }[] = [];

  constructor() {
    super();
    this.Direction = AtsuMessageDirection.Uplink;
  }

  public serialize(options: AtsuMessageSerializationFormat | SerializationOptions) {
    const opts: SerializationOptions = typeof options === 'object' ? options : { format: options };
    const format = opts.format;
    const aircraft = opts.aircraftType ?? AircraftType.A320;
    const config = SerializationLineLengthConfig[aircraft];

    const lineLength =
      opts.customLineLength ?? (format === AtsuMessageSerializationFormat.Mailbox ? config.mailbox : config.display);

    let type = '';
    switch (this.Type) {
      case AtsuMessageType.METAR:
        type = 'METAR';
        break;
      case AtsuMessageType.TAF:
        type = 'TAF';
        break;
      default:
        type = 'ATIS';
        break;
    }

    let message = '';

    if (
      format === AtsuMessageSerializationFormat.FmsDisplay ||
      format === AtsuMessageSerializationFormat.FmsDisplayMonitored
    ) {
      this.Reports.forEach((report) => {
        message += `{cyan}${type} ${report.airport}{end}\n`;

        // eslint-disable-next-line no-loop-func
        wordWrap(report.report, lineLength).forEach((line) => {
          if (line.startsWith('D-ATIS')) {
            message += `{amber}${line}{end}\n`;
          } else if (line === 'NO METAR AVAILABLE' || line === 'NO TAF AVAILABLE') {
            message += `{amber}${line}{end}\n`;
          } else {
            message += `{green}${line}{end}\n`;
          }
        });

        message += '{white}------------------------{end}\n';
      });
    } else {
      this.Reports.forEach((report) => {
        message += `${type} ${report.airport}\n`;

        // eslint-disable-next-line no-loop-func
        message += `${report.report}\n`;

        message += '------------------------\n';
      });
    }

    return message;
  }

  public static deserialize(
    jsonData: Record<string, unknown> | WeatherMessage,
    message: WeatherMessage = null,
  ): WeatherMessage {
    if (message === null) message = new WeatherMessage();

    AtsuMessage.deserialize(jsonData, message);
    (jsonData.Reports as { airport: string; report: string }[]).forEach((report) => {
      message.Reports.push({ airport: report.airport, report: report.report });
    });

    return message;
  }
}
