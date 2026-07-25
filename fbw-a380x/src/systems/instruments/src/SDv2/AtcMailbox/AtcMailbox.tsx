//  Copyright (c) 2024, 2026 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import {
  ArraySubject,
  ClockEvents,
  DisplayComponent,
  EventBus,
  FSComponent,
  MapSubject,
  Subject,
  Subscription,
  VNode,
} from '@microsoft/msfs-sdk';
import { Button } from '../../MsfsAvionicsCommon/UiWidgets/Button';
import { IconButton } from '../../MsfsAvionicsCommon/UiWidgets/IconButton';
import { MouseCursor } from '../../MsfsAvionicsCommon/UiWidgets/MouseCursor';
import {
  AtsuMailboxMessages,
  CpdlcMessage,
  Conversion,
  DclMessage,
  MailboxStatusMessage,
  CpdlcMessageMonitoringState,
  AtsuMessageComStatus,
  OclMessage,
  AtsuMessageDirection,
  CpdlcMessageExpectedResponseType,
} from '@datalink/common';

import '../style.scss';
import { MailboxMessage } from './MailboxMessage';
import { StatusBar } from './StatusBar';
import { ButtonsOutput } from './ButtonsOutput';
import { ButtonsWilcoUnable } from './ButtonsWilcoUnable';

export class MailboxMessageBlock {
  public messages: CpdlcMessage[] = [];
  public timestamp: number = 0;
  public response: number = -1;
  public statusMessage: MailboxStatusMessage = MailboxStatusMessage.NoMessage;
  public messageVisible: Subject<boolean> = Subject.create<boolean>(false);
  public automaticCloseTimeout: Subject<number> = Subject.create<number>(-1);
  public semanticResponseIncomplete: boolean = false;
  public reachEndOfMessage: boolean = false;

  constructor() {
    this.timestamp = new Date().getTime();
  }
}

export interface AtcMailboxProps {
  readonly bus: EventBus;
}

export class AtcMailbox extends DisplayComponent<AtcMailboxProps> {
  private readonly subscriptions: Subscription[] = [];

  private readonly topRef = FSComponent.createRef<HTMLDivElement>();

  private readonly mouseCursorRef = FSComponent.createRef<MouseCursor>();

  private onMouseMove(ev: MouseEvent) {
    this.mouseCursorRef.getOrDefault()?.updatePosition(ev.clientX, ev.clientY - 768);
  }

  private onMouseMoveHandler = this.onMouseMove.bind(this);

  private readonly publisher = this.props.bus.getPublisher<AtsuMailboxMessages>();
  private readonly subs = this.props.bus.getSubscriber<AtsuMailboxMessages & ClockEvents>();

  private messages: MapSubject<number, MailboxMessageBlock> = MapSubject.create<number, MailboxMessageBlock>();

  private selectedResponse: Subject<number> = Subject.create<number>(-1);
  private messageIndex: Subject<number> = Subject.create<number>(-1);
  private messageReadComplete: Subject<boolean> = Subject.create(false);
  private visibleMessageSemanticResponseIncomplete: Subject<boolean> = Subject.create<boolean>(false);
  private visibleMessages: ArraySubject<CpdlcMessage> = ArraySubject.create([]);
  private visibleMessageStatus: Subject<MailboxStatusMessage> = Subject.create<MailboxStatusMessage>(
    MailboxStatusMessage.NoMessage,
  );
  private response: Subject<number> = Subject.create<number>(-1);
  private systemStatusMessage: Subject<MailboxStatusMessage> = Subject.create(MailboxStatusMessage.NoMessage);
  private readonly answerRequired: Subject<boolean> = Subject.create<boolean>(false);

  private readonly isOutputButtonsVisible: Subject<boolean> = Subject.create<boolean>(false);
  private readonly isWilcoUnableButtonsVisible: Subject<boolean> = Subject.create<boolean>(false);

