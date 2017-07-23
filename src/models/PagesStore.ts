import { autorun, observable, extendObservable, observe, action, computed, runInAction, toJS, IObservableObject } from 'mobx';
import * as localforage from 'localforage';
import { defaultsDeep, find, filter } from 'lodash';
import { PageSettings, defaultPageSettings } from './PageSettings';
const tropicalOutlook = require('./data/tropical-outlook.json');

export const PagesLocalStorageKey = 'sp-lookout-pages';

export class PagesStore {
    private _pages: Array<PageSettings>;

    public constructor(pages?: Array<PageSettings>) {
        if (!pages) {
            this._pages = observable([defaultPageSettings, tropicalOutlook]);
        } else {
            // for (const page of pages) {
            //     defaultsDeep(page, defaultPageSettings);
            // }
            this._pages = observable(pages);
        }
    }

    public get pages(): Array<PageSettings> {
        return this._pages;
    }

    public getPageSettings(pageId: string): PageSettings | undefined {
        return find(this._pages, { id: pageId });
    }

    @action
    public deletePage(pageId: string): boolean {
        const page = find(this._pages, { id: pageId });
        if (!page) {
            return false;
        }

        return (this._pages as any).remove(page);
    }

    static async loadFromLocalStorage(): Promise<PagesStore> {
        const pages = await localforage.getItem(PagesLocalStorageKey) as Array<PageSettings>;
        return new PagesStore(pages);
    }

    @action
    static async saveToLocalStorage(pagesStore: PagesStore): Promise<Array<PageSettings>> {
        return localforage.setItem(PagesLocalStorageKey, toJS(pagesStore._pages));
    }

    @action
    static async removeSettings() {
        return localforage.removeItem(PagesLocalStorageKey);
    }
}