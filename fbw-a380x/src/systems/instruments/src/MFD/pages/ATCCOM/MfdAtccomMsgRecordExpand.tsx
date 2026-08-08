import { DisplayComponent, FSComponent, Subject, VNode } from '@microsoft/msfs-sdk';

import './MfdAtccomMsgRecord.scss';
import { AtccomMfdPageProps } from '../../MFD';
import { AtccomFooter } from './MfdAtccomFooter';

import { ActivePageTitleBar } from '../common/ActivePageTitleBar';
import { Button } from '../../../MsfsAvionicsCommon/UiWidgets/Button';
import {
  AtsuMessageDirection,
  AtsuMessageSerializationFormat,
  CpdlcMessage,
  CpdlcMessagesDownlink,
} from '@datalink/common';

interface MfdAtccomMsgRecordExpandProps extends AtccomMfdPageProps {}

export class MfdAtccomMsgRecordExpand extends DisplayComponent<MfdAtccomMsgRecordExpandProps> {
  private readonly messageIndex = Number(this.props.mfd.uiService.activeUri.get().extra);
  private message = Subject.create<CpdlcMessage>(null);
  private messageTime = this.message.map((msg) => {
    if (!msg) return;
    return msg.Timestamp.mailboxTimestamp();
  });
  private messageStation = this.message.map((msg) => {
    if (!msg) return;
    return (msg.Direction === AtsuMessageDirection.Uplink ? 'FROM ' : 'TO ') + msg.Station;
  });
  private messageStatus = this.message.map((msg) => {
    if (!msg) return;
    const responseId = msg.Response?.Content?.[0]?.TypeId;
    return responseId !== undefined && CpdlcMessagesDownlink[responseId] ? CpdlcMessagesDownlink[responseId][0][0] : '';
  });
  private messageContent = this.message.map((msg) => {
    if (!msg) return;
    return msg.serialize(AtsuMessageSerializationFormat.FmsDisplay);
  });

  onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.message.set(this.props.atcService.atcMessages()[this.messageIndex]);
  }

  render(): VNode {
    return (
      <>
        <ActivePageTitleBar activePage={Subject.create('MSG RECORD/ALL MSG/EXPAND')} offset={Subject.create('')} />
        {/* begin page content */}
        <div class="mfd-page-container">
          <div style="display:flex; flex: 1 1 auto; width:100%">
            <div class="msg-record-msg-element mfd-label green">
              <div>
                <span class="msg-time">{this.messageTime}</span>
                <span class="msg-origin-dest">{this.messageStation}</span>
                <span class="msg-status">{this.messageStatus}</span>
              </div>
              <div class="msg-body-expand">{this.messageContent}</div>
            </div>
            <div style="flex-grow: 1;" />
            {/* fill space vertically */}
          </div>
          <div class="mfd-atccom-msg-record-footer">
            <div>
              <Button
                label="RETURN<br />TO LIST"
                onClick={() => {
                  this.props.mfd.uiService.navigateTo('atccom/msg-record/all-msg');
                }}
                buttonStyle="width: 190px; height:64px;"
              />
            </div>
            <div style="position:absolute; top: 0px; right:0px">
              <Button label="PRINT" onClick={() => {}} buttonStyle="width: 190px; height:64px;" />
            </div>
          </div>
        </div>
        {/*<div
          id="atccom-inop"
          style="
    position: absolute;
    top: 132px;
    width: 768px;
    height: 818px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 35px;
    background-color: rgba(0, 0, 0, 0.7);
    color: #e68000"
        >
          <span>NOT YET IMPLEMENTED</span>
        </div>*/}
        <AtccomFooter bus={this.props.bus} mfd={this.props.mfd} atcService={this.props.atcService} />
      </>
    );
  }
}
