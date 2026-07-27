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

export interface ButtonsCloseProps extends ComponentProps {
  messages: ArraySubject<CpdlcMessage>;
  closeMessage: (uid: number) => void;
  visible: Subscribable<boolean>;
}

export class ButtonsClose extends DisplayComponent<ButtonsCloseProps> {
  private readonly subs = [] as Subscription[];

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.subs.push(this.props.messages.sub(() => {}));
  }

  render(): VNode {
    return (
      <>
        <Button
          label="CLOSE"
          onClick={() => this.props.closeMessage(this.props.messages.get(0).UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.props.visible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
      </>
    );
  }
}
