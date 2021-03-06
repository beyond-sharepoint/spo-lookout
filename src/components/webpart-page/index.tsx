import * as React from 'react';
import * as ReactGridLayout from 'react-grid-layout';
import { action, extendObservable, computed, observable, toJS } from 'mobx';
import { observer } from 'mobx-react';
import { Menu, MainButton, ChildButton } from 'react-mfb';
import { unset, find } from 'lodash';

import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';

import { WebPartPageSettingsModal } from '../webpart-page-settings-modal';
import { BaseWebPartProps, asScriptedWebPart, asAutoRefreshingWebPart, webPartTypeOptions } from '../webpart';

import { PagesStore, PageSettings, ResponsivePageLayouts, WebPartLayout, WebPartSettings, Util } from '../../models';
import Barista from '../../services/barista';

import './index.css';

const ResponsiveLayout = ReactGridLayout.WidthProvider(ReactGridLayout.Responsive);

@observer
export default class WebPartPage extends React.Component<PageProps, PageState> {
    private webPartInstances = {};

    public constructor(props: PageProps) {
        super(props);

        this.state = {
            showPageSettingsModal: false,
            showPageDeleteConfirmDialog: false,
            gridLayout: this.mapWebPartLayoutToGridLayout(props.currentPage)
        };
    }

    public mapWebPartLayoutToGridLayout(currentPage: PageSettings): ReactGridLayout.Layouts {
        let layouts: Partial<ReactGridLayout.Layouts> = {};

        for (const size of Object.keys(currentPage.layouts)) {
            const webPartLayouts: ResponsivePageLayouts = currentPage.layouts[size];
            const layout: Array<ReactGridLayout.Layout> = [];
            for (const id of Object.keys(webPartLayouts)) {
                const webPart: WebPartSettings = currentPage.webParts[id];
                const webPartLayout: WebPartLayout = webPartLayouts[id];
                if (!webPart || !webPartLayout) {
                    continue;
                }

                layout.push({
                    x: webPartLayout.x,
                    y: webPartLayout.y,
                    w: webPartLayout.w,
                    h: webPartLayout.h,
                    i: id,
                    isDraggable: !webPart.locked,
                    isResizable: !webPart.locked,
                    static: webPart.locked
                });
                layouts[size] = layout;
            }
        }

        return layouts as ReactGridLayout.Layouts;
    }

    componentWillReceiveProps(nextProps: PageProps) {
        if (this.props.currentPage !== nextProps.currentPage) {
            this.webPartInstances = [];
            this.setState({
                gridLayout: this.mapWebPartLayoutToGridLayout(nextProps.currentPage)
            });
        }
    }