  /**
   * Force refresh of visible messages so component subscribers will be notified.
   */
  public refreshVisibleMessage(): void {
    const index = this.messageIndex.get();
    if (index === -1) {
      this.selectedResponse.set(-1);
      return;
    }

    const arrMessages = this.sortedMessageArray(this.messages);
    const currentBlock = arrMessages[index];

    if (currentBlock) {
      this.selectedResponse.set(currentBlock.response);
      this.visibleMessages.set([...currentBlock.messages]);
      this.messageReadComplete.set(currentBlock.reachEndOfMessage);
      this.visibleMessageStatus.set(currentBlock.statusMessage);
      this.visibleMessageSemanticResponseIncomplete.set(currentBlock.semanticResponseIncomplete);
    } else {
      this.selectedResponse.set(-1);
    }
  }

  private updateButtonVisibility(): void {
    if (this.visibleMessages.length === 0) {
      this.isOutputButtonsVisible.set(false);
      this.isWilcoUnableButtonsVisible.set(false);
      return;
    }

    const answerReq = this.answerRequired.get();
    const firstMessage = this.visibleMessages.tryGet(0);

    this.isOutputButtonsVisible.set(
      !answerReq &&
        Boolean(firstMessage) &&
        !firstMessage?.SemanticResponseRequired &&
        firstMessage?.Direction === AtsuMessageDirection.Downlink,
    );

    this.isWilcoUnableButtonsVisible.set(
      answerReq &&
        Boolean(firstMessage) &&
        !firstMessage?.SemanticResponseRequired &&
        firstMessage?.Content[0]?.ExpectedResponse === CpdlcMessageExpectedResponseType.WilcoUnable,
    );
  }

  private handleIncomingMessages(cpdlcMessages: CpdlcMessage[]): void {
    console.log('message received');
    console.log(cpdlcMessages);

    // convert messages to enhanced format
    const enhancedMessages: CpdlcMessage[] = [];
    cpdlcMessages.forEach((message) => {
      enhancedMessages.push(Conversion.messageDataToMessage(message) as CpdlcMessage);
    });

    if (enhancedMessages.length !== 0) {
      // check if incoming message already exist in messages
      const messageBlock = this.messages.getValue(enhancedMessages[0].UniqueMessageID);

      if (messageBlock !== undefined) {
        messageBlock.messages = enhancedMessages;

        // update the communication states and reponses of the existing message
        if (messageBlock.statusMessage === MailboxStatusMessage.NoMessage) {
          if (enhancedMessages[0].MessageMonitoring === CpdlcMessageMonitoringState.Monitoring) {
            messageBlock.statusMessage = MailboxStatusMessage.Monitoring;
          } else if (enhancedMessages[0].MessageMonitoring === CpdlcMessageMonitoringState.Cancelled) {
            messageBlock.statusMessage = MailboxStatusMessage.MonitoringCancelled;
          }
        } else if (messageBlock.statusMessage === MailboxStatusMessage.Monitoring) {
          if (enhancedMessages[0].MessageMonitoring === CpdlcMessageMonitoringState.Cancelled) {
            messageBlock.statusMessage = MailboxStatusMessage.MonitoringCancelled;
          } else if (enhancedMessages[0].MessageMonitoring !== CpdlcMessageMonitoringState.Monitoring) {
            messageBlock.statusMessage = MailboxStatusMessage.NoMessage;
          }
        } else if (enhancedMessages[0].MessageMonitoring === CpdlcMessageMonitoringState.Finished) {
          messageBlock.statusMessage = MailboxStatusMessage.NoMessage;
        }

        if (enhancedMessages[0].Response?.ComStatus === AtsuMessageComStatus.Sent) {
          messageBlock.response = -1;
        }
      } else {
        // store new message in messages
        const message = new MailboxMessageBlock();
        message.messages = enhancedMessages;
        if (enhancedMessages[0].MessageMonitoring === CpdlcMessageMonitoringState.Monitoring) {
          message.statusMessage = MailboxStatusMessage.Monitoring;
        } else if (enhancedMessages[0].MessageMonitoring === CpdlcMessageMonitoringState.Cancelled) {
          message.statusMessage = MailboxStatusMessage.MonitoringCancelled;
        }
        this.messages.setValue(enhancedMessages[0].UniqueMessageID, message);
      }

      // check if we have a semantic response and all data is available
      if (
        enhancedMessages[0].SemanticResponseRequired &&
        enhancedMessages[0].Response &&
        enhancedMessages[0].Response.Content
      ) {
        const messageBlock = this.messages.getValue(enhancedMessages[0].UniqueMessageID);
        if (messageBlock) {
          messageBlock.semanticResponseIncomplete = false;
          if (
            messageBlock.statusMessage === MailboxStatusMessage.NoFmData ||
            messageBlock.statusMessage === MailboxStatusMessage.FmsDisplayForModification
          ) {
            messageBlock.statusMessage = MailboxStatusMessage.NoMessage;
          }

          for (const entry of enhancedMessages[0].Response.Content[0].Content) {
            if (entry.Value === '') {
              messageBlock.semanticResponseIncomplete = true;
              messageBlock.statusMessage = MailboxStatusMessage.NoFmData;
              break;
            }
          }
        }
      }
    }
  }

