import * as React from 'react';
import * as ReactGridLayout from 'react-grid-layout';
import { action, extendObservable, observable, toJS } from 'mobx';
import { observer } from 'mobx-react';
import { Menu, MainButton, ChildButton } from 'react-mfb';
import { find } from 'lodash';

import { PageSettingsModal } from '../page-settings-modal';
import * as WebParts from '../webpart';

import { PagesStore, PageSettings, WebPartSettings, WebPartType, defaultWebPartSettings, Util } from '../../models';

import './index.css';

const Layout = ReactGridLayout.WidthProvider(ReactGridLayout);

/**
 * Defines the mapping between WebPartType and the WebPart instance.
 * Note that the keys are unable to be enum values until TS 2.5+
 */
const WebPartMapping = {
    'chart': WebParts.ChartWebPart,
    'clock': WebParts.ClockWebPart,
    'note': WebParts.NoteWebPart,
    'text': WebParts.WebPartBase
};

@observer
export default class Page extends React.Component<PageProps, PageState> {
    public constructor(props: PageProps) {
        super(props);

        this.state = {
            showPageSettingsModal: false
        };

    }

    public render() {
        const { currentPage } = this.props;
        const { columns, rowHeight, locked } = currentPage;
        let layout: Array<any> = [];
        for (let webPart of currentPage.webParts) {
            layout.push({
                x: webPart.x,
                y: webPart.y,
                w: webPart.w,
                h: webPart.h,
                i: webPart.id,
                isDraggable: !webPart.locked,
                isResizable: !webPart.locked,
                static: webPart.locked,
                settings: webPart
            });
        }
        return (
            <div style={{flex: 1}}>
                <Layout
                    className="dashboard"
                    layout={layout}
                    cols={columns}
                    rowHeight={rowHeight}
                    verticalCompact={false}
                    onLayoutChange={this.onLayoutChange}
                    isDraggable={!locked}
                    isResizable={!locked}
                    style={{ height: '100%' }}
                    {...this.props}
                >
                    {layout.map((webPart, ix) => {
                        return (
                            <div key={webPart.i}>
                                {this.renderWebPart(webPart.settings)}
                            </div>
                        );
                    })}
                </Layout>
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
                            onClick={this.startAddWebPart}
                            icon="ms-Icon ms-Icon--Checkbox"
                            label="Add WebPart"
                        />
                        <ChildButton
                            onClick={() => { this.setState({ showPageSettingsModal: true}); }}
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
                <PageSettingsModal
                    showPageSettingsModal={this.state.showPageSettingsModal}
                    onDismiss={() => { this.setState({ showPageSettingsModal: false }); PagesStore.saveToLocalStorage(this.props.pagesStore); }}
                    pagesStore={this.props.pagesStore}
                    currentPage={this.props.currentPage}
                />
            </div>
        );
    }

    private renderWebPart(webPartSettings: WebPartSettings) {
        const { currentPage } = this.props;

        const webPartProps = {
            locked: currentPage.locked,
            settings: webPartSettings,
            onWebPartSettingsChanged: () => { this.onWebPartSettingsChanged(webPartSettings); },
            onDeleteWebPart: () => { this.onDeleteWebPart(webPartSettings.id); }
        };

        let WebPart = WebPartMapping[webPartSettings.type];
        if (!WebPart) {
            throw Error(`A WebPart did not correspond to the specified type: ${webPartSettings.type}. Please check the web part mapping.`);
        }

        return (
            <WebPart
                {...webPartProps}
            />
        );
    }

    @action.bound
    private startAddWebPart() {
        const { currentPage } = this.props;
        currentPage.webParts.push(observable({
            ...defaultWebPartSettings,
            id: Util.makeId(8),
            x: 0,
            y: 0,
            w: 2,
            h: 2,
            type: WebPartType.text,
            title: 'New WebPart',
            locked: false,
            props: {}
        }));
    }

    @action.bound
    private onDeleteWebPart(webPartId: string) {
        const { currentPage } = this.props;
        let webPart = find(currentPage.webParts, { id: webPartId });
        if (!webPart) {
            return;
        }

        currentPage.webParts.splice(currentPage.webParts.indexOf(webPart), 1);
        PagesStore.saveToLocalStorage(this.props.pagesStore);
    }

    @action.bound
    private lockPage() {
        this.props.currentPage.locked = true;
        PagesStore.saveToLocalStorage(this.props.pagesStore);
    }

    @action.bound
    private unlockPage() {
        this.props.currentPage.locked = false;
        PagesStore.saveToLocalStorage(this.props.pagesStore);
    }

    @action.bound
    private onLayoutChange(layout: any) {
        for (let position of layout) {
            const webPart = find(this.props.currentPage.webParts, { id: position.i });
            if (!webPart || webPart.locked) {
                continue;
            }

            webPart.x = position.x;
            webPart.y = position.y;
            webPart.h = position.h;
            webPart.w = position.w;
        }
        PagesStore.saveToLocalStorage(this.props.pagesStore);
    }

    @action.bound
    private onWebPartSettingsChanged(settings: WebPartSettings) {
        PagesStore.saveToLocalStorage(this.props.pagesStore);
    }
}

export interface PageState {
    showPageSettingsModal: boolean;
}

export interface PageProps {
    pagesStore: PagesStore;
    currentPage: PageSettings;
}