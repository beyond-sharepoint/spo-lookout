import * as React from 'react';
import { action, toJS } from 'mobx';
import { observer } from 'mobx-react';
import { get, set, upperFirst } from 'lodash';

import { Modal } from 'office-ui-fabric-react/lib/Modal';
import { IconCodes } from '@uifabric/styling';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { ComboBox, IComboBoxOption } from 'office-ui-fabric-react/lib/ComboBox';
import { Pivot, PivotItem } from 'office-ui-fabric-react/lib/Pivot';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { Toggle } from 'office-ui-fabric-react/lib/Toggle';
import { Label } from 'office-ui-fabric-react/lib/Label';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { ISelectableOption, SelectableOptionMenuItemType } from 'office-ui-fabric-react/lib/utilities/selectableOption/SelectableOption.Props';
import { ColorPicker } from 'office-ui-fabric-react/lib/ColorPicker';

import * as FileSaver from 'file-saver';
import { startCase, sortBy, kebabCase } from 'lodash';

import { PagesStore, PageSettings } from '../../models';
import './index.css';

const iconOptions = sortBy(
    Object.keys(IconCodes).map((iconCode) => {
        return {
            key: iconCode,
            iconClass: startCase(iconCode).replace(/\s/g, ''),
            text: startCase(iconCode)
        };
    }),
    ['text']
);

@observer
export class WebPartPageSettingsModal extends React.Component<PageSettingsProps, any> {
    public render() {
        const {
            showPageSettingsModal,
            onDismiss,
            pagesStore,
            currentPage
        } = this.props;

        return (
            <Modal
                isOpen={showPageSettingsModal}
                onDismiss={onDismiss}
                isBlocking={false}
                containerClassName="page-settings-modal-container"
            >
                <div className="page-settings-modal-header">
                    <span>Page Settings</span>
                </div>
                <div className="page-settings-modal-body">
                    <Pivot>
                        <PivotItem linkText="Page Options">
                            <TextField
                                label="Name"
                                value={currentPage.name}
                                onChanged={this.updatePageName}
                            />
                            <ComboBox
                                label="Icon Class Name:"
                                selectedKey={currentPage.iconClassName}
                                ariaLabel="Icon Class Name"
                                allowFreeform={true}
                                autoComplete="on"
                                options={iconOptions}
                                onChanged={this.updateIconClassName}
                                onRenderOption={this.renderIconOption}
                            />
                            <Label>Breakpoints:</Label>
                            <div>
                                {['lg', 'md', 'sm', 'xs', 'xxs'].map((val) => {
                                    return (
                                        <span key={val}>{upperFirst(val)}: <input type="number" style={{ width: '50px', marginRight: '20px' }} value={this.props.currentPage.breakpoints[val]} onChange={(ev) => this.onBreakpointChanged(val, ev)} /></span>
                                    );
                                })}
                            </div>
                            <Label>Columns:</Label>
                            <div>
                                {['lg', 'md', 'sm', 'xs', 'xxs'].map((val) => {
                                    return (
                                        <span key={val}>{upperFirst(val)}: <input type="number" style={{ width: '50px', marginRight: '20px' }} value={this.props.currentPage.columns[val]} onChange={(ev) => this.onColumnChanged(val, ev)} /></span>
                                    );
                                })}
                            </div>
                            <TextField
                                label="Row Height"
                                value={currentPage.rowHeight.toString()}
                                onChanged={this.updateRowHeight}
                            />
                            <Toggle
                                label="Compact Vertical"
                                checked={currentPage.compactVertical}
                                onChanged={this.onCompactVerticalChanged}
                            />
                        </PivotItem>
                        <PivotItem linkText="Appearance">
                            <Label>Background Color:</Label>
                            <ColorPicker color={currentPage.backgroundColor || '#eee'} onColorChanged={this.updateBackgroundColor} />
                            <TextField
                                label="Background Image:"
                                value={currentPage.backgroundImage}
                                onChanged={this.updateBackgroundImage}
                            />
                            <TextField
                                label="Background Size:"
                                value={currentPage.backgroundImageSize}
                                ariaLabel="Background Repeat"
                                onChanged={this.updateBackgroundImageSize}
                            />
                            <ComboBox
                                label="Background Repeat:"
                                selectedKey={currentPage.backgroundImageRepeat}
                                ariaLabel="Background Repeat"
                                allowFreeform={false}
                                autoComplete="on"
                                options={[
                                    { key: 'repeat', text: 'Repeat' },
                                    { key: 'repeat-x', text: 'Repeat X' },
                                    { key: 'repeat-y', text: 'Repeat Y' },
                                    { key: 'no-repeat', text: 'No Repeat' },
                                ]}
                                onChanged={this.updateBackgroundImageRepeat}
                            />
                        </PivotItem>
                    </Pivot>
                </div>
                <div className="page-settings-modal-footer">
                    <DefaultButton text="Export Page" onClick={this.exportPage} />
                    {currentPage.id !== 'dashboard'
                        ? <PrimaryButton text="Delete Page" onClick={this.deletePage} style={{ backgroundColor: '#a80000' }} />
                        : null
                    }
                </div>
            </Modal>
        );
    }

