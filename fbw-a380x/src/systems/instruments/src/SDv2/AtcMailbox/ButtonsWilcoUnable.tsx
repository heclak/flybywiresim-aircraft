// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { CpdlcMessage, UplinkMonitor } from '@datalink/common';
import {
  ArraySubject,
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
  messages: ArraySubject<CpdlcMessage>;
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

  private readonly buttonsBlocked: Subject<boolean> = Subject.create<boolean>(false);
  private readonly showAnswers: Subject<boolean> = Subject.create<boolean>(false);
  private readonly showStandby: Subject<boolean> = Subject.create<boolean>(false);
  private readonly showSend: Subject<boolean> = Subject.create<boolean>(false);

  private readonly isWilcoVisible: Subject<boolean> = Subject.create<boolean>(false);
  private readonly isStandbyVisible: Subject<boolean> = Subject.create<boolean>(false);
  private readonly isUnableVisible: Subject<boolean> = Subject.create<boolean>(false);
  private readonly isSendVisible: Subject<boolean> = Subject.create<boolean>(false);
  private readonly isCancelVisible: Subject<boolean> = Subject.create<boolean>(false);
  private readonly isCloseVisible: Subject<boolean> = Subject.create<boolean>(false);

  private updateButtonVisibility = (): void => {
    const isVisible = this.props.visible.get();
    const isSelected = this.props.selectedResponse.get() !== -1;

    const messageResponse = this.props.messages.tryGet(0)?.Response;
    const isDm2 = messageResponse?.Content?.[0]?.TypeId === 'DM2';

    // 2. Calculate intermediate visibility states
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

    // Apply intermediate states
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
        isCloseVisible = true;
      } else {
        isCloseVisible = true;
      }
    }

    this.isWilcoVisible.set(isWilcoVisible);
    this.isStandbyVisible.set(isStandbyVisible);
    this.isUnableVisible.set(isUnableVisible);
    this.isSendVisible.set(isSendVisible);
    this.isCancelVisible.set(isCancelVisible);
    this.isCloseVisible.set(isCloseVisible);
  };

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.subscriptions.push(
      this.props.selectedResponse.sub(this.updateButtonVisibility, true),
      this.props.messages.sub(this.updateButtonVisibility, true),
      this.props.visible.sub(this.updateButtonVisibility, true),
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
        {/* Add monitoring to wilco */}
        <Button
          label="WILCO"
          onClick={() => {
            this.props.setMessageStatus(this.props.messages.tryGet(0).UniqueMessageID, 0);
            if (UplinkMonitor.relevantMessage(this.props.messages.tryGet(0))) {
              this.props.monitorMessage(this.props.messages.tryGet(0).UniqueMessageID);
            }
          }}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isWilcoVisible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
        <Button
          label="STANDBY"
          onClick={() => this.props.setMessageStatus(this.props.messages.tryGet(0).UniqueMessageID, 2)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isStandbyVisible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
        <Button
          label="UNABLE"
          onClick={() => this.props.setMessageStatus(this.props.messages.tryGet(0).UniqueMessageID, 1)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isUnableVisible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
        <Button
          label="CANCEL"
          onClick={() => {
            this.props.setMessageStatus(this.props.messages.tryGet(0).UniqueMessageID, -1);
            if (UplinkMonitor.relevantMessage(this.props.messages.tryGet(0))) {
              this.props.cancelMessageMonitoring(this.props.messages.tryGet(0).UniqueMessageID);
            }
          }}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isCancelVisible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
        <Button
          label="SEND"
          onClick={() =>
            this.props.setMessageStatus(
              this.props.messages.tryGet(0).UniqueMessageID,
              this.props.selectedResponse.get(),
            )
          }
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isSendVisible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
        <Button
          label="CLOSE"
          onClick={() => this.props.closeMessage(this.props.messages.tryGet(0).UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.isCloseVisible.map((visible) => (visible ? '' : 'display: none;'))}
        ></Button>
      </>
    );
  }
}
