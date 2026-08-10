//  Copyright (c) 2026 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { AtsuMessageSerializationFormat } from '../messages';

export enum AircraftType {
  A320 = 'A320',
  A380 = 'A380',
}

export interface SerializationOptions {
  format: AtsuMessageSerializationFormat;
  aircraftType?: AircraftType;
  customLineLength?: number;
}

export const SerializationLineLengthConfig: Record<AircraftType, { mailbox: number; display: number }> = {
  [AircraftType.A320]: { mailbox: 29, display: 24 },
  [AircraftType.A380]: { mailbox: 24, display: 38 },
};