    public render() {
        const { currentPage, pagesStore } = this.props;
        const { columns, rowHeight, locked } = currentPage;

        const backgroundImageStyle: React.CSSProperties = {
            position: 'fixed',
            width: '100%',
            height: '100%',
            backgroundImage: `url(${currentPage.backgroundImage})`,
            backgroundSize: currentPage.backgroundImageSize,
            backgroundRepeat: currentPage.backgroundImageRepeat,
            overflow: 'hidden',
            userSelect: 'none',
            pointerEvents: 'none'
        };

        const backgroundColorStyle: React.CSSProperties = {
            position: 'fixed',
            width: '100%',
            height: '100%',
            backgroundColor: currentPage.backgroundColor,
            overflow: 'hidden',
            userSelect: 'none',
            pointerEvents: 'none'
        };

        return (
            <div style={{ flex: '1 0 0%', display: 'flex', overflow: 'auto', zIndex: 1 }}>
                <div style={backgroundImageStyle} />
                <div style={backgroundColorStyle} />
                <ResponsiveLayout
                    className="dashboard"
                    layouts={this.state.gridLayout}
                    breakpoints={currentPage.breakpoints}
                    autoSize={false}
                    cols={currentPage.columns}
                    rowHeight={rowHeight}
                    verticalCompact={currentPage.compactVertical}
                    onLayoutChange={this.onLayoutChange}
                    isDraggable={!locked}
                    isResizable={!locked}
                    style={{ flex: '1 0 0%', zIndex: 1 }}
                >
                    {Object.keys(currentPage.webParts).map((webPartId, ix) => {
                        const webPart: WebPartSettings = currentPage.webParts[webPartId];
                        return (
                            <div key={webPartId}>
                                {this.renderWebPart(webPartId, webPart)}
                            </div>
                        );
                    })}
                </ResponsiveLayout>
                {currentPage.locked
                    ?
                    <Menu effect={'zoomin'} method={'hover'} position={'br'}>
                        <MainButton iconResting="ms-Icon ms-Icon--Lock" iconActive="ms-Icon ms-Icon--Cancel" />
                        <ChildButton
                            onClick={this.unlockPage}
                            icon="ms-Icon ms-Icon--Unlock"
                            label="Unlock Page"
                        />
                    </Menu>
                    :
                    <Menu effect={'zoomin'} method={'hover'} position={'br'}>
                        <MainButton iconResting="ms-Icon ms-Icon--Add" iconActive="ms-Icon ms-Icon--Cancel" />
                        <ChildButton
                            onClick={this.addWebPart}
                            icon="ms-Icon ms-Icon--Checkbox"
                            label="Add WebPart"
                        />
                        <ChildButton
                            onClick={() => { this.setState({ showPageSettingsModal: true }); }}
                            icon="ms-Icon ms-Icon--Settings"
                            label="Page Settings"
                        />
                        <ChildButton
                            onClick={this.lockPage}
                            icon="ms-Icon ms-Icon--Lock"
                            label="Lock Page"
                        />
                    </Menu>
                }
                <WebPartPageSettingsModal
                    showPageSettingsModal={this.state.showPageSettingsModal}
                    onDismiss={() => { this.setState({ showPageSettingsModal: false }); PagesStore.saveToLocalStorage(this.props.pagesStore); }}
                    onDeletePage={this.startDeletePage}
                    pagesStore={this.props.pagesStore}
                    currentPage={this.props.currentPage}
                />
                <Dialog
                    hidden={!this.state.showPageDeleteConfirmDialog}
                    onDismiss={() => this.closeDeleteConfirmDialog(false)}
                    dialogContentProps={{
                        type: DialogType.normal,
                        title: 'Confirm Page Deletion',
                        subText: 'Are you sure you wish to delete this page?'
                    }}
                    modalProps={{
                        isBlocking: true,
                        containerClassName: 'ms-dialogMainOverride'
                    }}
                >
                    <DialogFooter>
                        <PrimaryButton onClick={() => this.closeDeleteConfirmDialog(true)} text="Delete" />
                        <DefaultButton onClick={() => this.closeDeleteConfirmDialog(false)} text="Cancel" />
                    </DialogFooter>
                </Dialog>
            </div>
        );
    }

    private renderWebPart(webPartId: string, webPartSettings: WebPartSettings): JSX.Element {
        const { currentPage, barista } = this.props;

        if (this.webPartInstances[webPartId]) {
            return this.webPartInstances[webPartId];
        }

        const webPartProps: BaseWebPartProps = {
            barista: barista,
            locked: currentPage.locked,
            settings: webPartSettings,
            webPartTypeOptions: webPartTypeOptions,
            onWebPartPropertiesChanged: (volatile) => { this.onWebPartPropertiesChanged(webPartId, webPartSettings, volatile); },
            onDuplicateWebPart: () => { this.addWebPart(webPartSettings); },
            onDeleteWebPart: () => { this.onDeleteWebPart(webPartId); }
        };

        const webPartDef = find(webPartTypeOptions, { key: webPartSettings.type });
        if (!webPartDef) {
            throw Error(`A WebPart did not correspond to the specified type: ${webPartSettings.type}. Please check the web part mapping.`);
        }

        let WebPart = webPartDef.data;
        let shouldApplyObserver = false;
        if (webPartSettings.attributes && webPartSettings.attributes.indexOf('useScript') > -1) {
            WebPart = asScriptedWebPart(barista, WebPart);
            shouldApplyObserver = true;
        }

        if (webPartSettings.attributes && webPartSettings.attributes.indexOf('autoRefresh') > -1) {
            WebPart = asAutoRefreshingWebPart(WebPart);
            shouldApplyObserver = true;
        }

        if (shouldApplyObserver) {
            WebPart = observer(WebPart);
        }

        return this.webPartInstances[webPartId] = (
            <WebPart
                {...webPartProps}
            />
        );
    }

