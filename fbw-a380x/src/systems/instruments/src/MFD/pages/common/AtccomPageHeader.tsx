import { ComponentProps, DisplayComponent, FSComponent, Subscribable, VNode } from '@microsoft/msfs-sdk';
import './style.scss';

interface AtccomPageHeaderProps extends ComponentProps {
  activePage: Subscribable<string>;
}

/*
 * Displays the title bar, with optional markers for lateral offsets, engine out and temporary flight plan
 */
export class AtccomPageHeader extends DisplayComponent<AtccomPageHeaderProps> {
  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);
  }

  public destroy(): void {
    super.destroy();
  }

  render(): VNode {
    return (
      <div class="mfd-title-bar-container">
        <div class="mfd-title-bar-title fr space-between">
          <span class="mfd-label mfd-title-bar-text">{this.props.activePage}</span>
        </div>
      </div>
    );
  }
}