  private setMessageStatus = (uid: number, response: number): void => {
    const message = this.messages.getValue(uid);
    if (message !== undefined) {
      this.publisher.pub('readMessage', uid, true, false);
      message.response = response;
      this.messages.setValue(uid, message);
      this.refreshVisibleMessage();
    }
  };

  private deleteMessage = (uid: number): void => {
    this.publisher.pub('deleteMessage', uid, true, false);
  };

  private sendMessage = (uid: number): void => {
    this.publisher.pub('downlinkTransmit', uid, true, false);
  };

  private sendResponse = (uid: number, responseId: number): void => {
    this.publisher.pub('uplinkResponse', { uid, responseId }, true, false);
  };

  private closeMessage = (uid: number): void => {
    console.log('closeMessage');
    // find the first visible message
    const arrMessages = this.sortedMessageArray(this.messages);
    const index = arrMessages.findIndex((element) => element.messages[0].UniqueMessageID === uid);

    this.publisher.pub('closeMessage', uid, true, false);

    if (index !== -1) {
      this.systemStatusMessage.set(MailboxStatusMessage.NoMessage);
      // TODO set timer to 0

      if (index > 0) {
        const message = this.messages.getValue(arrMessages[index - 1].messages[0].UniqueMessageID);
        if (message) {
          message.messageVisible.set(true);
          this.messages.setValue(message.messages[0].UniqueMessageID, message);
          this.publisher.pub('visibleMessage', message.messages[0].UniqueMessageID, true, false);
        }
      } else if (index + 1 < arrMessages.length) {
        const message = this.messages.getValue(arrMessages[index + 1].messages[0].UniqueMessageID);
        if (message) {
          message.messageVisible.set(true);
          this.messages.setValue(message.messages[0].UniqueMessageID, message);
          this.publisher.pub('visibleMessage', message.messages[0].UniqueMessageID, true, false);
        }
      }

      this.messages.delete(uid);

      if (this.messages.size === 0) {
        this.publisher.pub('visibleMessage', -1, true, false);
      }
    }
  };

  private monitorMessage = (uid: number) => this.publisher.pub('updateMessageMonitoring', uid, true, false);
  private stopMessageMonitoring = (uid: number) => this.publisher.pub('stopMessageMonitoring', uid, true, false);

