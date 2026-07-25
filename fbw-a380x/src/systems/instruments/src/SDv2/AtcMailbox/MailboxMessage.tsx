// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import {
  AtsuMessageComStatus,
  AtsuMessageDirection,
  AtsuMessageSerializationFormat,
  CpdlcMessage,
} from '@datalink/common';
import { ArraySubject, ComponentProps, DisplayComponent, FSComponent, Subscription, VNode } from '@microsoft/msfs-sdk';

export interface MailboxMessageProps extends ComponentProps {
  messages: ArraySubject<CpdlcMessage>;
}

export class MailboxMessage extends DisplayComponent<MailboxMessageProps> {
  private readonly subs = [] as Subscription[];

  private readonly textRef = FSComponent.createRef<HTMLSpanElement>();

  /*
   * Parses the raw message string, isolating text wrapped in @ symbols,
   * and returns an HTML string with the target text wrapped in a styled span.
   */
  private parseMessageToHtml(text: string): string {
    const parts = text.split(/@([^@]+)@/g);

    return parts
      .map((part, index) => {
        // Odd indices contain the text that was wrapped in @ symbols
        if (index % 2 === 1) {
          return `<span class="message-highlight">${part}</span>`;
        }
        // Even indices are standard unformatted text
        return part;
      })
      .join('');
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.subs.push(
      this.props.messages.sub(() => {
        console.log('redrawing text');
        console.log(this.props.messages);

        if (this.props.messages.length > 0) {
          const message = this.props.messages.tryGet(0);

          const rawText = message.serialize(AtsuMessageSerializationFormat.Mailbox);
          this.textRef.instance.innerHTML = this.parseMessageToHtml(rawText);

          // update background color
          if (message.Direction === AtsuMessageDirection.Downlink) {
            if (message.ComStatus === AtsuMessageComStatus.Sent || message.ComStatus === AtsuMessageComStatus.Sending) {
              this.textRef.instance.style.background = 'rgb(0, 255, 0)';
              this.textRef.instance.style.color = 'rgb(0, 0, 0)';
            } else {
              this.textRef.instance.style.background = 'rgb(0, 255, 255)';
              this.textRef.instance.style.color = 'rgb(0, 0, 0)';
            }
          } else if (message.SemanticResponseRequired) {
            if (
              message.Response?.ComStatus === AtsuMessageComStatus.Sent ||
              message.Response?.ComStatus === AtsuMessageComStatus.Sending
            ) {
              this.textRef.instance.style.background = 'rgb(0, 255, 0)';
              this.textRef.instance.style.color = 'rgb(0, 0, 0)';
            } else {
              this.textRef.instance.style.background = 'rgb(0, 255, 255)';
              this.textRef.instance.style.color = 'rgb(0, 0, 0)';
            }
          }
        } else {
          this.textRef.instance.innerHTML = '';
          this.textRef.instance.style.background = 'rgb(0, 0, 0)';
          this.textRef.instance.style.color = 'rgb(255, 255, 255)';
        }
      }),
    );
  }

  render(): VNode {
    return <div ref={this.textRef} class="atc-mailbox-msg-body atc-mailbox-text"></div>;
  }
}
