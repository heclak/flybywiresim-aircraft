// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { CpdlcMessage } from '@datalink/common';
import {
  ArraySubject,
  ComponentProps,
  DisplayComponent,
  FSComponent,
  Subscribable,
  Subscription,
  VNode,
} from '@microsoft/msfs-sdk';
import { Button } from '../../MsfsAvionicsCommon/UiWidgets/Button';

export interface ButtonsOutputProps extends ComponentProps {
  messages: ArraySubject<CpdlcMessage>;
  reachedEndOfMessage: Subscribable<boolean>;
  sendMessage: (uid: number) => void;
  deleteMessage: (uid: number) => void;
  closeMessage: (uid: number) => void;
  visible: Subscribable<boolean>;
}

export class ButtonsOutput extends DisplayComponent<ButtonsOutputProps> {
  private readonly subs = [] as Subscription[];

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.subs.push(this.props.messages.sub(() => {}));
  }

  render(): VNode {
    return (
      <>
        <Button
          label="SEND"
          onClick={() => this.props.sendMessage(this.props.messages.get(0).UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.props.visible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
        <Button
          label="CANCEL"
          onClick={() => this.props.deleteMessage(this.props.messages.get(0).UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.props.visible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
      </>
    );
  }
}