  private sortedMessageArray(messages: MapSubject<number, MailboxMessageBlock>) {
    const arrMessages = Array.from(messages.get().values());
    arrMessages.sort((a, b) => a.timestamp - b.timestamp);
    return arrMessages;
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.topRef.instance.addEventListener('mousemove', this.onMouseMoveHandler);

    this.subscriptions.push(
      this.subs.on('cpdlcMessages').handle((messages: CpdlcMessage[]) => this.handleIncomingMessages(messages)),
      this.subs.on('dclMessages').handle((messages: DclMessage[]) => this.handleIncomingMessages(messages)),
      this.subs.on('oclMessages').handle((messages: OclMessage[]) => this.handleIncomingMessages(messages)),
      this.subs.on('deleteMessage').handle((uid: number) => this.closeMessage(uid)),
      this.subs.on('messageStatus').handle((data: { uid: number; status: MailboxStatusMessage }) => {
        const messageBlock = this.messages.getValue(data.uid);
        if (messageBlock !== undefined) {
          messageBlock.statusMessage = data.status;
          if (data.status === MailboxStatusMessage.NoMessage) {
            if (messageBlock.messages[0].MessageMonitoring === CpdlcMessageMonitoringState.Monitoring) {
              messageBlock.statusMessage = MailboxStatusMessage.Monitoring;
            } else if (messageBlock.messages[0].MessageMonitoring === CpdlcMessageMonitoringState.Cancelled) {
              messageBlock.statusMessage = MailboxStatusMessage.MonitoringCancelled;
            }
          }
          this.messages.setValue(data.uid, messageBlock);
          this.refreshVisibleMessage();
        }
      }),
    );

    this.messages.sub((messages) => {
      // TODO needs to check for system power
      console.log('updating view');
      if (messages.size === 0) {
        this.visibleMessages.clear();
        this.messageIndex.set(-1);
        this.selectedResponse.set(-1);
        this.messageReadComplete.set(true);
        this.visibleMessageStatus.set(MailboxStatusMessage.NoMessage);
        this.visibleMessageSemanticResponseIncomplete.set(false);
        return;
      }

      console.log(this.messages.get());

      // find the first visible message
      const arrMessages = this.sortedMessageArray(this.messages);
      let index = arrMessages.findIndex((element) => element.messageVisible.get());

      // make the first message visible if no messages are set to visible but messages are present
      if (index === -1 && this.messages.size > 0) {
        index = 0;
        const firstMessage = arrMessages[0];
        firstMessage.messageVisible.set(true);

        this.publisher.pub('visibleMessage', firstMessage.messages[0].UniqueMessageID, true, false);
      }

      this.messageIndex.set(index);

      // update visible messages
      if (this.messageIndex.get() !== -1) {
        const currentMessage = arrMessages[this.messageIndex.get()];
        this.selectedResponse.set(currentMessage.response);
        this.visibleMessages.set(currentMessage.messages);
        this.messageReadComplete.set(currentMessage.reachEndOfMessage);
        this.visibleMessageStatus.set(currentMessage.statusMessage);
        this.visibleMessageSemanticResponseIncomplete.set(currentMessage.semanticResponseIncomplete);
      } else {
        this.selectedResponse.set(-1);
        this.messageReadComplete.set(true);
        this.visibleMessageStatus.set(MailboxStatusMessage.NoMessage);
        this.visibleMessageSemanticResponseIncomplete.set(false);
      }

      // TODO: check for priority messages

      if (this.visibleMessages.length > 0 && this.visibleMessages.tryGet(0).Direction === AtsuMessageDirection.Uplink) {
        this.answerRequired.set(
          this.visibleMessages.tryGet(0)?.Content[0]?.ExpectedResponse !==
            CpdlcMessageExpectedResponseType.NotRequired &&
            this.visibleMessages.tryGet(0)?.Content[0]?.ExpectedResponse !== CpdlcMessageExpectedResponseType.No,
        );
      } else {
        this.answerRequired.set(false);
      }
    });

    this.subscriptions.push(
      this.subs
        .on('realTime')
        .atFrequency(4)
        .handle((_t) => {
          const currentTime = _t / 1000;
          const sortedArray = this.sortedMessageArray(this.messages);

          sortedArray.forEach((message) => {
            if (message.messages.length === 0) return;

            const cpdlcMessage = message.messages[0];
            const isVisible = message.messageVisible.get();
            const currentTimeout = message.automaticCloseTimeout.get();

            if (cpdlcMessage.CloseAutomatically) {
              if (isVisible && currentTimeout < 0) {
                // start the timeout
                if (
                  (cpdlcMessage.Direction === AtsuMessageDirection.Downlink &&
                    cpdlcMessage.ComStatus === AtsuMessageComStatus.Sent) ||
                  (cpdlcMessage.Direction === AtsuMessageDirection.Uplink &&
                    cpdlcMessage.Response?.Content[0].TypeId !== 'DM2' &&
                    cpdlcMessage.Response?.ComStatus === AtsuMessageComStatus.Sent)
                ) {
                  message.automaticCloseTimeout.set(currentTime);
                }
              } else if (
                currentTimeout > 0 &&
                currentTime - currentTimeout >= 2.0 &&
                cpdlcMessage.MessageMonitoring !== CpdlcMessageMonitoringState.Finished
              ) {
                // check if the timeout is reached
                this.closeMessage(cpdlcMessage.UniqueMessageID);
              } else if (!isVisible && currentTimeout > 0) {
                // reset the timeout of invisible messages
                message.automaticCloseTimeout.set(-1);
              }
            }
          });
        }),

      this.visibleMessages.sub(() => this.updateButtonVisibility(), true),
      this.answerRequired.sub(() => this.updateButtonVisibility(), true),
    );
  }