    @action.bound
    private addWebPart(webPartSettings?: WebPartSettings) {
        const { currentPage } = this.props;
        const newWebPartId = Util.makeId(8);
        if (!webPartSettings) {
            webPartSettings = new WebPartSettings();
        } else {
            webPartSettings = observable(toJS(webPartSettings));
        }
        extendObservable(currentPage.webParts, {
            [newWebPartId]: webPartSettings
        });

        ['lg', 'md', 'sm', 'xs', 'xxs'].forEach((breakpointName) => {
            extendObservable(currentPage.layouts[breakpointName], {
                [newWebPartId]: new WebPartLayout()
            });
        });

        PagesStore.saveToLocalStorage(this.props.pagesStore);

        this.setState({
            gridLayout: this.mapWebPartLayoutToGridLayout(currentPage)
        });
    }

    @action.bound
    private onDeleteWebPart(webPartId: string) {
        const { currentPage } = this.props;
        let webPart = currentPage.webParts[webPartId];
        if (!webPart) {
            return;
        }

        unset(this.webPartInstances, webPartId);
        unset(currentPage.webParts, webPartId);
        for (const size of Object.keys(currentPage.layouts)) {
            unset(currentPage.layouts[size], webPartId);
        }
        PagesStore.saveToLocalStorage(this.props.pagesStore);
        this.setState({
            gridLayout: this.mapWebPartLayoutToGridLayout(currentPage)
        });
    }

    @action.bound
    private lockPage() {
        this.props.currentPage.locked = true;
        this.webPartInstances = [];
        PagesStore.saveToLocalStorage(this.props.pagesStore);
    }

    @action.bound
    private unlockPage() {
        this.props.currentPage.locked = false;
        this.webPartInstances = [];
        PagesStore.saveToLocalStorage(this.props.pagesStore);
    }

    @action.bound
    private startDeletePage() {
        this.setState({
            showPageDeleteConfirmDialog: true
        });
    }

    private closeDeleteConfirmDialog(shouldDelete: boolean) {
        if (shouldDelete === true) {
            this.props.pagesStore.deletePage(this.props.currentPage.id);
            PagesStore.saveToLocalStorage(this.props.pagesStore);
            this.props.onPageDeleted(this.props.currentPage.id);
        }

        this.setState({
            showPageDeleteConfirmDialog: false
        });
    }

    @action.bound
    private onLayoutChange(currentLayout: ReactGridLayout.Layout, allLayouts: ReactGridLayout.Layouts) {

        //Map of ReactGridLayout back to WebPartLayout 
        for (const breakpointName of Object.keys(allLayouts)) {
            const currentBreakpointLayout = allLayouts[breakpointName];
            let currentWebPartLayouts: { [id: string]: WebPartLayout } = this.props.currentPage.layouts[breakpointName] || {};

            for (let position of currentBreakpointLayout) {
                const webPart = this.props.currentPage.webParts[position.i];
                const currentWebPartLayout = currentWebPartLayouts[position.i];
                if (!webPart || !currentWebPartLayout || webPart.locked) {
                    continue;
                }

                currentWebPartLayout.x = position.x;
                currentWebPartLayout.y = position.y;
                currentWebPartLayout.h = position.h;
                currentWebPartLayout.w = position.w;
            }
        }
        PagesStore.saveToLocalStorage(this.props.pagesStore);
    }

    @action.bound
    private onWebPartPropertiesChanged(webPartId: string, settings: WebPartSettings, volatile?: boolean) {
        if (volatile === true) {
            unset(this.webPartInstances, webPartId);
        }

        PagesStore.saveToLocalStorage(this.props.pagesStore);
        this.setState({
            gridLayout: this.mapWebPartLayoutToGridLayout(this.props.currentPage)
        });
    }
}

export interface PageState {
    showPageSettingsModal: boolean;
    showPageDeleteConfirmDialog: boolean;
    gridLayout: ReactGridLayout.Layouts;
}

export interface PageProps {
    barista: Barista;
    pagesStore: PagesStore;
    currentPage: PageSettings;
    onPageDeleted: (pageId: string) => void;
}