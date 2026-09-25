import { DisplayComponent, FSComponent, Subject, VNode } from '@microsoft/msfs-sdk';

import './MfdAtccomMsgRecord.scss';
import { AtccomMfdPageProps } from '../../MFD';
import { AtccomFooter } from './MfdAtccomFooter';
import { AtccomPageHeader } from '../common/AtccomPageHeader';

import { Button } from '../../../MsfsAvionicsCommon/UiWidgets/Button';
import {
  AircraftType,
  AtsuMessageDirection,
  AtsuMessageSerializationFormat,
  CpdlcMessage,
  CpdlcMessagesDownlink,
} from '@datalink/common';

export function formatCell(str) {
  return str
    .replace(/{big}/g, "<span class='b-text'>")
    .replace(/{small}/g, "<span class='s-text'>")
    .replace(/{amber}/g, "<span class='amber'>")
    .replace(/{red}/g, "<span class='red'>")
    .replace(/{green}/g, "<span class='green'>")
    .replace(/{cyan}/g, "<span class='cyan'>")
    .replace(/{white}/g, "<span class='white'>")
    .replace(/{magenta}/g, "<span class='magenta'>")
    .replace(/{yellow}/g, "<span class='yellow'>")
    .replace(/{inop}/g, "<span class='inop'>")
    .replace(/{sp}/g, '&nbsp;')
    .replace(/{end}/g, '</span>');
}

interface MfdAtccomMsgRecordExpandProps extends AtccomMfdPageProps {}

export class MfdAtccomMsgRecordExpand extends DisplayComponent<MfdAtccomMsgRecordExpandProps> {
  private readonly msgBodyRef = FSComponent.createRef<HTMLDivElement>();

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
    return formatCell(
      msg.serialize({ format: AtsuMessageSerializationFormat.FmsDisplay, aircraftType: AircraftType.A380 }),
    );
  });

  onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.messageContent.sub((htmlString) => {
      if (this.msgBodyRef.instance) {
        this.msgBodyRef.instance.innerHTML = htmlString ?? '';
      }
    }, true);

    this.message.set(this.props.atcService.atcMessages()[this.messageIndex]);
  }

  render(): VNode {
    return (
      <>
        <AtccomPageHeader activePage={Subject.create('MSG RECORD/ALL MSG/EXPAND')} />
        {/* begin page content */}
        <div class="mfd-page-container">
          <div style="display:flex; flex: 1 1 auto; width:100%">
            <div class="msg-record-msg-element mfd-label green">
              <div>
                <span class="msg-time">{this.messageTime}</span>
                <span class="msg-origin-dest">{this.messageStation}</span>
                <span class="msg-status">{this.messageStatus}</span>
              </div>
              <div ref={this.msgBodyRef} class="msg-body-expand"></div>
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
        <AtccomFooter bus={this.props.bus} mfd={this.props.mfd} atcService={this.props.atcService} />
      </>
    );
  }
}