  destroy(): void {
    this.topRef.getOrDefault()?.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.mouseCursorRef.getOrDefault()?.destroy();

    for (const s of this.subscriptions) {
      s.destroy();
    }

    super.destroy();
  }

  render(): VNode | null {
    return (
      <div ref={this.topRef} class="atc-mailbox-top-layout">
        <div class="atc-mailbox-left-layout">
          <Button label="PRINT" onClick={() => {}} buttonStyle="height: 50px;"></Button>
          <Button label="RECALL" onClick={() => {}} buttonStyle="height: 50px;"></Button>
        </div>
        <div class="atc-mailbox-center-layout">
          <div class="atc-mailbox-center-top">
            <StatusBar messages={this.visibleMessages} selectedResponse={this.selectedResponse} />
            <div class="atc-mailbox-msg-area">
              <MailboxMessage messages={this.visibleMessages} />
              <div class="atc-mailbox-msg-pg-number-indication">
                <IconButton
                  icon="double-up"
                  onClick={() => {}}
                  // disabled={this.isCurrentMsgFirstPage}
                  containerStyle="width: 70px; height: 40px; padding:4px"
                />
                <IconButton
                  icon="double-down"
                  onClick={() => {}}
                  // disabled={this.isCurrentMsgLastPage}
                  containerStyle="width: 70px; height: 40px; padding:4px"
                />
              </div>
            </div>
          </div>
          <div class="atc-mailbox-center-bottom">
            <div class="atc-mailbox-cb-1" />
            <div class="atc-mailbox-cb-2" />
          </div>
        </div>
        <div class="atc-mailbox-right-layout">
          <ButtonsOutput
            messages={this.visibleMessages}
            reachedEndOfMessage={Subject.create<boolean>(true)}
            sendMessage={this.sendMessage}
            deleteMessage={this.deleteMessage}
            closeMessage={this.closeMessage}
            visible={this.isOutputButtonsVisible}
          />
          <ButtonsWilcoUnable
            messages={this.visibleMessages}
            reachedEndOfMessage={Subject.create<boolean>(true)}
            selectedResponse={this.selectedResponse}
            setMessageStatus={this.setMessageStatus}
            sendResponse={this.sendResponse}
            closeMessage={this.closeMessage}
            monitorMessage={this.monitorMessage}
            cancelMessageMonitoring={this.stopMessageMonitoring}
            visible={this.isWilcoUnableButtonsVisible}
          />
          {/* <Button label="UNABLE" onClick={() => {}} buttonStyle="height: 50px; justify-content: flex-end;"></Button>
          <Button label="LOAD SEC3" onClick={() => {}} buttonStyle="height: 50px; justify-content: flex-end;"></Button>
          <Button label="PRINT" onClick={() => {}} buttonStyle="height: 50px; justify-content: flex-end;"></Button> */}
        </div>
        <MouseCursor side={Subject.create('CAPT')} ref={this.mouseCursorRef} />
      </div>
    );
  }
}