    @action.bound
    private renderIconOption(item: ISelectableOption): JSX.Element {
        return (
            <span><i className={'ms-Icon ms-Icon--' + (item as any).iconClass}>&nbsp;{item.text}</i></span>
        );
    }

    @action.bound
    private updatePageName(newValue: string) {
        this.props.currentPage.name = newValue;
    }

    @action.bound
    private updateIconClassName(newValue: IComboBoxOption) {
        if (!newValue || !newValue.key) {
            return;
        }

        this.props.currentPage.iconClassName = newValue.key.toString() || '';
    }

    @action.bound
    private onBreakpointChanged(id: string, ev: React.ChangeEvent<HTMLInputElement>) {
        this.props.currentPage.breakpoints[id] = ev.target.valueAsNumber;
    }

    @action.bound
    private onColumnChanged(id: string, ev: React.ChangeEvent<HTMLInputElement>) {
        this.props.currentPage.columns[id] = ev.target.valueAsNumber;
    }

    @action.bound
    private updateRowHeight(newValue: string) {
        this.props.currentPage.rowHeight = parseInt(newValue, 10);
    }

    @action.bound
    private onCompactVerticalChanged(newValue: boolean) {
        this.props.currentPage.compactVertical = newValue;
    }

    @action.bound
    private updateBackgroundColor(newColor: string) {
        this.props.currentPage.backgroundColor = newColor;
    }

    @action.bound
    private updateBackgroundImage(newValue: string) {
        this.props.currentPage.backgroundImage = newValue;
    }

    @action.bound
    private updateBackgroundImageSize(newValue: string) {
        this.props.currentPage.backgroundImageSize = newValue;
    }

    @action.bound
    private updateBackgroundImageRepeat(newValue: IComboBoxOption) {
        this.props.currentPage.backgroundImageRepeat = newValue.key as string;
    }

    @action.bound
    private deletePage(ev: any) {
        this.props.onDismiss(ev);
        this.props.onDeletePage(this.props.currentPage);
    }

    @action.bound
    private exportPage(ev: any) {
        const blob = new Blob([JSON.stringify(toJS(this.props.currentPage), null, 4)], { type: 'text/plain;charset=utf-8' });
        FileSaver.saveAs(blob, kebabCase(this.props.currentPage.name) + '.json');
    }
}

export interface PageSettingsProps {
    showPageSettingsModal: boolean;
    onDismiss: (ev?: React.MouseEvent<HTMLButtonElement>) => any;
    onDeletePage: (currentPage: PageSettings) => void;
    pagesStore: PagesStore;
    currentPage: PageSettings;
}