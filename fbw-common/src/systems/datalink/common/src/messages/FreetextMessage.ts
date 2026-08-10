//  Copyright (c) 2021 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { AtsuMessageType, AtsuMessageDirection, AtsuMessageSerializationFormat, AtsuMessage } from './AtsuMessage';
import { wordWrap } from '../components/Convert';
import { AircraftType, SerializationLineLengthConfig, SerializationOptions } from '../components/SerializationConfig';

/**
 * Defines the general freetext message format
 */
export class FreetextMessage extends AtsuMessage {
  constructor() {
    super();
    this.Type = AtsuMessageType.Freetext;
    this.Direction = AtsuMessageDirection.Downlink;
  }

  public serialize(options: AtsuMessageSerializationFormat | SerializationOptions) {
    const opts: SerializationOptions = typeof options === 'object' ? options : { format: options };

    const format = opts.format;
    const aircraft = opts.aircraftType ?? AircraftType.A320;
    const config = SerializationLineLengthConfig[aircraft];

    const lineLength =
      opts.customLineLength ?? (format === AtsuMessageSerializationFormat.Mailbox ? config.mailbox : config.display);

    const separator = '-'.repeat(lineLength);

    let message = '';

    if (
      format === AtsuMessageSerializationFormat.FmsDisplay ||
      format === AtsuMessageSerializationFormat.FmsDisplayMonitored
    ) {
      wordWrap(this.Message, lineLength).forEach((line) => {
        message += `{green}${line}{end}\n`;
      });
      message += `{white}${separator}{end}\n`;
    } else {
      message = this.Message;
    }

    return message;
  }

  public static deserialize(jsonData: Record<string, unknown> | FreetextMessage): FreetextMessage {
    const retval = new FreetextMessage();
    AtsuMessage.deserialize(jsonData, retval);
    return retval;
  }
}
