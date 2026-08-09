import { DisplayComponent, FSComponent, Subject, VNode } from '@microsoft/msfs-sdk';

import './MfdAtccomMsgRecord.scss';
import { AtccomMfdPageProps } from '../../MFD';
import { AtccomFooter } from './MfdAtccomFooter';

import { ActivePageTitleBar } from '../common/ActivePageTitleBar';
import { Button } from '../../../MsfsAvionicsCommon/UiWidgets/Button';
import { MessageElement } from './Elements/MessageElement';
import { MessageRecordNav } from './Elements/MessageRecordNav';
import { CpdlcMessage } from '@datalink/common';

interface MfdAtccomMsgRecordAllProps extends AtccomMfdPageProps {}

export class MfdAtccomMsgRecordAll extends DisplayComponent<MfdAtccomMsgRecordAllProps> {
  private messages = Subject.create<CpdlcMessage[]>([]);

  private readonly msgListRef = FSComponent.createRef<HTMLDivElement>();

  private noMsgClass = this.messages.map((messages) => {
    return messages.length > 0 ? 'hidden' : 'msg-record-empty';
  });

  protected onNewData() {}

  private renderMessages(): void {
    const messages = this.messages.get();
    messages.forEach((message, index) => {
      const node: VNode = (
        <MessageElement
          message={message}
          onClick={() => {
            this.props.mfd.uiService.navigateTo('atccom/msg-record/all-msg-expand/' + index);
          }}
        />
      );
      FSComponent.render(node, this.msgListRef.instance);
    });
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    this.messages.set(this.props.atcService.atcMessages());

    console.log(this.messages.get());
    this.renderMessages();

    this.messages.sub(() => this.renderMessages());
  }

  render(): VNode {
    return (
      <>
        <ActivePageTitleBar activePage={Subject.create('MSG RECORD/ALL MSG')} offset={Subject.create('')} />
        {/* begin page content */}
        <div class="mfd-page-container">
          <div style="display:flex; flex: 1 1 auto; width:100%">
            <div ref={this.msgListRef} id="msg-record-list">
              <div class={this.noMsgClass}>NO STORED MSG</div>
            </div>
            <div id="msg-record-scrollbar"></div>
            <MessageRecordNav />
          </div>
          <div class="mfd-atccom-msg-record-footer">
            <div>
              <Button label="ERASE ALL" onClick={() => {}} buttonStyle="width: 190px; height:64px;" />
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
