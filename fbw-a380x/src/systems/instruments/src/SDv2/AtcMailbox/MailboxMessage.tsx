// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import {
  AtsuMessageComStatus,
  AtsuMessageDirection,
  AtsuMessageSerializationFormat,
  CpdlcMessage,
} from '@datalink/common';
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

export interface FormattedToken {
  text: string;
  isHighlighted: boolean;
}

export type FormattedLine = FormattedToken[];

export interface PageData {
  pageIndex: number;
  pageCount: number;
  lines: FormattedLine[];
  html: string;
}

interface RawToken {
  text: string;
  isHighlighted: boolean;
  hasLeadingSpace: boolean;
  isNewline?: boolean;
}

export interface MailboxMessageProps extends ComponentProps {
  messages: ArraySubject<CpdlcMessage>;
  pageIndex: Subscribable<number>;
  pageCount: Subject<number>;
}

export class MailboxMessage extends DisplayComponent<MailboxMessageProps> {
  private readonly subs = [] as Subscription[];

  private readonly textRef = FSComponent.createRef<HTMLSpanElement>();

  private tokenizeRawMessage(rawText: string): RawToken[] {
    const tokens: RawToken[] = [];
    let isHighlighted = false;
    let currentWord = '';
    let pendingLeadingSpace = false;

    for (let i = 0; i < rawText.length; i++) {
      const char = rawText[i];

      if (char === '@') {
        if (currentWord.length > 0) {
          tokens.push({ text: currentWord, isHighlighted, hasLeadingSpace: pendingLeadingSpace });
          currentWord = '';
          pendingLeadingSpace = false;
        }
        isHighlighted = !isHighlighted;
      } else if (char === '\n') {
        if (currentWord.length > 0) {
          tokens.push({ text: currentWord, isHighlighted, hasLeadingSpace: pendingLeadingSpace });
          currentWord = '';
          pendingLeadingSpace = false;
        }
        tokens.push({ text: '\n', isHighlighted: false, hasLeadingSpace: false, isNewline: true });
      } else if (char === ' ') {
        if (currentWord.length > 0) {
          tokens.push({ text: currentWord, isHighlighted, hasLeadingSpace: pendingLeadingSpace });
          currentWord = '';
          pendingLeadingSpace = false;
        }
        pendingLeadingSpace = true;
      } else {
        currentWord += char;
      }
    }

    if (currentWord.length > 0) {
      tokens.push({ text: currentWord, isHighlighted, hasLeadingSpace: pendingLeadingSpace });
    }

    return tokens;
  }

  private addTokenToLine(line: FormattedLine, text: string, isHighlighted: boolean): void {
    if (text.length === 0) {
      return;
    }
    if (line.length > 0 && line[line.length - 1].isHighlighted === isHighlighted) {
      line[line.length - 1].text += text;
    } else {
      line.push({ text, isHighlighted });
    }
  }

  private parseAndWrapMessage(rawText: string, maxCharsPerLine = 24): FormattedLine[] {
    if (!rawText) {
      return [];
    }

    const rawTokens = this.tokenizeRawMessage(rawText);
    const lines: FormattedLine[] = [];
    let currentLine: FormattedLine = [];
    let currentLineLength = 0;

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];

      if (token.isNewline) {
        lines.push(currentLine);
        currentLine = [];
        currentLineLength = 0;
        continue;
      }

      let remainingWord = token.text;

      while (remainingWord.length > 0) {
        const spaceNeeded = currentLineLength > 0 && token.hasLeadingSpace && remainingWord === token.text ? 1 : 0;
        const available = maxCharsPerLine - currentLineLength - spaceNeeded;

        if (available >= remainingWord.length) {
          if (spaceNeeded > 0) {
            this.addTokenToLine(currentLine, ' ', false);
            currentLineLength += 1;
          }
          this.addTokenToLine(currentLine, remainingWord, token.isHighlighted);
          currentLineLength += remainingWord.length;
          remainingWord = '';
        } else if (currentLineLength > 0) {
          lines.push(currentLine);
          currentLine = [];
          currentLineLength = 0;
        } else {
          const slice = remainingWord.slice(0, maxCharsPerLine);
          this.addTokenToLine(currentLine, slice, token.isHighlighted);
          currentLineLength += slice.length;
          remainingWord = remainingWord.slice(maxCharsPerLine);
          lines.push(currentLine);
          currentLine = [];
          currentLineLength = 0;
        }
      }
    }

    lines.push(currentLine);
    return lines;
  }

  private formatLineToHtml(line: FormattedLine): string {
    return line
      .map((token) => (token.isHighlighted ? `<span class="message-highlight">${token.text}</span>` : token.text))
      .join('');
  }

  private getPageData(lines: FormattedLine[], pageIndex: number, linesPerPage = 5): PageData {
    if (lines.length === 0) {
      return {
        pageIndex: 0,
        pageCount: 1,
        lines: [],
        html: '',
      };
    }

    const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
    const clampedPageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));
    const pageLines = lines.slice(clampedPageIndex * linesPerPage, (clampedPageIndex + 1) * linesPerPage);
    const html = pageLines.map((line) => this.formatLineToHtml(line)).join('\n');

    return {
      pageIndex: clampedPageIndex,
      pageCount,
      lines: pageLines,
      html,
    };
  }

  private updateMessage(): void {
    if (!this.textRef.instance) {
      return;
    }

    if (this.props.messages.length > 0) {
      const message = this.props.messages.tryGet(0);

      if (message) {
        const rawText = message.serialize(AtsuMessageSerializationFormat.Mailbox);
        const pageIndex = Math.max(0, this.props.pageIndex.get());

        const lines = this.parseAndWrapMessage(rawText, 24);
        const pageData = this.getPageData(lines, pageIndex, 5);

        this.props.pageCount.set(pageData.pageCount);

        this.textRef.instance.innerHTML = pageData.html;

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
        } else {
          this.textRef.instance.style.background = 'transparent';
          this.textRef.instance.style.color = 'rgb(255, 255, 255)';
        }
        return;
      }
    }

    this.props.pageCount.set(1);
    this.textRef.instance.innerHTML = '';
    this.textRef.instance.style.background = 'rgb(0, 0, 0)';
    this.textRef.instance.style.color = 'rgb(255, 255, 255)';
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.subs.push(
      this.props.messages.sub(() => {
        console.log('redrawing text');
        console.log(this.props.messages);
        this.updateMessage();
      }),
      this.props.pageIndex.sub(() => {
        this.updateMessage();
      }),
    );

    this.updateMessage();
  }

  public destroy(): void {
    for (const sub of this.subs) {
      sub.destroy();
    }
    super.destroy();
  }

  render(): VNode {
    return <div ref={this.textRef} class="atc-mailbox-msg-body atc-mailbox-text"></div>;
  }
}
