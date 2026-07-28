// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { AtsuMessageComStatus, CpdlcMessage } from '@datalink/common';
import {
  ComponentProps,
  DisplayComponent,
  FSComponent,
  MappedSubject,
  Subscribable,
  Subscription,
  VNode,
} from '@microsoft/msfs-sdk';
import { Button } from '../../MsfsAvionicsCommon/UiWidgets/Button';

export interface ButtonsOutputProps extends ComponentProps {
  message: Subscribable<CpdlcMessage>;
  reachedEndOfMessage: Subscribable<boolean>;
  sendMessage: (uid: number) => void;
  deleteMessage: (uid: number) => void;
  closeMessage: (uid: number) => void;
  visible: Subscribable<boolean>;
}

export class ButtonsOutput extends DisplayComponent<ButtonsOutputProps> {
  private readonly subs = [] as Subscription[];

  private readonly showAnswers = MappedSubject.create(([message]) => {
    if (!message) return false;
    return message.ComStatus === AtsuMessageComStatus.Open || message.ComStatus === AtsuMessageComStatus.Failed;
  }, this.props.message);

  private readonly buttonsBlocked = MappedSubject.create(
    ([message, reachedEnd]) => {
      if (!message) return true;
      return message.ComStatus === AtsuMessageComStatus.Sending || !reachedEnd;
    },
    this.props.message,
    this.props.reachedEndOfMessage,
  );

  private readonly closeButtonVisibility = MappedSubject.create(
    ([showAnswers, isVisible]) => {
      return isVisible && !showAnswers ? '' : 'display: none';
    },
    this.showAnswers,
    this.props.visible,
  );
  private readonly answerButtonsVisibility = MappedSubject.create(
    ([showAnswers, isVisible]) => {
      return isVisible && showAnswers ? '' : 'display: none';
    },
    this.showAnswers,
    this.props.visible,
  );

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.subs.push(this.showAnswers, this.buttonsBlocked, this.closeButtonVisibility, this.answerButtonsVisibility);
  }

  destroy(): void {
    for (const s of this.subs) {
      s.destroy();
    }

    super.destroy();
  }

  render(): VNode {
    return (
      <>
        <Button
          label="SEND"
          onClick={() => this.props.sendMessage(this.props.message.get().UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.answerButtonsVisibility}
          disabled={this.buttonsBlocked}
        ></Button>
        <Button
          label="CANCEL"
          onClick={() => this.props.deleteMessage(this.props.message.get().UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.answerButtonsVisibility}
          disabled={this.buttonsBlocked}
        ></Button>
        <Button
          label="CLOSE"
          onClick={() => this.props.closeMessage(this.props.message.get().UniqueMessageID)}
          buttonStyle="height: 50px; justify-content: flex-end;"
          containerStyle={this.closeButtonVisibility}
          disabled={this.buttonsBlocked}
        ></Button>
      </>
    );
  }
}
