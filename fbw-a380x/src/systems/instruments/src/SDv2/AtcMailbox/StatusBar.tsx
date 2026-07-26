// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import {
  AtsuMessageComStatus,
  AtsuMessageDirection,
  CpdlcMessage,
  CpdlcMessageExpectedResponseType,
  CpdlcMessageMonitoringState,
  CpdlcMessagesDownlink,
} from '@datalink/common';
import {
  ArraySubject,
  ComponentProps,
  DisplayComponent,
  FSComponent,
  Subject,
  Subscription,
  VNode,
} from '@microsoft/msfs-sdk';

export interface StatusBarProps extends ComponentProps {
  messages: ArraySubject<CpdlcMessage>;
  selectedResponse: Subject<number>;
}

export class StatusBar extends DisplayComponent<StatusBarProps> {
  private readonly subs = [] as Subscription[];

  private readonly timeAndStation: Subject<string> = Subject.create<string>(null);
  private readonly status: Subject<string> = Subject.create<string>(null);

  private mailboxText = Subject.create<string | null>(null);

  private translateResponseId(response: number, message: CpdlcMessage): string {
    const answerExpected =
      message.Content[0].ExpectedResponse !== CpdlcMessageExpectedResponseType.NotRequired &&
      message.Content[0].ExpectedResponse !== CpdlcMessageExpectedResponseType.No;

    if (response === -1) {
      if (message.Direction === AtsuMessageDirection.Uplink && answerExpected) {
        return 'OPEN';
      }
      if (message.ComStatus === AtsuMessageComStatus.Sent) {
        return 'SENT';
      }
    } else if (`DM${response}` in CpdlcMessagesDownlink) {
      const text = CpdlcMessagesDownlink[`DM${response}`][0][0];
      return text;
    }

    return '';
  }

  private translateResponseMessage(message: CpdlcMessage, response: CpdlcMessage | undefined): string {
    const answerExpected =
      message.Content[0].ExpectedResponse !== CpdlcMessageExpectedResponseType.NotRequired &&
      message.Content[0].ExpectedResponse !== CpdlcMessageExpectedResponseType.No;

    if (!response) {
      if (message.Direction === AtsuMessageDirection.Uplink && answerExpected) {
        return 'OPEN';
      }
      if (message.ComStatus === AtsuMessageComStatus.Sent) {
        return 'SENT';
      }
    } else if (response.Content.length !== 0 && response.Content[0].TypeId in CpdlcMessagesDownlink) {
      if (!message.SemanticResponseRequired) {
        const text = CpdlcMessagesDownlink[response.Content[0].TypeId][0][0];
        return text;
      }
      if (response.ComStatus !== AtsuMessageComStatus.Sent) {
        return 'OPEN';
      }
      return '';
    }

    return '';
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    const updateStatusBar = (): void => {
      console.log('redrawing statusbar');
      if (this.props.messages.length > 0) {
        const message = this.props.messages.tryGet(0);
        if (message) {
          if (message.MessageMonitoring === CpdlcMessageMonitoringState.Finished) {
            if (message.SemanticResponseRequired) {
              this.timeAndStation.set(
                `${message.Response?.Timestamp?.mailboxTimestamp()} TO ${message.Response?.Station}`,
              );
            } else if (message.ReminderTimestamp !== null) {
              this.timeAndStation.set(message.ReminderTimestamp.mailboxTimestamp());
              this.status.set(null);
            } else {
              this.timeAndStation.set('----Z');
            }
          } else {
            this.timeAndStation.set(
              `${message.Timestamp?.mailboxTimestamp()} ${message.Direction === AtsuMessageDirection.Downlink ? 'TO ' : 'FROM '} ${message.Station}`,
            );
          }

          const messageIsReminder =
            !message.SemanticResponseRequired && message.MessageMonitoring === CpdlcMessageMonitoringState.Finished;

          if (message.Direction === AtsuMessageDirection.Uplink && !messageIsReminder) {
            if (this.props.selectedResponse.get() !== -1) {
              this.status.set(this.translateResponseId(this.props.selectedResponse.get(), message));
            } else {
              this.status.set(this.translateResponseMessage(message, message.Response));
            }
          }
        }
      } else {
        // clear status
        this.timeAndStation.set(null);
      }
    };

    this.subs.push(this.props.messages.sub(updateStatusBar), this.props.selectedResponse.sub(updateStatusBar));
  }

  render(): VNode {
    return (
      <div class="atc-mailbox-msg-status atc-mailbox-text">
        <span>{this.timeAndStation}</span>
        <span class="status-msg status-open">{this.status}</span>
      </div>
    );
  }
}
