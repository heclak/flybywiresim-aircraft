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
import { ComponentProps, DisplayComponent, FSComponent, Subject, Subscription, VNode } from '@microsoft/msfs-sdk';

export interface StatusBarProps extends ComponentProps {
  message: Subject<CpdlcMessage>;
  selectedResponse: Subject<number>;
}

export class StatusBar extends DisplayComponent<StatusBarProps> {
  private readonly subs = [] as Subscription[];

  private readonly timeAndStation = Subject.create<string>(null);
  private readonly status = Subject.create<string>(null);
  private readonly statusBackgroundColor = Subject.create<string>('rgba(0,0,0,0)');

  private readonly isStatusOpen = Subject.create<boolean>(false);
  private readonly isStatusOther = Subject.create<boolean>(false);
  private readonly isStatusBgGreen = Subject.create<boolean>(false);
  private readonly isStatusBgCyan = Subject.create<boolean>(false);

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

  public destroy(): void {
    this.subs.forEach((sub) => sub.destroy());
    super.destroy();
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    const updateStatusBar = (): void => {
      console.log('redrawing statusbar');
      if (this.props.message.get()) {
        const message = this.props.message.get();
        if (message) {
          this.status.set(null);

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

          if (message.Direction === AtsuMessageDirection.Uplink) {
            if (!message.SemanticResponseRequired) {
              if (message.Response || this.props.selectedResponse.get() !== -1) {
                this.isStatusOther.set(true);
                this.isStatusOpen.set(false);
              } else {
                this.isStatusOpen.set(true);
                this.isStatusOther.set(false);
              }
            } else if (message.Response?.ComStatus === AtsuMessageComStatus.Open) {
              this.isStatusOpen.set(true);
              this.isStatusOther.set(false);
            } else {
              this.isStatusOther.set(true);
              this.isStatusOpen.set(false);
            }
          } else if (message.ComStatus === AtsuMessageComStatus.Sent) {
            this.isStatusOther.set(true);
            this.isStatusOpen.set(false);
          } else {
            this.isStatusOpen.set(true);
            this.isStatusOther.set(false);
          }
        }

        // Calculate reactive CSS class states
        const statusText = this.status.get();
        const selectedResponse = this.props.selectedResponse.get();
        const backgroundRequired = !!statusText && statusText !== 'OPEN' && statusText !== 'SENT';

        let isGreen = false;
        let isCyan = false;

        if (backgroundRequired && message.Direction === AtsuMessageDirection.Uplink) {
          const responseTypeId = message.Response?.Content?.[0]?.TypeId;
          if (selectedResponse === -1 || responseTypeId === `DM${selectedResponse}`) {
            isGreen = true;
          } else {
            isCyan = true;
          }
        }

        this.isStatusBgGreen.set(isGreen);
        this.isStatusBgCyan.set(isCyan);
      } else {
        this.timeAndStation.set(null);
        this.status.set(null);
        this.isStatusBgGreen.set(false);
        this.isStatusBgCyan.set(false);
      }
    };

    this.subs.push(this.props.message.sub(updateStatusBar), this.props.selectedResponse.sub(updateStatusBar));
  }

  render(): VNode {
    return (
      <div class="atc-mailbox-msg-status atc-mailbox-text">
        <span>{this.timeAndStation}</span>
        <span
          class={{
            'status-msg': true,
            'status-open': this.isStatusOpen,
            'status-other': this.isStatusOther,
            'status-bg-green': this.isStatusBgGreen,
            'status-bg-cyan': this.isStatusBgCyan,
          }}
        >
          {this.status}
        </span>
      </div>
    );
  }
}
