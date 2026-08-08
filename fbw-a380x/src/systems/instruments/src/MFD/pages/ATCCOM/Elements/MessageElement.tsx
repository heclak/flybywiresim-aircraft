import {
  AtsuMessageDirection,
  AtsuMessageSerializationFormat,
  CpdlcMessage,
  CpdlcMessagesDownlink,
  DclMessage,
} from '@datalink/common';
import { ComponentProps, DisplayComponent, FSComponent, Subject, VNode } from '@microsoft/msfs-sdk';

interface MessageElementProps extends ComponentProps {
  message: CpdlcMessage | DclMessage;
  onClick?: () => void;
}

export class MessageElement extends DisplayComponent<MessageElementProps> {
  private divRef = FSComponent.createRef<HTMLDivElement>();

  private line1 = Subject.create<string>(null);
  private line2 = Subject.create<string>(null);
  private isTruncated = Subject.create<boolean>(null);

  private msgTime = this.props.message.Timestamp.mailboxTimestamp();
  private msgOriginDest =
    (this.props.message.Direction === AtsuMessageDirection.Uplink ? 'FROM ' : 'TO ') + this.props.message.Station;

  private responseId = this.props.message.Response?.Content?.[0]?.TypeId;
  private msgStatus =
    this.responseId !== undefined && CpdlcMessagesDownlink[this.responseId]
      ? CpdlcMessagesDownlink[this.responseId][0][0]
      : '';

  private onClick() {
    if (this.props.onClick !== undefined) {
      this.props.onClick();
    }
  }

  private onClickHandler = this.onClick.bind(this);

  /**
   * Formats message for the Message Record Element
   * Follows the two line format and truncates the second line to 23 characters
   *
   * @param message - The raw message string.
   * @returns void
   */
  private formatMessageRecord(message: string): void {
    const line1Limit = 24;
    if (!message) return;

    const lines = message.split('\n');

    let line1 = lines[0];
    let line2 = lines[1] || '';

    let isTruncated = lines.length > 2;

    // Check if Line 1 needs to wrap into Line 2
    if (line1.length > line1Limit) {
      let splitIndex = line1.lastIndexOf(' ', line1Limit);

      if (splitIndex <= 0) {
        // Hard wrap: No space found within the limit
        splitIndex = line1Limit;
        const excess = line1.substring(splitIndex);
        line1 = line1.substring(0, splitIndex);
        // Join excess to existing line2 (if any) with a space
        line2 = excess + (line2 ? ' ' + line2 : '');
      } else {
        // Soft wrap: Break at the space (dropping the space itself)
        const excess = line1.substring(splitIndex + 1);
        line1 = line1.substring(0, splitIndex);
        // Join excess to existing line2 (if any) with a space
        line2 = excess + (line2 ? ' ' + line2 : '');
      }
    }

    // truncate line 2 if necessary
    if (line2.length > 23) {
      line2 = line2.substring(0, 23);
      isTruncated = true;
    }
    this.isTruncated.set(isTruncated);
    this.line1.set(line1);
    this.line2.set(line2);
  }

  onAfterRender(node: VNode): void {
    super.onAfterRender(node);
    this.divRef.instance.addEventListener('click', this.onClickHandler);
    this.formatMessageRecord(this.props.message.serialize(AtsuMessageSerializationFormat.FmsDisplay));
  }

  render(): VNode {
    return (
      <div ref={this.divRef} class="msg-record-msg-element mfd-label green">
        <div>
          <span class="msg-time">{this.msgTime}</span>
          <span class="msg-origin-dest">{this.msgOriginDest}</span>
          <span class="msg-status">{this.msgStatus}</span>
        </div>
        <div class="msg-body line1">{this.line1}</div>
        <div class="msg-body line2">{this.line2}</div>
        <div>
          <span class="msg-expand-button">...... &gt;&gt;&gt;</span>
        </div>
      </div>
    );
  }
}
