// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { AtsuMessageComStatus, CpdlcMessage, UplinkMonitor } from '@datalink/common';
import {
  ComponentProps,
  DisplayComponent,
  FSComponent,
  Subject,
  Subscribable,
  Subscription,
  VNode,
} from '@microsoft/msfs-sdk';
import { Button } from '../../MsfsAvionicsCommon/UiWidgets/Button';

export interface ButtonsWilcoUnableProps extends ComponentProps {
  message: Subscribable<CpdlcMessage | undefined>;
  reachedEndOfMessage: Subscribable<boolean>;
  selectedResponse: Subscribable<number>;
  setMessageStatus: (uid: number, response: number) => void;
  sendResponse: (uid: number, responseId: number) => void;
  closeMessage: (uid: number) => void;
  monitorMessage: (uid: number) => void;
  cancelMessageMonitoring: (uid: number) => void;
  visible: Subscribable<boolean>;
}

export class ButtonsWilcoUnable extends DisplayComponent<ButtonsWilcoUnableProps> {
  private readonly subscriptions = [] as Subscription[];

  private readonly buttonsBlocked = Subject.create<boolean>(false);
  private readonly showAnswers = Subject.create<boolean>(false);
  private readonly showStandby = Subject.create<boolean>(false);
  private readonly showSend = Subject.create<boolean>(false);

  private readonly isWilcoVisible = Subject.create<boolean>(false);
  private readonly isStandbyVisible = Subject.create<boolean>(false);
  private readonly isUnableVisible = Subject.create<boolean>(false);
  private readonly isSendVisible = Subject.create<boolean>(false);
  private readonly isCancelVisible = Subject.create<boolean>(false);
  private readonly isCloseVisible = Subject.create<boolean>(false);

  private updateButtonVisibility = (): void => {
    const isVisible = this.props.visible.get();
    const isSelected = this.props.selectedResponse.get() !== -1;

    const message = this.props.message.get();
    const messageResponse = message?.Response;
    const comStatus = message?.ComStatus;
    const isDm2 = messageResponse?.Content?.[0]?.TypeId === 'DM2';

    let showStandby = false;
    let showAnswers = false;
    let showSend = false;

    if (isSelected) {
      showSend = true;
    } else {
      if (!messageResponse) {
        showStandby = true;
        showAnswers = true;
      } else if (isDm2) {
        showAnswers = true;
      }
    }

    this.showStandby.set(showStandby);
    this.showAnswers.set(showAnswers);
    this.showSend.set(showSend);

    let isWilcoVisible = false;
    let isStandbyVisible = false;
    let isUnableVisible = false;
    let isSendVisible = false;
    let isCancelVisible = false;
    let isCloseVisible = false;

    if (isVisible) {
      if (showAnswers) {
        isWilcoVisible = true;
        isUnableVisible = true;
        isStandbyVisible = showStandby;
      } else if (showSend) {
        isSendVisible = true;
        isCancelVisible = true;
      } else if (!showAnswers && !showSend) {
        isCloseVisible = true;
      }
    }

    this.isWilcoVisible.set(isWilcoVisible);
    this.isStandbyVisible.set(isStandbyVisible);
    this.isUnableVisible.set(isUnableVisible);
    this.isSendVisible.set(isSendVisible);
    this.isCancelVisible.set(isCancelVisible);
    this.isCloseVisible.set(isCloseVisible);

    this.buttonsBlocked.set(
      comStatus === AtsuMessageComStatus.Sending || this.props.reachedEndOfMessage.get() === false,
    );
  };

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.subscriptions.push(
      this.props.selectedResponse.sub(this.updateButtonVisibility, true),
      this.props.message.sub(this.updateButtonVisibility, true),
      this.props.visible.sub(this.updateButtonVisibility, true),
      this.props.reachedEndOfMessage.sub(this.updateButtonVisibility, true),
    );
  }

  public destroy(): void {
    for (const sub of this.subscriptions) {
      sub.destroy();
    }
    super.destroy();
  }

  render(): VNode {
    return (
      <>
        <Button
          label="WILCO"
          onClick={() => {
            this.props.setMessageStatus(this.props.message.get().UniqueMessageID, 0);
            if (UplinkMonitor.relevantMessage(this.props.message.get())) {
              this.props.monitorMessage(this.props.message.get().UniqueMessageID);
            }
          }}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isWilcoVisible.map((visible) => (visible ? '' : 'display: none;'))}
          disabled={this.buttonsBlocked}
        ></Button>
        <Button
          label="STANDBY"
          onClick={() => this.props.setMessageStatus(this.props.message.get().UniqueMessageID, 2)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isStandbyVisible.map((visible) => (visible ? '' : 'display: none;'))}
          disabled={this.buttonsBlocked}
        ></Button>
        <Button
          label="UNABLE"
          onClick={() => this.props.setMessageStatus(this.props.message.get().UniqueMessageID, 1)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isUnableVisible.map((visible) => (visible ? '' : 'display: none;'))}
          disabled={this.buttonsBlocked}
        ></Button>
        <Button
          label="SEND"
          onClick={() =>
            this.props.sendResponse(this.props.message.get().UniqueMessageID, this.props.selectedResponse.get())
          }
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isSendVisible.map((visible) => (visible ? '' : 'display: none;'))}
          disabled={this.buttonsBlocked}
        ></Button>
        <Button
          label="CANCEL"
          onClick={() => {
            this.props.setMessageStatus(this.props.message.get().UniqueMessageID, -1);
            if (UplinkMonitor.relevantMessage(this.props.message.get())) {
              this.props.cancelMessageMonitoring(this.props.message.get().UniqueMessageID);
            }
          }}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isCancelVisible.map((visible) => (visible ? '' : 'display: none;'))}
          disabled={this.buttonsBlocked}
        ></Button>
        <Button
          label="CLOSE"
          onClick={() => this.props.closeMessage(this.props.message.get().UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isCloseVisible.map((visible) => (visible ? '' : 'display: none;'))}
          disabled={this.buttonsBlocked}
        ></Button>
      </>
    );
  }
}
