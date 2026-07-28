// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { CpdlcMessage } from '@datalink/common';
import { ComponentProps, DisplayComponent, FSComponent, Subscribable, VNode } from '@microsoft/msfs-sdk';
import { Button } from '../../MsfsAvionicsCommon/UiWidgets/Button';

export interface ButtonsCloseProps extends ComponentProps {
  message: Subscribable<CpdlcMessage>;
  closeMessage: (uid: number) => void;
  visible: Subscribable<boolean>;
}

export class ButtonsClose extends DisplayComponent<ButtonsCloseProps> {
  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);
  }

  render(): VNode {
    return (
      <>
        <Button
          label="CLOSE"
          onClick={() => this.props.closeMessage(this.props.message.get().UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.props.visible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
      </>
    );
  }
}
